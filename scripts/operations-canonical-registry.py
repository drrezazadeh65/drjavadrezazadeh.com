#!/usr/bin/env python3
"""Add the canonical registry without rewriting the 36 operational reports.

Offline proposal only. This program does not run an operational action, emit
acceptance evidence, contact production, or modify a database.
"""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

REGISTRY_VERSION = "1.0.0"
CREATED_AT = "2026-10-11"
REQUIRED_FIELDS = (
    "id", "canonicalName", "displayNameFa", "responsibleEngine", "description",
    "priority", "executionType", "requiredInputs", "dependencies",
    "authorizationLevel", "executionEnvironment", "expectedOutput",
    "acceptanceCriteria", "evidenceRequirements", "lastExecutionTime",
    "lastVerifiedExecution", "currentStatus", "errorRecovery", "auditHistory",
    "versionInformation", "riskCategory", "inputSchema", "outputSchema", "targetScope",
    "approvalPolicy", "idempotencyPolicy", "maximumExecutionDurationSeconds", "retryPolicy",
    "expectedSideEffects", "verificationProcedure", "rollbackStrategy", "failureClassifications",
    "auditLoggingRequirements",
)
ENGINE_DEFINITIONS = (
    ("ENG-01", "Master SEO Engine", "موتور اصلی سئو", "Technical SEO, indexing, canonical governance, backlinks and search visibility."),
    ("ENG-02", "AI Discovery & GEO Engine", "موتور کشف هوش مصنوعی و GEO", "AI-search visibility, machine-readable discovery and citation readiness."),
    ("ENG-03", "RAVE Intelligence Engine", "موتور هوشمندی RAVE", "Observed analytics, performance intelligence and evidence-based recommendations."),
    ("ENG-04", "Real Golden Talent Engine", "موتور Golden Talent", "Talent instruments, assessment, scoring, consent and development pathways."),
    ("ENG-05", "Commerce & Finance Engine", "موتور تجارت و مالی", "Products, services, orders, payment readiness, transactions and reconciliation."),
    ("ENG-06", "Scientific Journal Engine", "موتور نشریه علمی", "Academic publications, editorial workflows and research dissemination."),
    ("ENG-07", "CRM & Customer Experience Engine", "موتور ارتباط و تجربه مشتری", "Identity-linked customer journeys, support and service relationships."),
    ("ENG-08", "Content Management Engine", "موتور مدیریت محتوا", "Bilingual content, editorial quality, publication and revision."),
    ("ENG-09", "Media & Image Engine", "موتور رسانه و تصویر", "Stable media identities, derivatives, licensing, optimization and delivery."),
    ("ENG-10", "Design & Identity Engine", "موتور طراحی و هویت", "Design system, responsive UX, branding, accessibility and visual quality."),
    ("ENG-11", "Operations & Security Engine", "موتور عملیات و امنیت", "Bertina infrastructure, deployments, monitoring, privacy, backup and recovery."),
    ("ENG-12", "Unified Administration Engine", "موتور مدیریت یکپارچه", "Permissions, orchestration, configuration, task management and administration."),
    ("ENG-13", "Reporting, Audit & Intelligence Engine", "موتور گزارش، ممیزی و هوشمندی", "Reporting, evidence verification, progress analysis and executive decisions; no ownership of operational acceptance gates."),
)

