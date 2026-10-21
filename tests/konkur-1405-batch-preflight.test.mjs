import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareKonkurBatch} from '../platform/konkur-1405-batch-preflight.mjs';
const row={year:1405,code:'۰۱۲۳۴',sourceFileId:'1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2',page:100,university:'Synthetic university',programme:'Synthetic programme',examinationGroup:'MATHEMATICS',admissionMethod:'EXAM',capacity:10};
test('batch intake never approves, publishes or predicts',()=>{
 const r=prepareKonkurBatch([row]);
 assert.equal(r.acceptedForReview.length,1);
 assert.equal(r.rejected.length,0);
 assert.equal(r.databaseWrites,0);
 assert.equal(r.publicOfferingsCreated,0);
 assert.equal(r.probabilityEstimates,0);
 assert.equal(r.automaticActivation,false);
});
test('Persian and Latin duplicates are both quarantined',()=>{
 const r=prepareKonkurBatch([row,{...row,code:'01234'}]);
 assert.equal(r.acceptedForReview.length,1);
 assert.equal(r.rejected.length,1);
 assert.ok(r.rejected[0].issues.includes('DUPLICATE_INPUT_CODE'));
});
test('invalid capacity and missing source page are rejected',()=>{
 const r=prepareKonkurBatch([{...row,capacity:-1,page:0}]);
 assert.equal(r.acceptedForReview.length,0);
 assert.equal(r.rejected.length,1);
 assert.ok(r.rejected[0].issues.includes('INVALID_CAPACITY'));
 assert.ok(r.rejected[0].issues.includes('MISSING_OR_INVALID_PAGE'));
});
test('rejects malformed or oversized inputs',()=>{
 assert.throws(()=>prepareKonkurBatch({}),TypeError);
 assert.throws(()=>prepareKonkurBatch(Array.from({length:20001},()=>row)),TypeError);
});
