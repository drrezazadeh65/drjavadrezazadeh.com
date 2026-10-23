// Source-only regression suite. DO NOT RUN until the single final acceptance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareReviewedRetrieval,tokenizePublicEducation} from
  '../platform/jrei-v5/jrei-reviewed-retrieval-evaluator.mjs';
import {normalizeRetrievalPolicy} from '../platform/jrei-v5/jrei-learning-loop.mjs';
import {createHash} from 'node:crypto';

const policies={
  current:normalizeRetrievalPolicy({k1:1.5,b:0.75,maxEvidence:8}),
  candidate:normalizeRetrievalPolicy({k1:1.4,b:0.7,maxEvidence:10})
};
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const source=(id,excerpt)=>({
  id,claimKey:'official.'+id,excerpt,label:'OFFICIAL_FACT',
  provenance:{sourceId:'sanjesh-public-review',contentSha256:'a'.repeat(64),
    reviewStatus:'OFFICIAL_APPROVED',publicationPermission:'ALLOWED',
    superseded:false,retrievedAt:'2026-10-23T00:00:00Z'}
});
const docs=[
  source('ev-1','آزمون سراسری آموزش زبان سال ۱۴۰۵، دفترچه رسمی'),
  source('ev-2','Public approved programme evidence for 2026'),
];
const cases=[
  {id:'q1',query:'آموزش زبان سال 1405',locale:'fa',expectedEvidenceIds:['ev-1']},
  {id:'q2',query:'programme evidence 2026',locale:'en',expectedEvidenceIds:['ev-2']}
];
const evalOnce=(patch={})=>compareReviewedRetrieval({
  reviewedEvidence:docs,heldOutCases:cases,
  currentPolicy:policies.current,candidatePolicy:policies.candidate,
  independentSourceReview:true,
  controls:{learningEnabled:true,killSwitch:false,autoPromoteLowRisk:false},
  expectedRunDay:'2026-10-23',
  expectedActivePolicySha256:sha(policies.current),...patch
});
test('Persian and Arabic letter/digit normalization is deterministic',()=>{
  assert.deepEqual(tokenizePublicEducation('آزمون‌كی ۱۴۰۵'),['آزمون','کی','1405']);
});
test('small, authentic heldout samples cannot trigger unattended promotion',()=>{
  const result=evalOnce();
  assert.equal(result.caseCount,2);
  assert.equal(result.modelTrained,false);
  assert.equal(result.learningPublished,false);
  assert.equal(result.publicReady,false);
  assert.equal(result.decision,'BLOCKED');
});
test('nonreviewed or revoked evidence cannot be used for learning',()=>{
  assert.throws(()=>evalOnce({reviewedEvidence:[{
    ...docs[0],provenance:{...docs[0].provenance,reviewStatus:'UNREVIEWED'}
  }]}),/EVIDENCE_PROVENANCE_NOT_APPROVED/);
});
test('private learner identifiers cannot enter heldout corpus',()=>{
  assert.throws(()=>evalOnce({heldOutCases:[{
    id:'q-private',query:'My email user@example.org',locale:'en',
    expectedEvidenceIds:['ev-2']
  }]}),/REVIEWED_HOLDOUT_INVALID/);
});
test('only independent source-reviewed fixtures may be ranked',()=>{
  assert.throws(()=>evalOnce({independentSourceReview:false}),
    /INDEPENDENT_SOURCE_REVIEW_REQUIRED/);
});

test('no candidate can be published without measured Windows latency',()=>{
  const result=evalOnce();
  assert.equal(result.measuredWorkerLatency,false);
  assert.equal(result.latencyEvidenceRequired,true);
  assert.equal(result.eligibleToPropose,false);
  assert.equal(result.decision,'BLOCKED');
  assert.equal(result.reason,'MEASURED_WORKER_LATENCY_REQUIRED');
  assert.equal(result.proposal.canPublish,false);
});
test('two identical candidate policies are never presented as learned',()=>{
  const result=evalOnce({candidatePolicy:policies.current});
  assert.equal(result.modelTrained,false);
  assert.equal(result.learningPublished,false);
  assert.equal(result.proposal.canPublish,false);
});
