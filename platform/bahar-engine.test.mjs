import assert from 'node:assert/strict';
import {
 BAHAR_MODEL,createEightWeekCompass,createThirtyDayStarter,
 createWeeklyCycle,addWeeklyEvidence,interpretWeeklyCycle,
 summariseBaharEvidence,createPeriodReview,goldenPathReassessmentRequest
} from './bahar-engine.mjs';
import {readFileSync} from 'node:fs';

const book=JSON.parse(readFileSync(new URL('./golden-talent-book-crosswalk.v1.json',import.meta.url),'utf8'));
assert.deepEqual(BAHAR_MODEL.study_method,book.bahar.study_method);
assert.deepEqual(BAHAR_MODEL.action_cycle,book.bahar.action_cycle);
assert.deepEqual(BAHAR_MODEL.portfolio,book.bahar.portfolio);
assert.equal(BAHAR_MODEL.status,'PREVALIDATION');
assert.equal(BAHAR_MODEL.diagnostic_scoring,false);
assert.equal(BAHAR_MODEL.automatic_golden_path_update,false);
const starter=createThirtyDayStarter();
assert.deepEqual(starter.weeks.map(w=>w.week),[1,2,3,4]);
assert.equal(starter.not_personalised,true);
assert.equal(starter.not_auto_saved,true);
const compass=createEightWeekCompass({
 goal:'Build a verifiable practice habit',
 success_evidence:'Weekly independently observed practice examples',
 context_constraints:'Limited study access for two days a week'
});
assert.equal(compass.period_weeks,8);
assert.equal(compass.interpretation_status,'UNREVIEWED');
assert.equal(compass.automatic_plan_adoption,false);
assert.throws(()=>createEightWeekCompass({goal:'Goal only'}));

assert.throws(()=>createWeeklyCycle({week_start:'2026-02-30',goal_text:'A',planned_action:'B'}));
assert.throws(()=>createWeeklyCycle({week_start:'yesterday',goal_text:'A',planned_action:'B'}));
const start=createWeeklyCycle({week_start:'2026-10-05',goal_text:'Formative goal',planned_action:'Try one observable action'});
assert.equal(start.status,'OPEN');
assert.deepEqual(start.observed_evidence,[]);
assert.throws(()=>interpretWeeklyCycle(start,{interpretation:'Guess',adaptation:'Guess',reviewer_user_id:'staff'}));
assert.throws(()=>addWeeklyEvidence(start,{id:'',description:'Untraceable'}));
const single=addWeeklyEvidence(start,{
 id:'sample-1',evidence_type:'PERFORMANCE_SAMPLE',description:'Observed performance in the defined task',
 observed_at:'2026-10-06T09:00:00Z'
});
assert.equal(single.observed_evidence.length,1);
assert.equal(start.observed_evidence.length,0,'Engine must not mutate original cycle');
assert.equal(single.observed_evidence[0].provenance_status,'UNSPECIFIED');
assert.throws(()=>addWeeklyEvidence(single,{id:'sample-1',description:'Duplicate'}));
assert.throws(()=>addWeeklyEvidence(single,{id:'sample-2',evidence_type:'DIAGNOSIS',description:'Unsafe type'}));
assert.throws(()=>addWeeklyEvidence(single,{id:'sample-2',description:'Observed',observed_at:'definitely not a date'}));
const traced=addWeeklyEvidence(single,{
 id:'sample-2',evidence_type:'FEEDBACK',
 description:'A dated descriptive comment',
 source_evidence_event_id:'source-event-2',observed_at:'2026-10-07T09:00:00Z'
});
assert.equal(traced.observed_evidence[1].provenance_status,'LINKED_UNVERIFIED');
const weekOne=interpretWeeklyCycle(traced,{
 interpretation:'Two observations describe the trial; reliability not established',
 adaptation:'Continue one changed learning activity',
 reviewer_user_id:'staff-1'
});
assert.equal(weekOne.status,'REVIEWED');
assert.throws(()=>addWeeklyEvidence(weekOne,{id:'sample-3',description:'Late edit'}));
assert.throws(()=>interpretWeeklyCycle(weekOne,{interpretation:'Overwrite',adaptation:'Overwrite',reviewer_user_id:'staff-1'}));
const insufficient=summariseBaharEvidence([start]);
assert.equal(insufficient.observation_quality,'INSUFFICIENT');
assert.equal(insufficient.normative_score,null);
assert.equal(insufficient.longitudinal_trend_ready,false);
assert.throws(()=>createPeriodReview({
 review_type:'FOUR_WEEK',cycles:[start],decision:'CONTINUE',rationale:'No observed evidence',reviewer_user_id:'staff-1'
}));
const coverage=summariseBaharEvidence([weekOne]);
assert.equal(coverage.observed_event_count,2);
assert.equal(coverage.events_without_source_link,1);
assert.equal(coverage.observation_quality,'PROVENANCE_REVIEW_REQUIRED');
assert.equal(coverage.distinct_reviewed_weeks,1);
assert.equal(coverage.statistical_confidence,null);
assert.equal(coverage.longitudinal_trend_ready,false);
const review=createPeriodReview({
 review_type:'FOUR_WEEK',cycles:[weekOne],decision:'CHANGE',
 rationale:'Human considered the limitations and selected a reversible change',
 next_step:'Discuss one new trial',reviewer_user_id:'staff-1'
});
assert.equal(review.incomplete_period_warning,true,'Incomplete period must be visible');
assert.equal(review.reviewed_cycle_count,1);
assert.equal(review.evidence_coverage.longitudinal_trend_ready,false);
assert.equal(review.global_talent_score,null);
assert.equal(review.automatic_golden_path_update,false);
assert.equal(review.decision_is_human_authored,true);
assert.equal(review.golden_path_update_required,true);
assert.deepEqual(review.evidence_ids,['sample-1','sample-2']);
const next=goldenPathReassessmentRequest(review);
assert.equal(next.requires_new_route_run,true);
assert.equal(next.requires_human_review,true);
assert.equal(next.automatic_release,false);
const continueReview=createPeriodReview({review_type:'AD_HOC',cycles:[weekOne],decision:'CONTINUE',
 rationale:'No update needed',reviewer_user_id:'staff-1'});
