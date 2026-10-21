import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePublicCatalogueToolCall as compile, PUBLIC_CATALOGUE_TOOL} from '../platform/educational-intelligence-public-tool-v3.mjs';
const call=(args={year:1405},extra={})=>({tool:PUBLIC_CATALOGUE_TOOL,arguments:args,...extra});

test('valid public catalogue lookup compiles to the existing read-only PHP endpoint',()=>{
  const r=compile(call({year:1405,group:'HUMANITIES',q:'حقوق',limit:15,page:2}));
  assert.equal(r.status,'READY_FOR_PUBLIC_READ');
  assert.equal(r.method,'GET');
  const url=new URL(r.relativeUrl,'https://example.invalid');
  assert.equal(url.pathname,'/api/konkur/programmes');
  assert.equal(url.searchParams.get('q'),'حقوق');
  assert.equal(url.searchParams.get('group'),'HUMANITIES');
  assert.equal(url.searchParams.get('page'),'2');
  assert.equal(r.privateLearnerDataPermitted,false);
  assert.equal(r.requiresTrustedBackendResponse,true);
});
test('defaults match the PHP catalogue contract and do not imply approved records',()=>{
  const r=compile(call());
  assert.equal(r.status,'READY_FOR_PUBLIC_READ');
  assert.match(r.relativeUrl,/limit=20&page=1/);
  assert.equal(r.admissionPredictionEnabled,false);
  assert.equal(r.modelMayOverride,false);
});
test('unknown, private, predictive and mutating tools fail closed',()=>{
  for(const tool of ['DETERMINISTIC_ELIGIBILITY_ENGINE','PROVIDER_NATIVE_TREND_ANALYSIS',
    'ADMISSION_PROBABILITY','WRITE_STUDENT_PROFILE','PUBLIC_EDUCATIONAL_GUIDANCE']) {
    assert.equal(compile({tool,arguments:{year:1405}}).reason,'TOOL_NOT_PUBLICLY_ALLOWLISTED');
  }
});
test('rejects extra tool-envelope and argument fields rather than ignoring them',()=>{
  assert.equal(compile(call({year:1405,studentId:'private'})).reason,'INVALID_TOOL_ARGUMENT_SCHEMA');
  assert.equal(compile(call({year:1405},{modelOverride:true})).reason,'INVALID_TOOL_ENVELOPE');
  assert.equal(compile(call({year:1405,admissionProbability:0.99})).status,'BLOCKED');
});
test('invalid year and provider-group syntax are denied',()=>{
  for(const year of [1405.5,'1405',1299,1500,null])
    assert.equal(compile(call({year})).reason,'INVALID_ADMISSION_YEAR');
  for(const group of ['humanities','HUMANITIES;DROP', '', 'A'])
    assert.equal(compile(call({year:1405,group})).reason,'INVALID_EXAMINATION_GROUP');
});
test('pagination enforces the exact PHP limits and offset bound',()=>{
  for(const limit of [0,51,1.5,'20'])
    assert.equal(compile(call({year:1405,limit})).reason,'INVALID_LIMIT');
  for(const page of [0,1000,'2'])
    assert.equal(compile(call({year:1405,page})).reason,'INVALID_PAGE');
  assert.equal(compile(call({year:1405,limit:50,page:102})).reason,'PAGE_OUT_OF_RANGE');
  assert.equal(compile(call({year:1405,limit:50,page:101})).status,'READY_FOR_PUBLIC_READ');
});
test('rejects URL-unfit searches and obvious personal identifiers',()=>{
  for(const q of ['x'.repeat(81),'test@example.org','https://example.org','09123456789',
    'آزمون\nاطلاعات','www.example.org'])
    assert.equal(compile(call({year:1405,q})).reason,'SEARCH_NOT_SUITABLE_FOR_PUBLIC_URL');
  assert.equal(compile(call({year:1405,q:2})).reason,'INVALID_SEARCH');
});
test('does not execute network calls or expose query results',()=>{
  const r=compile(call({year:1405,q:'مهندسی'}));
  assert.equal(r.status,'READY_FOR_PUBLIC_READ');
  assert.equal('items' in r,false);
  assert.equal('eligibility' in r,false);
  assert.equal(Object.isFrozen(r),true);
});
test('non-plain objects and missing arguments are denied',()=>{
  for(const invalid of [null,[],{},Object.create(null),{tool:PUBLIC_CATALOGUE_TOOL}])
    assert.equal(compile(invalid).status,'BLOCKED');
});

test('Persian and Arabic numerals do not evade the public URL identifier screen',()=>{
  for(const q of ['۰۹۱۲۳۴۵۶۷۸۹','٠٩١٢٣٤٥٦٧٨٩','۰۰۱۲۳۴۵۶۷۸','۱۲۳۴۵۶۷۸۹۰'])
    assert.equal(compile(call({year:1405,q})).reason,'SEARCH_NOT_SUITABLE_FOR_PUBLIC_URL');
  assert.equal(compile(call({year:1405,q:'حقوق'})).status,'READY_FOR_PUBLIC_READ');
});
