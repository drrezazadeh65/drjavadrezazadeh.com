import assert from 'node:assert/strict';
import {createWeeklyCycle,addWeeklyEvidence,interpretWeeklyCycle} from './bahar-engine.mjs';
import {planWeeklyCycleInsert,planWeeklyEvidenceInsert,planWeeklyCycleReview,hydrateWeeklyCycle} from './bahar-persistence.mjs';

const cycle=createWeeklyCycle({week_start:'2026-10-05',goal_text:'Test a learning action',planned_action:'Complete one observable task'});
const inserted=planWeeklyCycleInsert({cycle_id:'c1',portfolio_id:'p1',cycle});
assert.equal(inserted.evidence_source_of_truth,'bahar_learning_evidence');
assert.equal(inserted.observed_evidence_legacy_write,false);

const evidence={id:'e1',evidence_type:'PERFORMANCE_SAMPLE',description:'Completed sample',observed_at:'2026-10-06T00:00:00Z'};
const evidenceRow=planWeeklyEvidenceInsert({portfolio_id:'p1',weekly_cycle_id:'c1',evidence});
assert.equal(evidenceRow.weekly_cycle_id,'c1');
const domainCycle=addWeeklyEvidence(cycle,evidence);
const reviewed=interpretWeeklyCycle(domainCycle,{interpretation:'Evidence suggests the action can continue.',adaptation:'Repeat with one changed condition.',reviewer_user_id:'r1'});
const reviewPlan=planWeeklyCycleReview({cycle_id:'c1',interpretation:reviewed.interpretation,adaptation:reviewed.adaptation,reviewer_user_id:'r1',reviewed_at:'2026-10-06T01:00:00Z',evidence_count:1});
assert.equal(reviewPlan.status,'REVIEWED');

const hydrated=hydrateWeeklyCycle({...inserted.weekly_cycle,...reviewPlan},[evidenceRow]);
assert.equal(hydrated.observed_evidence.length,1);
assert.equal(hydrated.observed_evidence[0].id,'e1');
assert.equal(hydrated.status,'REVIEWED');
assert.throws(()=>planWeeklyCycleReview({cycle_id:'c1',interpretation:'x',adaptation:'y',reviewer_user_id:'r1',reviewed_at:'now',evidence_count:0}));
console.log('BAHAR persistence tests passed');
