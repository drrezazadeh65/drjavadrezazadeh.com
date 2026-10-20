import assert from 'node:assert/strict';
import {routeEvidence,classifyDomain} from './golden-talent-engine.mjs';
import {reviewedEvidence,effectiveEvidenceView,projectEvidenceLedger} from './golden-talent-review.mjs';

const raw=(id,domain,source)=>({id,domain_code:domain,source_type:source,source_reference_id:'origin-'+id,quality_state:'UNREVIEWED',provenance:{direction:'CONTEXTUALISES',independence_verified:true,independence_group_id:'group-'+id,respondent_reference_id:'respondent-'+id,claim_reference_id:'claim-'+domain,material_compatibility_verified:true}}); // Synthetic independently evidenced provenance for CI only.
const ev=(id,domain,source,quality='USABLE',direction='SUPPORTS')=>reviewedEvidence(raw(id,domain,source),{
 id:'review-'+id,evidence_event_id:id,reviewer_user_id:'reviewer',quality_decision:quality,direction,rationale:'CI review',review_status:'ACTIVE'
});

assert.equal(classifyDomain('D1',[]).evidence_state,'INSUFFICIENT');
assert.equal(classifyDomain('D1',[raw('raw','D1','STUDENT_SELF')]).evidence_state,'INSUFFICIENT');
assert.equal(classifyDomain('D1',[{...raw('spoof','D1','STUDENT_SELF'),quality_state:'USABLE',provenance:{direction:'SUPPORTS'}}]).evidence_state,'INSUFFICIENT');
assert.equal(classifyDomain('D1',[ev('a','D1','STUDENT_SELF')]).evidence_state,'SINGLE_SOURCE');
assert.equal(classifyDomain('D1',[ev('a','D1','STUDENT_SELF'),ev('b','D1','TEACHER')]).evidence_state,'CONVERGENT');
assert.equal(classifyDomain('D1',[ev('a','D1','STUDENT_SELF'),ev('b','D1','TEACHER','USABLE','CONTRADICTS')]).evidence_state,'DISCREPANT');
assert.equal(classifyDomain('D1',[ev('a','D1','STUDENT_SELF','WITHDRAWN'),ev('b','D1','TEACHER')]).evidence_state,'SINGLE_SOURCE');
assert.equal(classifyDomain('D1',[ev('a','D1','STUDENT_SELF','LIMITED'),ev('b','D1','TEACHER')]).evidence_state,'SINGLE_SOURCE');

const unreviewed=effectiveEvidenceView(raw('x','D2','PARENT'),[]);
assert.equal(unreviewed.review_projection.active,false);
assert.equal(unreviewed.quality_state,'UNREVIEWED');
assert.throws(()=>effectiveEvidenceView(raw('x','D2','PARENT'),[
 {id:'r1',reviewer_user_id:'u',quality_state:'USABLE',direction:'SUPPORTS',rationale:'a',review_status:'ACTIVE'},
 {id:'r2',reviewer_user_id:'u',quality_state:'USABLE',direction:'SUPPORTS',rationale:'b',review_status:'ACTIVE'}
]));
assert.equal(projectEvidenceLedger([raw('x','D2','PARENT')],[]).length,1);

const result=routeEvidence([ev('a','D2','STUDENT_SELF'),ev('b','D2','PARENT','USABLE','CONTRADICTS'),ev('c','D3','STUDENT_SELF')]);
assert.equal(result.total_score,null);
assert.equal(result.normative_label,null);
assert.equal(result.human_review_required,true);
assert.equal(result.next_evidence_priority[0],'D2');
assert.equal(result.routes.find(x=>x.route_code==='D2').evidence_state,'DISCREPANT');
assert.equal(result.routes.find(x=>x.route_code==='D3').evidence_state,'SINGLE_SOURCE');
assert.throws(()=>classifyDomain('D7',[]));
console.log('Golden Talent engine tests passed');

import {buildScientificContinuitySnapshot,auditBaharTimeline} from './scientific-continuity-readiness.mjs';
const privacyPreflight=buildScientificContinuitySnapshot({rcas_submission:{
 session_id:'ci-session',instrument_version:'rcas-1',
 responses:[{item_code:'A1',value:3},{item_code:'access1',value:'محدود'}]
}});
assert.equal(privacyPreflight.total_score,null);
assert.equal(privacyPreflight.release_authorized,false);
assert.equal(privacyPreflight.rcas.descriptive_event_count,2);
assert.equal(privacyPreflight.privacy.backend_consent_verification_required,true);
assert.equal(privacyPreflight.golden_talent.balanced_accounting,true);
assert.equal(JSON.stringify(privacyPreflight).includes('ci-session'),false);
assert.ok(auditBaharTimeline([{week_start:'2026-02-30',status:'OPEN',observed_evidence:[]}])
 .issue_codes.includes('INVALID_WEEK_DATE'));
