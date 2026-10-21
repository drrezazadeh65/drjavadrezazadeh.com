import test from 'node:test';
import assert from 'node:assert/strict';
import {analyseKonkurChoices} from '../platform/konkur-analysis-pipeline.mjs';
const scorecard={provider:'KANOON',year:'۱۴۰۵',examinationGroup:'MATHEMATICS',subjects:[],rank:300};
const offering={year:1405,admissionTrack:'EXAM',examinationGroup:'MATHEMATICS',reviewState:'APPROVED',sourcePageReviewed:true,conditionsReviewed:true,documentApproved:true,requirements:[]};
const rule={year:1405,admissionTrack:'EXAM',reviewState:'APPROVED',version:'1',sourceVerified:true};
test('mock scores cannot establish official rank even with reviewed offerings',()=>{
 const r=analyseKonkurChoices({scorecard,offerings:[offering],rules:[rule]});
 assert.equal(r.status,'ANALYSIS_COMPLETE');
 assert.equal(r.counts.insufficientEvidence,1);
 assert.equal(r.results[0].eligible,null);
 assert.ok(r.results[0].issues.includes('RANK_SOURCE_UNVERIFIED'));
 assert.equal(r.admissionProbability,null);
});
test('no approved catalogue returns clear empty-state response',()=>{
 const r=analyseKonkurChoices({scorecard});
 assert.equal(r.status,'AWAITING_VERIFIED_CATALOGUE');
 assert.deepEqual(r.results,[]);
});
test('malformed scores stop before the reasoner',()=>{
 const r=analyseKonkurChoices({scorecard:{...scorecard,subjects:[{subjectCode:'MATH',percent:900}]},offerings:[offering],rules:[rule]});
 assert.equal(r.status,'INVALID_SCORECARD');
 assert.equal(r.results.length,0);
 assert.ok(r.issues.includes('INVALID_SUBJECT_PERCENT'));
});
test('verified official scorecard still never generates fabricated odds',()=>{
 const r=analyseKonkurChoices({scorecard:{...scorecard,provider:'SANJESH',rankVerified:true,officialVerificationEvidence:true},offerings:[offering],rules:[rule]});
 assert.equal(r.results[0].status,'INSUFFICIENT_EVIDENCE');
 assert.equal(r.results[0].admissionProbability,null);
 assert.equal(r.publicReady,false);
});