# Permanent allocations: never derive action identity from ordering or counters.
# Full-scope legacy certification actions are the only actions permitted to
# project an existing OP/ADM record's acceptance gates.
REPORT_BINDINGS = {
    "OP-01": "ENG-01.ACT-004", "OP-02": "ENG-11.ACT-002",
    "OP-03": "ENG-11.ACT-001", "OP-04": "ENG-11.ACT-003",
    "OP-05": "ENG-07.ACT-001", "OP-06": "ENG-07.ACT-002",
    "OP-07": "ENG-05.ACT-001", "OP-08": "ENG-05.ACT-002",
    "OP-09": "ENG-05.ACT-003", "OP-10": "ENG-05.ACT-004",
    "OP-11": "ENG-05.ACT-005", "OP-12": "ENG-01.ACT-005",
    "OP-13": "ENG-01.ACT-006", "OP-14": "ENG-01.ACT-007",
    "OP-15": "ENG-01.ACT-010", "OP-16": "ENG-10.ACT-001",
    "OP-17": "ENG-11.ACT-007", "OP-18": "ENG-10.ACT-002",
    "OP-19": "ENG-07.ACT-003", "OP-20": "ENG-11.ACT-004",
    "OP-21": "ENG-04.ACT-002", "OP-22": "ENG-07.ACT-004",
    "OP-23": "ENG-05.ACT-006", "OP-24": "ENG-05.ACT-007",
    "OP-25": "ENG-08.ACT-001", "OP-26": "ENG-08.ACT-002",
    "OP-27": "ENG-01.ACT-008", "OP-28": "ENG-02.ACT-002",
    "OP-29": "ENG-01.ACT-009", "OP-30": "ENG-08.ACT-003",
    "OP-31": "ENG-08.ACT-004", "OP-32": "ENG-03.ACT-001",
    "OP-33": "ENG-07.ACT-005", "OP-34": "ENG-07.ACT-006",
    "OP-35": "ENG-11.ACT-005", "OP-36": "ENG-11.ACT-006",
    "ADM-01": "ENG-12.ACT-001",
}
SPECIAL_NAMES = {
    "OP-03": "Validate production TLS",
    "OP-07": "Verify checkout readiness",
    "OP-32": "Generate analytics performance assessment",
}
SPECIFIC_BLOCKERS = {
    "OP-02": "Repository administration access is unavailable for default-branch, Pages and technical branch-rule changes; source workflow quarantine alone is insufficient.",
    "OP-05": "Delivery and token redemption require a user-controlled mailbox and an actual production identity lifecycle.",
    "OP-06": "A verified account, delivered recovery message and actual authenticated production session are required.",
    "OP-07": "Effective gateway configuration is observable on the current server. Merchant/Enamad certification, provider verification, inventory and fulfilment evidence remain independently unverified; observation never changes commerce flags.",
    "OP-08": "Provider-authoritative callbacks, idempotency, receipts and reconciliation need the configured approved merchant.",
    "OP-09": "Do not charge until authentication, gateway, callback, fulfilment and owner-approved controlled transaction prerequisites pass.",
    "OP-11": "Warehouse stock, approved shipping, refund terms and an actual delivered order require business/operator evidence.",
    "OP-13": "A complete actual backlink target export and source review are required; a screenshot is not target coverage.",
    "OP-14": "A saved ten-URL inspection sample is available, but full-property coverage and fresh scoped acceptance evidence remain unavailable.",
    "OP-15": "Bing credentials/property are not configured; an IndexNow acknowledgment is separate from indexing.",
    "OP-17": "Field LCP/INP/CLS measurements with sufficient actual coverage are required; laboratory results cannot substitute.",
    "OP-21": "Real consent, role isolation, instrument validation evidence and persisted assessment journeys are not independently certified.",
    "OP-22": "Operator-managed slots, notification delivery and collision-safe confirmed booking require production service evidence.",
    "OP-23": "Service payment and booking fulfilment require their own current production evidence.",
    "OP-24": "Separate legal/business approval and the same trusted gateway controls are required.",
    "OP-25": "Page-by-page scholarly claim/source signoff is required; publication counts are historical estimates.",
    "OP-26": "Page-by-page editorial and academic source review is required.",
    "OP-30": "Persistent consent-safe moderated comment service is not certified.",
    "OP-32": "Old-main RAVE proposal is not a certified Bertina analytics/funnel integration.",
    "OP-33": "A private persisted consent-safe assistant/lead service is not certified.",
    "OP-34": "Opt-in, unsubscribe, suppression and actual delivery workflows are not certified.",
    "OP-35": "An encrypted backup and isolated successful restore drill require host/operator evidence.",
    "OP-36": "Deployment checks have passed, but a rehearsed isolated rollback remains unverified.",
    "ADM-01": "Private verified administrator role/TOTP provisioning and real owner MFA report access are required; no address automatically receives admin rights.",
}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def make_action(action_id, name, fa, description, *, priority="P1", execution="manual",
                inputs=None, dependencies=None, output=None, criteria=None,
                evidence=None, reports=None, scope="unverified_acceptance", executor=None,
                blocker=None, identity_key=None):
    engine = action_id.split(".")[0]
    action = {
        "id": action_id,
        "canonicalName": name,
        "displayNameFa": fa,
        "responsibleEngine": engine,
        "description": description,
        "priority": priority,
        "executionType": execution,
        "requiredInputs": inputs or ["Current authoritative source/release and scope-specific authorized inputs."],
        "dependencies": dependencies or [],
        "authorizationLevel": "verified_active_administrator_with_fresh_MFA_readonly" if executor else "authorized_operator_and_verified_administrator",
        "executionEnvironment": "Bertina same-origin PHP/MySQL authenticated read-only snapshot" if executor else "Existing Bertina-compatible source/CI or authorized provider/operator workflow; no dashboard execution endpoint implemented.",
        "expectedOutput": output or "Dated scope-specific result, unresolved failures, recovery steps and traceable evidence.",
        "acceptanceCriteria": criteria or ["The declared scope passes its own measurable criteria; interface or registry presence is not success."],
        "evidenceRequirements": evidence or ["Scope-specific dated evidence with current release, source, expiry and independent verification where required."],
        "lastExecutionTime": None,
        "lastVerifiedExecution": None,
        "currentStatus": "not_started" if executor else "blocked",
        "errorRecovery": {
            "lastError": None,
            "blocker": blocker if blocker else (None if executor else "No trusted action-specific execution/evidence adapter is registered."),
            "recovery": "Retain failure/history; verify prerequisites, repair through the existing reviewed source/operator workflow, then rerun the same action without changing its identity.",
            "safeRetry": "Read-only snapshot may be refreshed; monetary, publication and notification mutations require their own idempotent approved workflow.",
        },
        "auditHistory": [{"at": CREATED_AT, "event": "registry_definition_created", "result": "definition_only", "source": "Canonical architecture migration; no execution or completion claimed."}],
        "versionInformation": {"current": "1.0.0", "history": []},
        "legacyReportIds": reports or [],
        "scoringScope": scope,
        "supportedExecutor": executor,
        "identityKey": identity_key or action_id + ":" + name,
    }
    critical_reports={"OP-05","OP-06","OP-07","OP-08","OP-09","OP-10","OP-24","OP-35","OP-36","ADM-01"}
    risk="LOW" if executor else ("CRITICAL" if critical_reports.intersection(reports or []) else "HIGH")
    action.update({
        "riskCategory":risk,
        "inputSchema":{"type":"object","additionalProperties":False,"properties":{}},
        "outputSchema":{"type":"object","description":action["expectedOutput"]},
        "targetScope":"authenticated_current_release_observation" if executor else "declared_acceptance_scope_only",
        "approvalPolicy":{"required":risk!="LOW","serverEnforced":True,"cannotBeDowngradedByLearning":True},
        "idempotencyPolicy":"Read-only projection; no operational mutation." if executor else "No mutation adapter registered; action execution is unavailable.",
        "maximumExecutionDurationSeconds":10 if executor else None,
        "retryPolicy":{"automaticRetries":0,"retryOnUnknownExternalOutcome":False},
        "expectedSideEffects":[] if executor else ["Unavailable executor; side effects require a separately approved contract."],
        "verificationProcedure":action["acceptanceCriteria"],
        "rollbackStrategy":"No underlying operation is changed by observation." if executor else "Must be demonstrated before a production mutation is authorized.",
        "failureClassifications":["authorization_denied","dependency_unverified","evidence_unavailable","external_unknown","verification_failed"],
        "auditLoggingRequirements":{"redactSecrets":True,"excludeCustomerPayloads":True,"appendOnlyHistory":True},
    })
    action["versionInformation"]["history"].append({
        "version": "1.0.0", "changedAt": CREATED_AT,
        "changeSummary": "Initial stable action definition; runtime execution remains unverified.",
        "definitionDigest": definition_digest(action),
    })
    return action


