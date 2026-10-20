import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JR_EI_VERSION, INTENTS, inspectOfficialSource,
  planEducationalRequest, compareMockObservations
} from '../platform/educational-intelligence-v3.mjs';

const src={year:1405,authority:'SANJESH',documentId:'guides/humanities',revision:2,
  pdfPage:24,pdfSha256:'a'.repeat(64),documentReviewState:'QA_APPROVED',
  pageReviewState:'REVIEWED',reviewerApproved:true,superseded:false};
const req=(intent,extra={})=>({intent,year:1405,...extra});
const point=(eventCode,examDate,value,extra={})=>({
  providerCode:'GHALAMCHI',examGroup:'HUMANITIES',gradeCode:'12',
  metricCode:'SUBJECT_PERCENT',scaleCode:'PERCENT',scaleVersion:'2026a',
  populationCode:'EXAM_PARTICIPANTS',subjectCode:'LITERATURE',
  comparabilityReviewed:true,eventCode,examDate,value,...extra
});

test('source provenance is metadata-only, rejects invalid pages, hashes and supersession',()=>{
  assert.equal(inspectOfficialSource(src,1405).usable,true);
  assert.equal(inspectOfficialSource(src,1405).evidenceLevel,'REVIEW_METADATA_COMPLETE');
  assert.equal(inspectOfficialSource({...src,pdfSha256:null},1405).usable,false);
  assert.equal(inspectOfficialSource({...src,superseded:true},1405).usable,false);
  assert.equal(inspectOfficialSource({...src,pdfPage:0},1405).usable,false);
  assert.equal(inspectOfficialSource(src,1406).usable,false);
});

test('unknown requests and malformed source lists fail closed',()=>{
  assert.equal(planEducationalRequest(null).status,'BLOCKED');
  assert.deepEqual(planEducationalRequest(req('FREE_FORM')).reasonCodes,['UNKNOWN_INTENT']);
  assert.equal(planEducationalRequest(req(INTENTS.GUIDANCE,{officialSources:[null]})).status,'READY_FOR_CONTROLLED_TOOL');
  assert.equal(planEducationalRequest(req(INTENTS.GUIDANCE,{officialSources:Array(101).fill(src)})).status,'BLOCKED');
});

test('learner private access requires ownership+consent and guardian review for minors',()=>{
  const sensitive={privateDataRequested:true,authenticated:true,consentForThisPurpose:true,isMinor:true};
  assert.deepEqual(planEducationalRequest(req(INTENTS.STUDY,{learner:sensitive})).reasonCodes,['GUARDIAN_AUTHORIZATION_REQUIRED']);
  assert.deepEqual(planEducationalRequest(req(INTENTS.STUDY,{learner:{...sensitive,authenticated:false}})).reasonCodes,['PRIVATE_LEARNER_ACCESS_NOT_AUTHORIZED']);
  assert.equal(planEducationalRequest(req(INTENTS.STUDY,{learner:{...sensitive,guardianAuthorized:true}})).status,'READY_FOR_CONTROLLED_TOOL');
});

test('official catalogue and eligibility strictly separate source and rule coverage',()=>{
  assert.deepEqual(planEducationalRequest(req(INTENTS.CATALOGUE)).reasonCodes,['SOURCE_REVIEW_REQUIRED']);
  assert.equal(planEducationalRequest(req(INTENTS.CATALOGUE,{officialSources:[src]})).tool,'SOURCE_REVIEWED_CATALOGUE_QUERY');
  assert.deepEqual(planEducationalRequest(req(INTENTS.ELIGIBILITY,{officialSources:[src]})).reasonCodes,['COMPLETE_OFFICIAL_RULE_COVERAGE_NOT_ESTABLISHED']);
  assert.equal(planEducationalRequest(req(INTENTS.ELIGIBILITY,{officialSources:[src],ruleCoverage:{year:1405,status:'VERIFIED_COMPLETE',serverReviewed:true,ruleSetVersion:'rules-1405-v1'}})).tool,'DETERMINISTIC_ELIGIBILITY_ENGINE');
  assert.equal(planEducationalRequest(req(INTENTS.ELIGIBILITY,{officialSources:[src],ruleCoverage:{year:1404,status:'VERIFIED_COMPLETE',serverReviewed:true,ruleSetVersion:'x'}})).status,'BLOCKED');
});

test('probability remains disabled irrespective of client-supplied approval',()=>{
  const result=planEducationalRequest(req(INTENTS.PROBABILITY,{
    officialSources:[src],modelValidated:true,ruleCoverage:{status:'VERIFIED_COMPLETE'},
  }));
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.predictionEnabled,false);
  assert.equal(result.modelMayOverride,false);
});

test('trend compares reviewed-compatible exam measures only',()=>{
  const a=point('E1','1405/08/01',58),b=point('E2','1405/08/15',65);
  const result=compareMockObservations([a,b]);
  assert.equal(result.status,'DESCRIPTIVE_COMPARISON_ONLY');
  assert.equal(result.delta,7);
  assert.equal(result.predictionEnabled,false);
  assert.equal(result.version,JR_EI_VERSION);
  assert.deepEqual(compareMockObservations([a,{...b,providerCode:'GAJ'}]).reasonCodes,['INCOMPARABLE_PROVIDER_OR_METRIC_CONTEXT']);
  assert.deepEqual(compareMockObservations([a,{...b,scaleVersion:'2026b'}]).reasonCodes,['INCOMPARABLE_PROVIDER_OR_METRIC_CONTEXT']);
  assert.deepEqual(compareMockObservations([a,{...b,comparabilityReviewed:false}]).reasonCodes,['CROSS_EVENT_COMPARABILITY_NOT_REVIEWED']);
  assert.deepEqual(compareMockObservations([a,{...b,value:101}]).reasonCodes,['PERCENT_OUT_OF_RANGE']);
  assert.deepEqual(compareMockObservations([a,{...b,examDate:'1405/07/01'}]).reasonCodes,['CHRONOLOGY_NOT_VALID']);
});

test('different rank number is descriptive, never framed as certain learning gain',()=>{
  const a=point('E1','1405/08/01',1000,{metricCode:'RANK',scaleCode:'RANK'});
  const b=point('E2','1405/08/15',900,{metricCode:'RANK',scaleCode:'RANK'});
  const result=compareMockObservations([a,b]);
  assert.equal(result.interpretation,'LOWER_RANK_NUMBER');
  assert.match(result.note,/does not establish/);
});
