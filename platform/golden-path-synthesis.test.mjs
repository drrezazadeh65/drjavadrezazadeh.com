// Human review and exact evidence lineage survive Golden Talent v1.1 to BAHAR.
import assert from 'node:assert/strict';
import {
 routeEvidence,ENGINE_VERSION,verifyResult
} from './golden-talent-engine.mjs';
import {reviewedEvidence} from './golden-talent-review.mjs';
import {
 synthesizeGoldenPath,releaseGoldenPath,createBaharHandoff
} from './golden-path-synthesis.mjs';
import {createEightWeekCompass,summariseBaharEvidence} from './bahar-engine.mjs';
const make=(id,source)=>reviewedEvidence({
 id,domain_code:'D1',source_type:source,source_reference_id:'source-'+id,
 quality_state:'UNREVIEWED',provenance:{
  direction:'CONTEXTUALISES',
  independence_group_id:'group-'+id,respondent_reference_id:'reviewer-source-'+id,
  independence_verified:true,claim_reference_id:'claim-D1',
  material_compatibility_verified:true
 }
},{id:'review-'+id,reviewer_user_id:'qualified-human-reviewer',
 quality_decision:'USABLE',direction:'SUPPORTS',
 rationale:'Synthetic controlled observation',review_status:'ACTIVE'});
const reviewed=[make('a','STUDENT_SELF'),make('b','TEACHER')];
const pending={id:'pending',domain_code:'D1',source_type:'PARENT',
 quality_state:'UNREVIEWED',provenance:{direction:'CONTEXTUALISES'}};
const route=routeEvidence([...reviewed,pending]);
assert.equal(ENGINE_VERSION,'1.1.0');
assert.equal(verifyResult(route,[...reviewed,pending]),true);
assert.equal(route.routes[0].evidence_state,'CONVERGENT');
assert.equal(route.routes[0].usable_event_count,2);
assert.throws(()=>synthesizeGoldenPath({route_result:route,
 evidence_events:reviewed,review_accepted:false}),/Human review approval/);
const synth=synthesizeGoldenPath({route_result:route,
 evidence_events:[...reviewed,pending],review_accepted:true});
assert.equal(synth.synthesis_version,'1.1.0');
assert.equal(synth.total_score,null);
assert.equal(synth.normative_label,null);
assert.equal(synth.release_status,'PENDING_PROFESSIONAL_RELEASE');
assert.deepEqual(synth.sections[0].evidence_ids,['a','b']);
assert.equal(synth.sections[0].strengths.length,2);
assert.equal(synth.sections[0].evidence_ids.includes('pending'),false);
const spoof={...pending,id:'a',quality_state:'USABLE',
 provenance:{review_id:'fake-review',direction:'SUPPORTS'},
 review_projection:{active:true}};
assert.throws(()=>synthesizeGoldenPath({
 route_result:route,evidence_events:[spoof,reviewed[1]],review_accepted:true
}),/mismatch|route/);
const withdrawn={...reviewed[0],quality_state:'WITHDRAWN'};
assert.throws(()=>synthesizeGoldenPath({
 route_result:route,evidence_events:[withdrawn,reviewed[1]],review_accepted:true
}),/mismatch/);
const absent=reviewed.slice(0,1);
assert.throws(()=>synthesizeGoldenPath({
 route_result:route,evidence_events:absent,review_accepted:true
}),/mismatch/);
assert.throws(()=>createBaharHandoff(synth),/released Golden Path/);
const released=releaseGoldenPath(synth,{
 release_id:'human-release-1',route_run_id:'verified-route-run-1',
 reviewer_user_id:'qualified-human-reviewer',released_at:'2026-10-19T15:00:00Z'
});
const handoff=createBaharHandoff(released);
assert.equal(handoff.source,'GOLDEN_PATH');
assert.equal(handoff.source_version,'1.1.0');
assert.equal(handoff.requires_human_goal_setting,true);
assert.equal(handoff.compass_status,'DRAFT');
assert.equal(handoff.baseline.scientific_status,'PREVALIDATION');
assert.equal(handoff.baseline.causal_intervention_effect,null);
assert.equal(handoff.baseline.requires_independent_human_review,true);
assert.equal(summariseBaharEvidence([]).longitudinal_trend_ready,false);
const newPlan=createEightWeekCompass({
 goal:'Human selected: an observable weekly habit',
 success_evidence:'Human reviewed examples with provenance',
 baseline_reference:handoff.source_release_id
});
assert.equal(newPlan.automatic_plan_adoption,false);
console.log('Golden Path human release to BAHAR v1.1.0 lineage regressions passed.');