assert.equal(goldenPathReassessmentRequest(continueReview),null);
assert.throws(()=>goldenPathReassessmentRequest({
 golden_path_update_required:true,decision:'CHANGE',evidence_ids:['sample-1']
}),'Forged auto-review must not trigger route change');
const sameEvent=interpretWeeklyCycle(addWeeklyEvidence(
 createWeeklyCycle({week_start:'2026-10-12',goal_text:'Second week',planned_action:'Repeat'}),
 {id:'sample-1',description:'Duplicated ID in another week'}
),{interpretation:'Explanation',adaptation:'Next',reviewer_user_id:'staff-1'});
assert.throws(()=>createPeriodReview({review_type:'EIGHT_WEEK',cycles:[weekOne,sameEvent],
 decision:'CHANGE',rationale:'Duplicate event',reviewer_user_id:'staff-1'}));
const repeatedCycle=interpretWeeklyCycle(addWeeklyEvidence(
 createWeeklyCycle({week_start:'2026-10-12',goal_text:'Repeat formative observation',planned_action:'Try in new context'}),
 {id:'sample-3',description:'Source reused at follow-up',source_evidence_event_id:'source-event-2'}
),{interpretation:'Observation is a repeated source, not an independently verified improvement',
 adaptation:'Compare conditions before interpretation',reviewer_user_id:'staff-1'});
const repeatedSummary=summariseBaharEvidence([weekOne,repeatedCycle]);
assert.equal(repeatedSummary.source_references_repeated_across_weeks,1);
assert.equal(repeatedSummary.independent_source_corroboration_established,false);
assert.equal(repeatedSummary.context_and_opportunity_equivalence_established,false);
assert.equal(repeatedSummary.causal_intervention_effect,null);
assert.equal(repeatedSummary.longitudinal_trend_ready,false);
console.log('BAHAR engine: 7-step book fidelity, context, source-aware evidence, human decisions and safety tests passed.');