def definition_digest(action):
    # Runtime values are separate from the versioned definition.
    excluded = {"versionInformation", "auditHistory", "lastExecutionTime", "lastVerifiedExecution", "currentStatus"}
    return digest({k: v for k, v in action.items() if k not in excluded})


def build(source, previous=None):
    result = copy.deepcopy(source)
    records = {r["id"]: r for r in source["reports"] + [source["dashboard"]]}
    actions = []
    for report_id, action_id in REPORT_BINDINGS.items():
        report = records[report_id]
        execution = "approval-required" if report_id in {"OP-09", "OP-24"} else "manual"
        action = make_action(
            action_id, SPECIAL_NAMES.get(report_id, "Certify " + report["title"]), report["titleFa"],
            "Certify the complete preserved " + report_id + " acceptance scope. " + report["remaining"],
            priority=report["priority"], execution=execution,
            inputs=["Current deployed release SHA", "Authorized scope-specific source/provider/operator access", report["evidenceSource"]],
            dependencies=[REPORT_BINDINGS[d] for d in report["dependencies"]],
            output="Certified or explicitly open " + report_id + " result with the original full report and traceable gate evidence.",
            criteria=[report["acceptance"], "All four original acceptance gates are current, unexpired, successful and persisted; all dependencies closed."],
            evidence=["Published scope-specific code", "Successful acceptance tests", "Actual production verification", "Persisted source/expiry/release-scoped trustworthy evidence"],
            reports=[report_id], scope="legacy_acceptance",
            blocker=SPECIFIC_BLOCKERS.get(report_id, "The complete scoped production/evidence gate set remains unrecorded; existing source/CI observations do not certify this action."),
            identity_key="legacy-full-acceptance:" + report_id,
        )
        actions.append(action)

    plans = (
        ("ENG-01.ACT-001", "Validate canonical URLs", "اعتبارسنجی نشانی‌های canonical", "OP-01", "Every approved indexable route has its approved same-language canonical; no private route becomes indexable."),
        ("ENG-01.ACT-002", "Audit hreflang reciprocity", "ممیزی ارتباط متقابل hreflang", "OP-01", "Every approved FA/EN alternate relation is reciprocal and matches canonical language architecture."),
        ("ENG-01.ACT-003", "Verify internal links", "بررسی پیوندهای داخلی", "OP-01", "All approved internal targets resolve with no broken public targets or unrelated homepage redirects."),
        ("ENG-02.ACT-001", "Audit AI crawler accessibility", "ممیزی دسترسی خزنده‌های هوش مصنوعی", "OP-28", "Permitted crawler directives, llms/discovery identity and protected private paths pass; no AI indexing/citation claim without observation."),
        ("ENG-04.ACT-001", "Validate talent assessment instrument", "اعتبارسنجی ابزار سنجش استعداد", "OP-21", "Instrument identity/version, consent and scoring documentation are traceable; scientific validation claims each cite supporting research."),
    )
    for action_id, name, fa, report_id, criteria in plans:
        actions.append(make_action(
            action_id, name, fa, criteria, priority="P0" if action_id.startswith("ENG-01") else "P1",
            dependencies=["ENG-11.ACT-002", "ENG-11.ACT-001"] if action_id.startswith("ENG-01") else [],
            reports=[report_id], criteria=[criteria], identity_key="granular:" + action_id,
            blocker="The existing parent report is retained, but this granular action needs its own scoped execution/evidence; parent gate success cannot be copied to it.",
        ))

    actions.append(make_action(
        "ENG-06.ACT-001", "Validate scientific journal publishing governance", "اعتبارسنجی مدیریت انتشار نشریه علمی",
        "Review existing journal pages and platform/publishing-journal-governance.json, author/editorial metadata, manuscript and review configuration, references and publication status.",
        inputs=["Existing journal inventory", "Source file: platform/publishing-journal-governance.json", "Verified operator/editorial policy and publication records"],
        criteria=["Existing journal metadata and claims match documented status", "Manuscript and editorial paths are only called operational after persisted role-isolated workflows pass", "No accreditation, peer-review or external indexing claim without direct evidence"],
        blocker="Existing journal content/governance is present; an authenticated persistent editorial workflow and external accreditation/indexing are not certified.",
        identity_key="journal:publishing-governance-certification",
    ))
    actions.append(make_action(
        "ENG-09.ACT-001", "Validate canonical media library", "اعتبارسنجی کتابخانه مرجع رسانه",
        "Review existing assets/media-registry.json, platform/media-library-policy.json, image provenance, usage references and actual supported derivatives.",
        inputs=["assets/media-registry.json", "Source file: platform/media-library-policy.json", "Source audit: scripts/media-library-audit.mjs", "Approved source/licensing records"],
        criteria=["Stable unique media identities and approved source/usage references", "Actual derivative files and cache/broken-image checks pass", "Book covers and academic images remain approved; unknown licenses stay explicitly unknown"],
        blocker="Source media registry/audit exists; persistent admin media actions, complete licensing review and production delivery certification are not established.",
        identity_key="media:canonical-library-certification",
    ))

    # These collectors really exist in operationsSignals(). They collect
    # observations, never operational certification and never automatic charges.
    observations = (
        ("ENG-01.ACT-011", "Read saved Google inspection observations", "خواندن شواهد ذخیره‌شده بررسی گوگل", ["OP-14"], ["sample_size", "indexed_sample", "unknown_sample"], "Ten-URL saved sample only; not live property coverage or newest-release indexation."),
        ("ENG-05.ACT-008", "Read effective commerce readiness", "خواندن آمادگی فنی تجارت", ["OP-07", "OP-09", "OP-23", "OP-24"], ["public_tls_confirmed", "commerce_enabled", "gateway_configured", "amount_conversion", "checkout_runtime"], "Boolean effective configuration; no secret values, merchant approval, callback, charge or reconciliation inferred."),
        ("ENG-05.ACT-009", "Read bounded order-state observations", "خواندن نمونه محدود وضعیت سفارش‌ها", ["OP-08", "OP-09", "OP-11"], ["captured", "pending", "paid_records"], "At most1000 UUID-indexed rows; not chronological/all-time revenue or independently verified provider transactions."),
        ("ENG-05.ACT-010", "Read catalogue and fulfilment readiness", "خواندن آمادگی کاتالوگ و تحویل", ["OP-08", "OP-10", "OP-11", "OP-23"], ["sellable_books", "order_email_fulfilment_confirmed", "book_shipping_confirmed", "service_booking_confirmed"], "Approved catalogue count and configuration booleans do not prove warehouse stock, delivered receipt, shipment or confirmed booking."),
        ("ENG-07.ACT-007", "Read authentication and email runtime readiness", "خواندن آمادگی فنی ورود و ایمیل", ["OP-05", "OP-06"], ["auth_runtime", "email_transport"], "Runtime configuration only; receipt, verification, login and recovery require actual identity lifecycle evidence."),
        ("ENG-11.ACT-008", "Read independent TLS proof freshness", "خواندن تازگی گواه مستقل TLS", ["OP-03"], ["independent_tls"], "Current SHA/run-matched proof, native canonical HTTPS and expiry; contacted addresses only and no monetary activation."),
        ("ENG-11.ACT-009", "Read server-recorded release identity", "خواندن شناسه نسخه ثبت‌شده سرور", ["OP-02"], ["current_release"], "MySQL release identity only; no default-branch, Pages or technical ruleset assertion."),
    )
    for action_id, name, fa, report_ids, signal_ids, limit in observations:
        actions.append(make_action(
            action_id, name, fa, "Collect authenticated read-only observations through the existing operationsSignals() adapter. " + limit,
            execution="automatic", inputs=["Verified active administrator", "Fresh MFA", "Current operations_release and source observation availability"],
            output="Source/time/expiry-labelled readonly observation; false, zero, unknown and stale remain distinguishable.",
            criteria=["Only permitted aggregate/boolean/current-release signals returned", "Source, timestamp, expiry and limitations remain visible", "No customer/credential values, fabricated metrics or operational gate closure"],
            evidence=["Actual authenticated snapshot observation with source, checkedAt and expiresAt", "Readonly/privacy integration tests"],
            reports=report_ids, scope="observation",
            executor={"type": "readonly_snapshot", "function": "operationsSignals", "endpoint": "/api/admin/operations", "signalIds": signal_ids, "writes": False},
            identity_key="existing-observation:" + action_id,
        ))
    actions.append(make_action(
        "ENG-13.ACT-001", "Generate consolidated executive report", "تولید گزارش یکپارچه مدیریتی",
        "Generate executive interpretation from the current authenticated server snapshot, all36 preserved reports and their responsible engines; no underlying acceptance ownership.",
        inputs=["Authenticated current-release snapshot", "All36 original reports/source mappings", "Canonical engine/action registry", "Source/expiry-aware evidence history"],
        output="FA/EN executive and consolidated written/printable/JSON/CSV reports; PDF only when actual print/export capability exists.",
        criteria=["All36 reports included without truncating their original detail", "Estimated, measured, verification coverage, production and commercial readiness separated", "Pending/blocked actions, dependencies, risks and observed impact included", "Unknown revenue/ranking/coverage remains unknown"],
        blocker="Canonical reporting adapter is available as a read-only projection; current action-specific execution evidence is required before this action can complete.",
        identity_key="reporting:consolidated-executive-generation",
    ))

    actions.sort(key=lambda action: action["id"])
    owners = {report_id: action_id.split(".")[0] for report_id, action_id in REPORT_BINDINGS.items()}
    engines = []
    for engine_id, name, fa, responsibility in ENGINE_DEFINITIONS:
        engines.append({
            "id": engine_id, "canonicalName": name, "displayNameFa": fa,
            "kind": "reporting" if engine_id == "ENG-13" else "operational",
            "responsibility": responsibility,
            "authorizationScope": "verified administrator with fresh MFA; readonly report visibility; operational mutation capabilities require their own registered authorization and executor",
            "reportIds": [report_id for report_id, owner in owners.items() if owner == engine_id],
            "actionIds": [action["id"] for action in actions if action["responsibleEngine"] == engine_id],
            "ownsOperationalAcceptanceGates": engine_id != "ENG-13",
        })
    # Engine/source definitions remain centralized. A report retains its legacy
    # display engine field for compatibility and gains the authoritative ID.
    for record in result["reports"] + [result["dashboard"]]:
        record["engineId"] = owners[record["id"]]
        record["actionId"] = REPORT_BINDINGS[record["id"]]
    result.update({
        "registryVersion": REGISTRY_VERSION,
        "canonicalSchema": "canonical-13-engine-registry-v1",
        "engines": engines, "actions": actions,
        "reportOwners": owners, "reportActionIds": copy.deepcopy(REPORT_BINDINGS),
        "progressMethodology": {
            "estimatedCompletion": "Historical estimates retained; never live operational truth.",
            "measuredCompletion": "Existing full-scope four-gate measured progress, scoped current-release unexpired evidence and closed dependencies; unknown is null.",
            "verificationCoverage": "Known accepted-gate observations / declared acceptance-gate total; unknown and expired evidence separately reported.",
            "productionReadiness": "Actual scoped production gate and runtime prerequisite status; source tests alone insufficient.",
            "commercialReadiness": "Separate applicable identity, merchant, callback, fulfilment and reconciliation prerequisites; technical completion does not activate payment.",
            "engineAggregation": "Count each owned full legacy acceptance scope once. Granular new actions and observations cannot duplicate legacy gate weight or borrow acceptance evidence.",
            "reportingOwnership": "ENG-13 generates and verifies reports; owns zero OP/ADM acceptance gates.",
        },
    })
    if previous:
        update_versions(result, previous)
    result["identityManifest"] = {
        "schema": "immutable-action-identities-v1", "createdAt": CREATED_AT,
        "engines": {engine["id"]: engine["canonicalName"] for engine in engines},
        "actions": {action["id"]: {"canonicalName": action["canonicalName"], "responsibleEngine": action["responsibleEngine"], "identityKey": action["identityKey"], "createdInVersion": "1.0.0"} for action in actions},
        "reportActionIds": copy.deepcopy(REPORT_BINDINGS),
    }
    validate(result, previous)
    return result


