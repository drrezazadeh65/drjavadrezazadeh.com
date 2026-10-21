import test from 'node:test';
import assert from 'node:assert/strict';
import {composeSourceCitedCatalogueFacts as compose} from '../platform/educational-intelligence-evidence-answer-v3.mjs';
import {PUBLIC_CATALOGUE_TOOL} from '../platform/educational-intelligence-public-tool-v3.mjs';
const call=(arguments_={year:1405,group:'HUMANITIES',page:1,limit:2})=>({tool:PUBLIC_CATALOGUE_TOOL,arguments:arguments_});
const row=Object.freeze({year:1405,examinationGroup:'HUMANITIES',programmeCode:'01234',
  programme:'رشته آزمایشی',university:'دانشگاه مصنوعی',city:'تهران',capacity:20,
  sourceDocument:'SYNTHETIC-TEST-PDF',sourceRevision:2,sourcePdfPage:37,
  eligibilityStatus:'NOT_ASSESSED',officialRegistration:false});
const response=(extra={})=>({ok:true,year:1405,status:'SOURCE_REVIEWED_CATALOGUE',
  sourceVerification:'HUMAN_REVIEWED',records:[row],limit:2,page:1,
  admissionProbabilityEnabled:false,eligibilityAssessment:'NOT_PERFORMED',
  officialApplicationSubmitted:false,...extra});

test('Persian evidence packet preserves leading zero, source version, PDF page and caution',()=>{
  const result=compose(call(),response());
  assert.equal(result.status,'SOURCE_CITED_FACTS_ONLY');
  assert.equal(result.facts[0].programmeCode,'01234');
  assert.deepEqual([result.facts[0].source.document,result.facts[0].source.revision,result.facts[0].source.pdfPage],
    ['SYNTHETIC-TEST-PDF',2,37]);
  assert.match(result.facts[0].citationText,/صفحه PDF 37/);
  assert.match(result.notice,/احتمال قبولی/);
  assert.equal(Object.isFrozen(result.facts),true);
  assert.equal(Object.isFrozen(result.facts[0].source),true);
});
test('English packet uses English evidence labels but unchanged source identifiers',()=>{
  const result=compose(call(),response(),{locale:'en'});
  assert.equal(result.locale,'en');
  assert.match(result.facts[0].citationText,/PDF page 37/);
  assert.equal(result.facts[0].programmeCode,'01234');
});
test('unsupported locale is denied rather than silently switching language',()=>{
  assert.equal(compose(call(),response(),{locale:'ar'}).reason,'UNSUPPORTED_LOCALE');
});
test('catalogue has no prediction, submission, recommendation or individual eligibility',()=>{
  const result=compose(call(),response());
  assert.equal(result.recommendationsGenerated,false);
  assert.equal(result.admissionProbabilityAvailable,false);
  assert.equal(result.individualEligibilityAssessed,false);
  assert.equal(result.officialSubmission,false);
  assert.equal(result.modelMayOverride,false);
  assert.equal(result.facts[0].admissionProbability,null);
  assert.equal(result.facts[0].isRankedRecommendation,false);
});
test('a missing or unapproved source cannot generate a positive fact packet',()=>{
  for(const payload of [null,response({status:'NO_SOURCE_APPROVED_RECORDS',records:[]}),
    response({sourceVerification:'PENDING'}),response({records:[{...row,sourcePdfPage:0}]})])
    assert.equal(compose(call(),payload).status,'UNAVAILABLE');
});
test('query-bound request cannot accept a response from another group or page',()=>{
  assert.equal(compose(call(),response({page:2})).status,'UNAVAILABLE');
  assert.equal(compose(call(),response({records:[{...row,examinationGroup:'MATHEMATICS'}]})).status,'UNAVAILABLE');
});
test('the tool call must be explicitly allowlisted and public',()=>{
  assert.equal(compose({tool:'ADMISSION_PROBABILITY',arguments:{year:1405}},response()).status,'UNAVAILABLE');
  assert.equal(compose(call({year:1405,studentId:'private'}),response()).status,'UNAVAILABLE');
});
test('risk-bearing backend prediction claim fails closed',()=>{
  assert.equal(compose(call(),response({admissionProbabilityEnabled:true})).status,'UNAVAILABLE');
});
test('strictly reject HTML-like or bidi control text rather than laundering it into a citation',()=>{
  for(const programme of ['<script>alert(1)</script>','رشته\u202eآزمایشی', 'رشته\u200fآزمایشی', 'رشته\nآزمایشی'])
    assert.equal(compose(call(),response({records:[{...row,programme}]})).reason,'UNSAFE_OR_UNCITED_CATALOGUE_ITEM');
});
test('reject overlong city and unsafe source identifier',()=>{
  assert.equal(compose(call(),response({records:[{...row,city:'x'.repeat(141)}]})).reason,'UNSAFE_OR_UNCITED_CATALOGUE_ITEM');
  assert.equal(compose(call(),response({records:[{...row,sourceDocument:'<img>'}]})).reason,'UNSAFE_OR_UNCITED_CATALOGUE_ITEM');
});
test('null city and capacity retain their semantics rather than inventing zero',()=>{
  const result=compose(call(),response({records:[{...row,city:null,capacity:null}]}));
  assert.equal(result.status,'SOURCE_CITED_FACTS_ONLY');
  assert.equal(result.facts[0].city,null);
  assert.equal(result.facts[0].statedCapacity,null);
});
test('raw model input, URL query and private student fields are not echoed',()=>{
  const result=compose(call({year:1405,q:'حقوق',limit:2,page:1}),response());
  assert.equal(result.status,'SOURCE_CITED_FACTS_ONLY');
  assert.equal('query' in result,false);
  assert.equal('relativeUrl' in result,false);
  assert.equal('records' in result,false);
  assert.equal(JSON.stringify(result).includes('studentId'),false);
});
test('untrusted model text cannot override the structured citation',()=>{
  const result=compose(call(),response({admissionVerdict:'GUARANTEED',modelSummary:'100% acceptance'}));
  assert.equal(result.status,'SOURCE_CITED_FACTS_ONLY');
  assert.equal(JSON.stringify(result).includes('GUARANTEED'),false);
  assert.equal(JSON.stringify(result).includes('100%'),false);
});
