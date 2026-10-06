import assert from 'node:assert/strict';
import {transitionSession,submissionKey,planSubmission,routeRunVersion,planRouteRunPersistence,supersedeRouteRun} from './golden-talent-orchestrator.mjs';

assert.equal(transitionSession('IN_PROGRESS','SUBMITTED'),'SUBMITTED');
assert.throws(()=>transitionSession('COMPLETE','ROUTING'));
assert.equal(submissionKey({session_id:'s1',instrument_version:'1',response_revision:2}),'s1:1:2');
const submission=planSubmission({session:{id:'s1',status:'IN_PROGRESS'},idempotency_key:'s1:1:2',instrument_version:'1',response_revision:2});
assert.equal(submission.client_authoritative,false);
const key=routeRunVersion({profile_id:'p1',trigger_session_id:'s1',engine_version:'0.2',evidence_revision:3});
assert.equal(key,'p1:s1:0.2:3');
const plan=planRouteRunPersistence({profile_id:'p1',trigger_session_id:'s1',engine_version:'0.2',evidence_revision:3,policy_snapshot:{a:1}});
assert.equal(plan.route_version_key,key);
assert.equal(plan.source_of_truth,'TALENT_ROUTE_RUN');
assert.equal(plan.legacy_assessment_route_write,false);
const sup=supersedeRouteRun({id:'r1',status:'RELEASED'},{id:'r2'});
assert.equal(sup.previous.status,'SUPERSEDED');
assert.equal(sup.history_preserved,true);
console.log('Golden Talent orchestrator tests passed');
