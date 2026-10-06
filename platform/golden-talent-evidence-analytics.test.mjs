import assert from 'node:assert/strict';
import {reviewedEvidence} from './golden-talent-review.mjs';
import {analyseEvidence,nextEvidencePlan} from './golden-talent-evidence-analytics.mjs';

const raw=(id,domain,source,recorded_at='2026-10-01T00:00:00Z')=>({id,domain_code:domain,source_type:source,source_reference_id:'src-'+id,quality_state:'UNREVIEWED',recorded_at,provenance:{direction:'CONTEXTUALISES'}});
const reviewed=(id,domain,source,direction='SUPPORTS',quality='USABLE',date='2026-10-01T00:00:00Z')=>reviewedEvidence(raw(id,domain,source,date),{id:'r-'+id,evidence_event_id:id,reviewer_user_id:'u1',quality_decision:quality,direction,rationale:'reviewed',review_status:'ACTIVE',reviewed_at:date});

const events=[
 reviewed('a','D1','ASSESSMENT','SUPPORTS'),
 reviewed('b','D1','TEACHER','CONTRADICTS'),
 raw('u','D2','STUDENT_SELF'),
 reviewed('c','D3','PERFORMANCE_SAMPLE','SUPPORTS','USABLE','2024-01-01T00:00:00Z'),
 reviewed('d','D4','CONTEXT','CONTEXTUALISES')
];
const a=analyseEvidence(events,{now:new Date('2026-10-06T00:00:00Z'),stale_after_days:365});
assert.equal(a.total_score,null);
assert.equal(a.talent_rank,null);
assert.equal(a.automatic_career_prescription,false);
assert(a.domains.find(x=>x.domain==='D1').flags.includes('EVIDENCE_DISCREPANCY'));
assert.equal(a.domains.find(x=>x.domain==='D2').unreviewed_event_count,1);
assert.equal(a.domains.find(x=>x.domain==='D2').evidence_state,'INSUFFICIENT');
assert(a.domains.find(x=>x.domain==='D3').flags.includes('STALE_EVIDENCE_PRESENT'));
assert(a.domains.find(x=>x.domain==='D4').flags.includes('CONTEXT_PRESENT'));
const plan=nextEvidencePlan(a);
assert.equal(plan.automatic_module_unlock,false);
assert.equal(plan.items.find(x=>x.domain==='D1').action,'HUMAN_DISCREPANCY_REVIEW');
assert.equal(plan.items.find(x=>x.domain==='D2').action,'COLLECT_TRACEABLE_EVIDENCE');
assert(plan.items.every(x=>x.not_a_talent_rank===true));
console.log('Golden Talent evidence analytics passed');
