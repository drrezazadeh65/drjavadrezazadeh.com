import assert from 'node:assert/strict';
import {
  proposeStudyPlanRevision,reviewStudyPlanRevision,analyseTrajectory,
  createDecisionExplanation,approveDecisionExplanation,createCoachingReview
} from './development-coaching.mjs';

const draft=proposeStudyPlanRevision({
  plan_id:'p1',current_version:2,trigger_type:'GRADE_CHANGE',
  goal_snapshot:[{goal:'math'}],weekly_capacity_minutes:600,
  rationale:'Comparable mathematics records changed.',proposed_by:'student',ai_assisted:true
});
assert.equal(draft.version_number,3);
assert.equal(draft.status,'DRAFT');
assert.equal(draft.automatic_activation,false);
assert.equal(draft.human_review_required,true);

assert.throws(()=>reviewStudyPlanRevision({revision:draft,decision:'APPROVE',review_note:'ok'}),/Human reviewer/);
const active=reviewStudyPlanRevision({revision:draft,reviewer_user_id:'advisor',decision:'APPROVE',review_note:'Evidence and capacity reviewed.'});
assert.equal(active.status,'ACTIVE');
assert.equal(active.human_approved,true);

assert.throws(()=>analyseTrajectory([{comparability_key:'math',value_numeric:68,observed_at:'2026-01-01',source_type:'GRADE_RECORD',provenance:{source:'school'}}]),/two comparable/);
assert.throws(()=>analyseTrajectory([
  {comparability_key:'math',value_numeric:68,observed_at:'2026-01-01',source_type:'GRADE_RECORD',provenance:{}},
  {comparability_key:'physics',value_numeric:61,observed_at:'2026-02-01',source_type:'GRADE_RECORD',provenance:{}}
]),/comparability key/);
const trajectory=analyseTrajectory([
  {comparability_key:'math-grade-100',value_numeric:68,observed_at:'2026-01-01',source_type:'GRADE_RECORD',provenance:{record:'r1'}},
  {comparability_key:'math-grade-100',value_numeric:64,observed_at:'2026-02-01',source_type:'GRADE_RECORD',provenance:{record:'r2'}},
  {comparability_key:'math-grade-100',value_numeric:61,observed_at:'2026-03-01',source_type:'GRADE_RECORD',provenance:{record:'r3'}},
  {comparability_key:'math-grade-100',value_numeric:57,observed_at:'2026-04-01',source_type:'GRADE_RECORD',provenance:{record:'r4'}}
]);
assert.equal(trajectory.direction,'DECREASE');
assert.equal(trajectory.numeric_delta,-11);
assert.equal(trajectory.improving,null);
assert.equal(trajectory.interpretation,'DESCRIPTIVE_ONLY');

assert.throws(()=>createDecisionExplanation({
  educational_record_id:'e1',recommendation_type:'PATHWAY',supporting_evidence_ids:['x'],
  explanation_text:'Reason',uncertainty_text:'Uncertain',consequential:true
}),/Human reviewer/);
const exp=createDecisionExplanation({
  educational_record_id:'e1',recommendation_type:'PATHWAY',recommendation_reference:'ref1',
  supporting_evidence_ids:['x','x'],counterevidence_ids:['y'],contextual_constraints:['finance'],
  explanation_text:'The option remains plausible because the cited evidence supports further exploration.',
  uncertainty_text:'Admission conditions and the student context may change.',
  reviewer_user_id:'advisor',consequential:true
});
assert.equal(exp.supporting_evidence_ids.length,1);
assert.equal(exp.admission_guarantee,false);
assert.equal(exp.status,'REVIEW_REQUIRED');
const approved=approveDecisionExplanation({explanation:exp,reviewer_user_id:'advisor',decision:'APPROVE',review_note:'Evidence and counterevidence reviewed.'});
assert.equal(approved.status,'APPROVED');

assert.throws(()=>createCoachingReview({
  enrollment:{id:'c1',status:'ACTIVE'},decision:'CONTINUE',evidence_summary:'x',interpretation:'y',next_action:'z'
}),/reviewer/);
const coaching=createCoachingReview({
  enrollment:{id:'c1',status:'ACTIVE'},reviewer_user_id:'advisor',
  evidence_summary:'Reviewed weekly evidence.',interpretation:'Plan remains appropriate.',
  decision:'ADAPT',next_action:'Adjust next-week task load.'
});
assert.equal(coaching.human_reviewed,true);
assert.equal(coaching.payment_determines_judgement,false);

console.log('Development/coaching governance tests passed');
