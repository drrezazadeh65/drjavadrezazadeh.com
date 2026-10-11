#!/usr/bin/env python3
"""Contract/stability tests for the offline canonical registry proposal."""
import copy
import json
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('canonical_registry',ROOT/'scripts/operations-canonical-registry.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
build,definition_digest,validate=module.build,module.definition_digest,module.validate

SOURCE = ROOT/"api/internal/operations-registry.json"
source = json.loads(SOURCE.read_text())
for record in source['reports']+[source['dashboard']]:
    record.pop('engineId',None);record.pop('actionId',None)
registry = build(source)
checks = 0


def check(condition):
    global checks
    assert condition
    checks += 1


def rejects(mutate, message, previous=None):
    candidate = copy.deepcopy(registry)
    mutate(candidate)
    try:
        validate(candidate, previous)
    except ValueError as exc:
        check(message in str(exc))
    else:
        raise AssertionError("Invalid registry accepted:" + message)


validate(registry)
check(len(registry["engines"]) == 13)
check(len(registry["actions"]) == 52)
check(all({k: v for k, v in r.items() if k not in {"engineId", "actionId"}} == old for r, old in zip(registry["reports"], source["reports"])))
check({k: v for k, v in registry["dashboard"].items() if k not in {"engineId", "actionId"}} == source["dashboard"])
check(registry["sourceSections"] == source["sourceSections"])
check(sum(a["scoringScope"] == "legacy_acceptance" for a in registry["actions"]) == 37)
check(sum(a["scoringScope"] == "observation" for a in registry["actions"]) == 7)
check(all(a["lastExecutionTime"] is None and a["lastVerifiedExecution"] is None for a in registry["actions"]))
check(not any(a["currentStatus"] == "verified_complete" for a in registry["actions"]))
check(build(source, registry) == registry)

rejects(lambda d: d["engines"][0].update(canonicalName="Changed"), "Canonical engine")
rejects(lambda d: d["reports"].pop(), "36 ordered")
rejects(lambda d: d["sourceSections"].pop(), "36 original")
rejects(lambda d: d["reportOwners"].update({"OP-01": "ENG-13"}), "ENG13 cannot own")
rejects(lambda d: d["actions"][0].pop("expectedOutput"), "Missing20-field")
rejects(lambda d: d["actions"][0].update(dependencies=[d["actions"][0]["id"]]), "Invalid action dependency")
rejects(lambda d: d["actions"][0].update(dependencies=["ENG-13.ACT-999"]), "Invalid action dependency")
rejects(lambda d: d["actions"][0].update(executionType="automatic", supportedExecutor=None), "Unsupported automatic")
rejects(lambda d: d["actions"][0].update(canonicalName="Renamed"), "Unversioned definition change")

# Add valid version metadata to a rename; the immutable identity still rejects it.
def rename_with_history(candidate):
    action = candidate["actions"][0]
    action["canonicalName"] = "Reused meaning"
    action["versionInformation"]["history"][-1]["definitionDigest"] = definition_digest(action)
rejects(rename_with_history, "Permanent action identity changed")

# Same-purpose metadata updates need append-only history and unchanged identity.
revised = copy.deepcopy(registry)
action = revised["actions"][0]
action["requiredInputs"].append("Additional verified current-release artifact")
action["versionInformation"]["current"] = "1.0.1"
action["versionInformation"]["history"].append({"version": "1.0.1", "changedAt": "2026-10-11", "changeSummary": "Required input clarified; purpose unchanged.", "definitionDigest": definition_digest(action)})
validate(revised, registry)
check(revised["identityManifest"] == registry["identityManifest"])

# A dependency loop cannot be disguised by updating definition version hashes.
def make_cycle(candidate):
    left, right = candidate["actions"][0:2]
    left["dependencies"], right["dependencies"] = [right["id"]], [left["id"]]
    for action in (left, right):
        action["versionInformation"]["history"][-1]["definitionDigest"] = definition_digest(action)
rejects(make_cycle, "Circular action workflow")

# Risk, approval and data boundaries survive an otherwise valid definition revision.
def policy_change(candidate, field, value):
    action=next(a for a in candidate['actions'] if a['scoringScope']=='legacy_acceptance')
    action[field]=value
    action['versionInformation']['history'][-1]['definitionDigest']=definition_digest(action)
rejects(lambda d: policy_change(d,'riskCategory','LOW'),'Unavailable mutation cannot be classified low risk')
rejects(lambda d: policy_change(d,'approvalPolicy',{'required':True,'serverEnforced':True,'cannotBeDowngradedByLearning':False}),'Learning cannot downgrade authorization')
rejects(lambda d: policy_change(d,'approvalPolicy',{'required':False,'serverEnforced':True,'cannotBeDowngradedByLearning':True}),'Unavailable mutation cannot bypass approval')
rejects(lambda d: policy_change(d,'retryPolicy',{'automaticRetries':1,'retryOnUnknownExternalOutcome':True}),'Unknown external outcomes cannot be retried')
rejects(lambda d: policy_change(d,'inputSchema',{'type':'object','additionalProperties':True}),'Unbounded action input schema')
rejects(lambda d: policy_change(d,'auditLoggingRequirements',{'redactSecrets':False,'excludeCustomerPayloads':True}),'Unsafe audit logging')
print(json.dumps({"passedContractChecks": checks, "engines": len(registry["engines"]), "actions": len(registry["actions"]), "preservedReports": 36, "permanentIdentityChangesRejected": True, "circularDependenciesRejected": True}))
