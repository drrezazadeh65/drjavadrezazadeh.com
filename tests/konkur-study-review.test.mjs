import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {generateStudyReview,minutesAllowed}=require('../assets/js/jr-konkur-study-review-v1.js');
const exam=(date,provider='MAZ')=>({date,provider,group:'MATHEMATICS',grade:'12',
 subject:'Physics',percent:25,additionalSubjects:[{subject:'Chemistry',percent:-12.5}]});
test('only the latest dated exam supplies a transparent self-directed review checklist',()=>{
 const r=generateStudyReview([exam('1405/09/10'),{...exam('1405/10/10'),subject:'Mathematics',percent:80,additionalSubjects:[]}],25);
 assert.equal(r.status,'DESCRIPTIVE_REVIEW_READY');
 assert.equal(r.exam.date,'1405/10/10');
 assert.equal(r.subjects.length,1);
 assert.equal(r.subjects[0].subject,'Mathematics');
 assert.equal(r.subjects[0].reviewMinutes,25);
 assert.equal(r.modelPredictionEnabled,false);
 assert.equal(r.admissionProbability,null);
 assert.equal(r.officialRank,null);
 assert.ok(Object.isFrozen(r));
 assert.ok(Object.isFrozen(r.subjects));
 assert.ok(Object.isFrozen(r.subjects[0].steps));
});
test('multiple subjects and negative-marked percentages stay descriptive',()=>{
 const r=generateStudyReview([exam('1405/10/01')],40);
 assert.deepEqual(r.subjects.map(x=>x.subject),['Physics','Chemistry']);
 assert.deepEqual(r.subjects.map(x=>x.selfReportedPercent),[25,-12.5]);
 assert.deepEqual(minutesAllowed,[15,25,40]);
 assert.equal(r.comparability,'SINGLE_REPORTED_EXAM_ONLY');
});
test('incomplete, invalid and latest-without-metrics inputs do not fabricate a plan',()=>{
 for(const exams of [[],null,[{...exam('1405/10/10'),subject:'',percent:null,additionalSubjects:[]}],
  [{...exam('1405/10/10'),percent:101,additionalSubjects:[]}],
  [exam('1405/13/01')],Array(41).fill(exam('1405/10/01'))]){
  const r=generateStudyReview(exams);
  assert.equal(r.status,'INSUFFICIENT_INFORMATION');
  assert.equal(r.admissionProbability,null);
  assert.deepEqual(r.subjects,[]);
 }
 assert.equal(generateStudyReview([exam('1405/10/01')],20).status,'INSUFFICIENT_INFORMATION');
});
test('defensive deduplication never performs score-based ranking across providers',()=>{
 const r=generateStudyReview([exam('1405/10/01','GAJ'),{...exam('1405/10/02'),additionalSubjects:[{subject:'Physics',percent:55},{subject:'Biology',percent:17}]}]);
 assert.deepEqual(r.subjects.map(x=>x.subject),['Physics','Biology']);
 assert.equal(r.exam.provider,'MAZ');
 assert.equal(r.dataClass,'SELF_REPORTED_UNVERIFIED');
});
