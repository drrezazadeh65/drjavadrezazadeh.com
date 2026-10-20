import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScientificContinuitySnapshot,auditBaharTimeline,SCIENTIFIC_CONTINUITY_VERSION} from './scientific-continuity-readiness.mjs';
import {createWeeklyCycle,addWeeklyEvidence,interpretWeeklyCycle} from './bahar-engine.mjs';

const session={session_id:'synthetic-session-01',instrument_version:'rcas-core-1.0',
 responses:[{item_code:'A1',value:2},{item_code:'D4',value:'UNKNOWN'},
 {item_code:'access0',value:'محدود'}]};
const weekly=interpretWeeklyCycle(addWeeklyEvidence(createWeeklyCycle({
 week_start:'2026-10-05',goal_text:'Synthetic learning goal',planned_action:'Observe practice'
}),{id:'ev-1',description:'Synthetic observation',source_evidence_event_id:'event-source-1'}),
{interpretation:'Observation is not a trait',adaptation:'Offer a repeatable learning opportunity',reviewer_user_id:'reviewer-01'});

test('four-system continuity uses existing routers, no score, no PII, no false consent',()=>{
 const output=buildScientificContinuitySnapshot({rcas_submission:session,bahar_cycles:[weekly]});
 assert.equal(SCIENTIFIC_CONTINUITY_VERSION,'1.0.0');
 assert.equal(output.scientific_status,'PREVALIDATION');
 assert.equal(output.rcas.descriptive_event_count,2);
 assert.equal(output.bahar.reviewed_week_count,1);
 assert.deepEqual(output.golden_talent.domains.map(x=>x.domain),['D1','D2','D3','D4','D5','D6']);
 assert.equal(output.golden_talent.balanced_accounting,true);
 assert.equal(output.total_score,null);
 assert.equal(output.normative_label,null);
 assert.equal(output.release_authorized,false);
 assert.equal(output.automatic_purchase_eligibility,false);
 assert.equal(output.privacy.backend_consent_verification_required,true);
 assert.equal(output.privacy.raw_response_exported,false);
 assert.equal(JSON.stringify(output).includes('synthetic-session-01'),false);
 assert.equal(JSON.stringify(output).includes('Synthetic observation'),false);
 assert.ok(Object.isFrozen(output)&&Object.isFrozen(output.golden_talent.domains[0]));
 assert.ok(output.issue_codes.includes('SERVER_AUTHORIZATION_AND_CONSENT_UNVERIFIED'));
});
test('RCAS order does not change descriptive domain readiness',()=>{
 const a=buildScientificContinuitySnapshot({rcas_submission:session});
 const b=buildScientificContinuitySnapshot({rcas_submission:{...session,responses:[...session.responses].reverse()}});
 assert.deepEqual(a,b);
});
test('BAHAR duplicate weeks and repeated evidence identifiers are flagged without automatic diagnosis',()=>{
 const duplicated={...weekly};
 const audit=auditBaharTimeline([weekly,duplicated]);
 assert.ok(audit.issue_codes.includes('DUPLICATE_WEEK'));
 assert.ok(audit.issue_codes.includes('REUSED_REVIEWED_EVIDENCE_ID'));
 const out=buildScientificContinuitySnapshot({bahar_cycles:[weekly,duplicated]});
 assert.ok(out.issue_codes.includes('DUPLICATE_WEEK'));
 assert.equal(out.causal_intervention_effect,null);
});
test('malformed and fabricated submissions are rejected without side effects',()=>{
 assert.throws(()=>buildScientificContinuitySnapshot({rcas_submission:{...session,responses:[{item_code:'Z1',value:4}]}}));
 assert.throws(()=>buildScientificContinuitySnapshot({bahar_cycles:[{week_start:'2026-02-30',status:'REVIEWED',observed_evidence:[]}]}),/Invalid|week|BAHAR|history/i);
 assert.throws(()=>auditBaharTimeline(Array.from({length:53},()=>weekly)));
});
