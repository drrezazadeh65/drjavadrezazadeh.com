import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const f=require('../assets/js/jr-konkur-official-scorecard-v1.js');
test('self-reported official-scorecard fields validate Persian and Arabic digits without calculating admissions',()=>{
 const r=f.inspect({year:'۱۴۰۵',group:'MATHEMATICS',rankQuota:'۱۲۳۴',rankCountry:'٢٣٤٥',examScore:'۸۲۰۰٫۵',
  schoolScore:'۷۵۰۰',finalScore:'۸۰۰۰',grade11:'۱۸٫۵',grade12:'۱۷',quotaLabel:'منطقه ۲',
  eligibilityDeclaration:'SELF_REPORTED_YES'});
 assert.equal(r.valid,true);
 assert.equal(r.report.rankQuota,1234);
 assert.equal(r.report.rankCountry,2345);
 assert.equal(r.report.grade11,18.5);
 assert.equal(r.report.examScore,8200.5);
 assert.equal(r.officialVerification,'NOT_PERFORMED');
 assert.equal(r.eligibilityStatus,'NOT_ASSESSED');
 assert.equal(r.rankConversionEnabled,false);
 assert.equal(r.officialScoreFormulaApplied,false);
 assert.equal(r.admissionProbabilityEnabled,false);
});
test('reject implausible ranks, out-of-range grades, arbitrary strings, and unknown years',()=>{
 const good={year:'1405',group:'ARTS',rankQuota:'123'};
 for(const edit of [{rankQuota:'12.4'},{rankQuota:'0'},{rankQuota:'-1'},{rankQuota:'1e4'},
   {grade11:'21'},{grade12:'-0.2'},{examScore:'1e4'},{quotaLabel:'<script>'},
   {eligibilityDeclaration:'VERIFIED'},{year:'1407'},{group:'SOMETHING'}]){
  assert.equal(f.inspect({...good,...edit}).valid,false,JSON.stringify(edit));
 }
 assert.equal(f.inspect({...good,rankQuota:''}).valid,false);
});
test('1406 prospective cycle stays provisional, not fabricated as a published scorecard',()=>{
 const r=f.inspect({year:'1406',group:'HUMANITIES',grade12:'18.2'});
 assert.equal(r.valid,true);
 assert.equal(r.schemaReview,'PROVISIONAL_FIELD_FAMILIES_NOT_YEAR_SPECIFIC');
 assert.equal(r.officialVerification,'NOT_PERFORMED');
});
test('never accepts identity/upload fields into validated report or mixes with mock TAZ',()=>{
 const r=f.inspect({year:'1405',group:'HUMANITIES',rankQuota:'42',nationalId:'1234567890',
  studentName:'Example',mockTaz:'9300',password:'secret'});
 assert.equal(r.valid,true);
 assert.deepEqual(Object.keys(r.report).sort(),['group','rankQuota','year'].sort());
});
