import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildMockExamCsv,schema}=require('../assets/js/jr-konkur-mock-export-v1.js');
const exam={date:'1405/08/01',provider:'MAZ',group:'MATHEMATICS',grade:'12',rankScope:'CITY',
 taz:6000,rank:123,subject:'Math',percent:-12.5,
 additionalSubjects:[{subject:'Physics',percent:70}]};
test('one exam with multiple subjects becomes portable rows without rank conversion',()=>{
 const out=buildMockExamCsv([exam]);
 assert.equal(out.schema,schema);assert.equal(out.records,1);assert.equal(out.rows,2);
 assert.equal(out.csv.charCodeAt(0),0xfeff);
 assert.equal(out.csv.trim().split('\r\n').length,3);
 assert.equal((out.csv.match(/SELF_REPORTED_UNVERIFIED/g)||[]).length,2);
 assert.match(out.csv,/"-12.5"/);
 assert.match(out.csv,/"6000"/);
 assert.match(out.csv,/Math/);
 assert.match(out.csv,/Physics/);
 assert.doesNotMatch(out.csv,/admission_probability/i);
 assert.deepEqual(Object.keys(out).sort(),['csv','filename','mimeType','records','rows','schema','warning'].sort());
});
test('untrusted user text is quoted and neutralizes spreadsheet formula injection',()=>{
 const hostile=buildMockExamCsv([{...exam,provider:'\t=2+3',subject:' =HYPERLINK("https://evil.invalid")',
  additionalSubjects:[{subject:'@SUM(2,3)',percent:4}]}]);
 assert.ok(hostile.csv.includes("' =HYPERLINK"));
 assert.ok(hostile.csv.includes("''")===false);
 assert.ok(hostile.csv.includes("'@SUM(2,3)"));
 assert.ok(hostile.csv.includes('""https://evil.invalid""'));
 assert.ok(hostile.csv.includes("' =2+3"));
 assert.doesNotMatch(hostile.csv,/[\r\n][=+@]/);
});
test('export remains bounded and refuses malformed rows',()=>{
 for(const entries of [[],Array(41).fill(exam),[null],[{...exam,additionalSubjects:Array(13).fill({subject:'X',percent:2})}],
  [{...exam,additionalSubjects:[{subject:'X',percent:Infinity}]}]]){
  assert.throws(()=>buildMockExamCsv(entries),TypeError);
 }
});
test('missing subject does not fabricate a percentage and no personal identifiers are exported',()=>{
 const out=buildMockExamCsv([{...exam,subject:'',percent:null,additionalSubjects:[],studentName:'DO_NOT_EXPORT',phone:'DO_NOT_EXPORT'}]);
 assert.equal(out.rows,1);
 assert.doesNotMatch(out.csv,/DO_NOT_EXPORT|studentName|phone/);
 assert.match(out.csv,/SELF_REPORTED_UNVERIFIED/);
});
