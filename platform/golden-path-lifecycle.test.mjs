import assert from 'node:assert/strict';
import {invalidateGoldenPathRelease,validateReleaseTransitionForPersistence,reconcileBaharBaseline,activateReplacementBaseline} from './golden-path-lifecycle.mjs';

const release={id:'release-1',release_status:'RELEASED',route_run_id:'route-1'};
const revoked=invalidateGoldenPathRelease({release,reason:'CONSENT_WITHDRAWN',affected_evidence_ids:['e1','e1'],trigger_reference:'consent-decision-1'});
assert.equal(revoked.previous_release.release_status,'REVOKED');
assert.deepEqual(revoked.transition.affected_evidence_ids,['e1']);
assert.equal(validateReleaseTransitionForPersistence(revoked).valid,true);

const superseded=invalidateGoldenPathRelease({release,reason:'MATERIAL_ROUTE_CHANGE',new_route_run_id:'route-2',actor_user_id:'reviewer-1'});
assert.equal(superseded.previous_release.release_status,'SUPERSEDED');
assert.equal(superseded.transition.replacement_route_run_id,'route-2');
assert.equal(validateReleaseTransitionForPersistence(superseded).valid,true);

const unaudited=invalidateGoldenPathRelease({release,reason:'EVIDENCE_WITHDRAWN'});
assert.throws(()=>validateReleaseTransitionForPersistence(unaudited));

const portfolio={id:'p1',source_release_id:'release-1',status:'ACTIVE',baseline_version:1,reconciliation:'CURRENT'};
const paused=reconcileBaharBaseline({portfolio,invalidation:superseded});
assert.equal(paused.status,'PAUSED');
assert.equal(paused.pending_route_run_id,'route-2');
const active=activateReplacementBaseline({portfolio:paused,new_release:{id:'release-2',release_status:'RELEASED',route_run_id:'route-2'}});
assert.equal(active.status,'ACTIVE');
assert.equal(active.baseline_version,2);
assert.equal(active.source_release_id,'release-2');

console.log('Golden Path lifecycle tests passed');
