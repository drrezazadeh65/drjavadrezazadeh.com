import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAdmissionChoice,evaluateAdmissionChoices} from '../platform/konkur-admission-reasoner.mjs';
const candidate={examYear:1405,examinationGroup:'MATHEMATICS',rank:1200,rankSourceVerified:true};
const offering={year:1405,admissionTrack:'EXAM',examinationGroup:'MATHEMATICS',reviewState:'APPROVED',sourcePageReviewed:true,conditionsReviewed:true,documentApproved:true,requirements:[{code:'LOCALITY',status:'MET'}]};
const rule={year:1405,admissionTrack:'EXAM',reviewState:'APPROVED',version:'1405.1',sourceVerified:true};
test('unreviewed offering cannot generate eligibility or probability',()=>{
 const x=evaluateAdmissionChoice({candidate,offering:{...offering,sourcePageReviewed:false},rule});
 assert.equal(x.status,'INSUFFICIENT_EVIDENCE');assert.equal(x.eligible,null);assert.equal(x.admissionProbability,null);
});
test('verified requirements permit conditional decision support, never admission odds',()=>{
 const x=evaluateAdmissionChoice({candidate,offering,rule});
 assert.equal(x.status,'REQUIREMENTS_SATISFIED');assert.equal(x.eligible,true);assert.equal(x.admissionProbability,null);assert.equal(x.rank,null);
});
test('verified unmet requirement blocks eligibility without fabricated probability',()=>{
 const x=evaluateAdmissionChoice({candidate,offering:{...offering,requirements:[{code:'LOCALITY',status:'NOT_MET'}]},rule});
 assert.equal(x.eligible,false);assert.equal(x.status,'REQUIREMENTS_NOT_SATISFIED');
});
test('unknown requirements and unverified rank fail closed',()=>{
 const x=evaluateAdmissionChoice({candidate:{...candidate,rankSourceVerified:false},offering:{...offering,requirements:[{code:'QUOTA',status:'UNKNOWN'}]},rule});
 assert.equal(x.eligible,null);assert.ok(x.issues.includes('RANK_SOURCE_UNVERIFIED'));assert.ok(x.issues.includes('UNRESOLVED_REQUIREMENT:QUOTA'));
});
test('batch is bounded and never persists personal data',()=>{
 const x=evaluateAdmissionChoices({candidate,offerings:[offering],rules:[rule]});
 assert.equal(x.results.length,1);assert.equal(x.personalDataPersisted,false);assert.equal(x.probabilityModelTrained,false);
 assert.throws(()=>evaluateAdmissionChoices({candidate,offerings:Array(501).fill(offering),rules:[rule]}),TypeError);
});