def update_versions(current, previous):
    prior_actions = {a["id"]: a for a in previous["actions"]}
    for action in current["actions"]:
        old = prior_actions.get(action["id"])
        if not old:
            continue
        action["auditHistory"] = copy.deepcopy(old["auditHistory"])
        action["versionInformation"] = copy.deepcopy(old["versionInformation"])
        for key in ("lastExecutionTime", "lastVerifiedExecution", "currentStatus"):
            action[key] = old[key]
        if definition_digest(action) != definition_digest(old):
            major, minor, patch = map(int, old["versionInformation"]["current"].split("."))
            version = f"{major}.{minor}.{patch + 1}"
            action["versionInformation"]["current"] = version
            action["versionInformation"]["history"].append({
                "version": version, "changedAt": CREATED_AT,
                "changeSummary": "Definition revised without changing permanent purpose/identity.",
                "definitionDigest": definition_digest(action),
            })
            action["auditHistory"].append({"at": CREATED_AT, "event": "registry_definition_revised", "result": "definition_only", "source": "Versioned canonical registry transformation"})


def validate(registry, previous=None):
    def require(condition, message):
        if not condition:
            raise ValueError(message)
    engines = {e["id"]: e for e in registry["engines"]}
    require(len(engines) == 13, "Exactly13 unique engines required")
    require({e: engines[e]["canonicalName"] for e in engines} == {e: n for e, n, _, _ in ENGINE_DEFINITIONS}, "Canonical engine IDs/names changed")
    reports = registry["reports"] + [registry["dashboard"]]
    require([r["id"] for r in registry["reports"]] == [f"OP-{i:02d}" for i in range(1, 37)], "The36 ordered legacy reports must remain")
    require(registry["dashboard"]["id"] == "ADM-01", "SeparateADM-01 required")
    require(len(registry["sourceSections"]) == 36, "All36 original source sections required")
    require(set(registry["reportOwners"]) == {r["id"] for r in reports}, "EveryOP/ADM requires exactlyone responsible engine")
    require(all(e in engines and e != "ENG-13" for e in registry["reportOwners"].values()), "ENG13 cannot own operational acceptance")
    actions = {a["id"]: a for a in registry["actions"]}
    require(len(actions) == len(registry["actions"]), "Duplicate actionID")
    for action in actions.values():
        action_id = action["id"]
        require(re.fullmatch(r"ENG-(?:0[1-9]|1[0-3])\.ACT-[0-9]{3}", action_id) is not None, "Invalid permanentID:" + action_id)
        require(set(REQUIRED_FIELDS).issubset(action), "Missing20-field contract:" + action_id)
        require(action["responsibleEngine"] == action_id.split(".")[0], "Engine/identity mismatch:" + action_id)
        require(action["executionType"] in {"automatic", "manual", "scheduled", "approval-required"}, "Invalid executiontype")
        require(action["currentStatus"] in {"not_started", "pending", "blocked", "in_progress", "ready_for_verification", "verified_complete", "regressed", "deprecated"}, "Invalid status")
        for field in ("requiredInputs", "acceptanceCriteria", "evidenceRequirements", "auditHistory"):
            require(isinstance(action[field], list) and bool(action[field]), "Missing structured field:" + field)
        require(all(dep in actions and dep != action_id for dep in action["dependencies"]), "Invalid action dependency:" + action_id)
        require(all(r in registry["reportOwners"] for r in action["legacyReportIds"]), "Unknown report reference")
        if action["scoringScope"] == "legacy_acceptance":
            require(len(action["legacyReportIds"]) == 1, "Full acceptance action must map exactlyone legacyrecord")
            rid = action["legacyReportIds"][0]
            require(registry["reportActionIds"][rid] == action_id, "Legacy scope has duplicate action weighting")
        if action["executionType"] == "automatic":
            require(action["supportedExecutor"] is not None and action["supportedExecutor"]["type"] == "readonly_snapshot" and action["supportedExecutor"]["writes"] is False, "Unsupported automatic executor")
            require(action["scoringScope"] == "observation", "Readiness observations may not certify acceptance gates")
        require(action["riskCategory"] in {"LOW","MEDIUM","HIGH","CRITICAL"}, "Invalid risk category")
        readonly=action["scoringScope"]=="observation" and action["supportedExecutor"] is not None
        require(readonly or action["riskCategory"] in {"HIGH","CRITICAL"}, "Unavailable mutation cannot be classified low risk")
        require(action["approvalPolicy"]["serverEnforced"] is True and action["approvalPolicy"]["cannotBeDowngradedByLearning"] is True, "Learning cannot downgrade authorization")
        require(readonly or action["approvalPolicy"]["required"] is True, "Unavailable mutation cannot bypass approval")
        require(action["retryPolicy"]["retryOnUnknownExternalOutcome"] is False, "Unknown external outcomes cannot be retried")
        require(action["inputSchema"].get("additionalProperties") is False, "Unbounded action input schema")
        require(action["auditLoggingRequirements"]["redactSecrets"] is True and action["auditLoggingRequirements"]["excludeCustomerPayloads"] is True, "Unsafe audit logging")
        history = action["versionInformation"]["history"]
        require(bool(history) and history[-1]["version"] == action["versionInformation"]["current"], "Missing version history")
        require(history[-1]["definitionDigest"] == definition_digest(action), "Unversioned definition change:" + action_id)
    for engine in engines.values():
        require(bool(engine["actionIds"]), "Everyengine requires declared action scope")
        require(set(engine["actionIds"]) == {a["id"] for a in actions.values() if a["responsibleEngine"] == engine["id"]}, "Engine action ownership drift")
        require(set(engine["reportIds"]) == {r for r, e in registry["reportOwners"].items() if e == engine["id"]}, "Engine report ownership drift")
    require(not engines["ENG-13"]["reportIds"] and not engines["ENG-13"]["ownsOperationalAcceptanceGates"], "Reporting must not certify operational ownership")
    visiting, visited = set(), set()
    def visit(action_id):
        require(action_id not in visiting, "Circular action workflow:" + action_id)
        if action_id in visited:
            return
        visiting.add(action_id)
        for dep in actions[action_id]["dependencies"]:
            visit(dep)
        visiting.remove(action_id)
        visited.add(action_id)
    for action_id in actions:
        visit(action_id)
    manifest = registry["identityManifest"]
    require(set(manifest["actions"]) == set(actions), "Persisted permanent identity inventory incomplete")
    require(manifest["reportActionIds"] == registry["reportActionIds"], "Report/action identity mapping drift")
    for action_id, identity in manifest["actions"].items():
        require(all(actions[action_id][key] == identity[key] for key in ("canonicalName", "responsibleEngine", "identityKey")), "Permanent action identity changed")
    if previous:
        require(set(previous["identityManifest"]["actions"]).issubset(actions), "Cannot delete/reuse an allocated actionID; deprecate and retain")
        require(previous["identityManifest"]["engines"] == manifest["engines"], "Immutable engine identity changed")
        for action_id, identity in previous["identityManifest"]["actions"].items():
            require(manifest["actions"][action_id] == identity, "Never rename/reassign/reuse an existing actionID:" + action_id)
            old = next(a for a in previous["actions"] if a["id"] == action_id)
            history = actions[action_id]["versionInformation"]["history"]
            require(history[:len(old["versionInformation"]["history"])] == old["versionInformation"]["history"], "Version history must be append-only")
        require(all(registry["reportActionIds"].get(k) == v for k, v in previous["reportActionIds"].items()), "Never remap an existing full-scope report identity silently")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--identity-manifest", type=Path)
    args = parser.parse_args()
    source = json.loads(args.source.read_text())
    previous = json.loads(args.previous.read_text()) if args.previous else None
    if args.validate_only:
        validate(source, previous)
        result = source
    else:
        if not args.output:
            parser.error("--output is required unless --validate-only")
        result = build(source, previous)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    if args.identity_manifest:
        baseline=json.loads(args.identity_manifest.read_text())
        manifest=result["identityManifest"]
        if baseline["engines"]!=manifest["engines"] or any(manifest["actions"].get(a)!=identity for a,identity in baseline["actions"].items()) or any(manifest["reportActionIds"].get(r)!=a for r,a in baseline["reportActionIds"].items()):
            raise ValueError("Immutable baseline action/engine identity changed")
    print(json.dumps({"valid": True, "engines": len(result["engines"]), "actions": len(result["actions"]), "preservedReports": len(result["reports"]), "sourceSections": len(result["sourceSections"]), "reportingOperationalOwners": len(result["engines"][-1]["reportIds"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
