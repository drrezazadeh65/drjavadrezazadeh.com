import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPublicCatalogueExchange as review} from '../platform/educational-intelligence-public-exchange-v3.mjs';
import {PUBLIC_CATALOGUE_TOOL} from '../platform/educational-intelligence-public-tool-v3.mjs';

const request = (args={year:1405,group:'HUMANITIES',limit:2,page:1}) =>
  ({tool:PUBLIC_CATALOGUE_TOOL,arguments:args});
const row = Object.freeze({year:1405,examinationGroup:'HUMANITIES',
  programmeCode:'01234',programme:'SYNTHETIC PROGRAMME',university:'SYNTHETIC UNIVERSITY',
  city:'SYNTHETIC CITY',capacity:20,sourceDocument:'FAKE-CI-PDF',
  sourceRevision:1,sourcePdfPage:12,eligibilityStatus:'NOT_ASSESSED',
  officialRegistration:false});
const response = (extra={}) => ({ok:true,year:1405,status:'SOURCE_REVIEWED_CATALOGUE',
  sourceVerification:'HUMAN_REVIEWED',records:[row],limit:2,page:1,
  admissionProbabilityEnabled:false,eligibilityAssessment:'NOT_PERFORMED',
  officialApplicationSubmitted:false,...extra});

test('matching reviewed response produces a bounded, non-predictive fact list',()=>{
  const result=review(request(),response());
  assert.equal(result.status,'SOURCE_REVIEWED_CATALOGUE');
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].evidence.pdfPage,12);
  assert.equal(result.items[0].probability,null);
  assert.equal(result.modelMayOverride,false);
  assert.equal(result.officialApplication,false);
  assert.equal(Object.isFrozen(result.items),true);
});
test('unknown and private tools never reach the response adapter',()=>{
  for(const tool of ['ADMISSION_PROBABILITY','WRITE_STUDENT_PROFILE'])
    assert.equal(review({tool,arguments:{year:1405}},response()).reason,'PUBLIC_TOOL_CALL_REJECTED');
});
test('malformed search and private-looking identifiers fail closed',()=>{
  assert.equal(review(request({year:1405,q:'۰۹۱۲۳۴۵۶۷۸۹'}),response()).reason,'PUBLIC_TOOL_CALL_REJECTED');
  assert.equal(review(request({year:1405,studentId:'123'}),response()).status,'UNAVAILABLE');
});
test('invalid backend response shape is unavailable',()=>{
  for(const value of [null,[],undefined,'not json'])
    assert.equal(review(request(),value).reason,'INVALID_CATALOGUE_RESPONSE');
});
test('response cannot be reused for another requested admission cycle',()=>{
  assert.equal(review(request({year:1406,limit:2,page:1}),response()).status,'UNAVAILABLE');
});
test('PHP pagination echo must match the compiled request',()=>{
  assert.equal(review(request(),response({page:2})).reason,'RESPONSE_PAGINATION_MISMATCH');
  assert.equal(review(request(),response({limit:50})).reason,'RESPONSE_PAGINATION_MISMATCH');
  assert.equal(review(request(),response({page:undefined})).status,'UNAVAILABLE');
});
test('backend may not return more records than the requested limit',()=>{
  assert.equal(review(request({year:1405,limit:1,page:1}),response({limit:1,records:[row,row]})).reason,
    'RESPONSE_EXCEEDS_REQUESTED_LIMIT');
});
test('requested examination group must agree with every returned record',()=>{
  assert.equal(review(request(),response({records:[{...row,examinationGroup:'EXPERIMENTAL'}]})).reason,
    'RESPONSE_EXAMINATION_GROUP_MISMATCH');
  assert.equal(review(request(),response({records:[{...row,examinationGroup:null}]})).status,'UNAVAILABLE');
});
test('reviewed catalogue without group filter may return any reviewed group',()=>{
  const result=review(request({year:1405,limit:2,page:1}),response({records:[{...row,examinationGroup:'EXPERIMENTAL'}]}));
  assert.equal(result.status,'SOURCE_REVIEWED_CATALOGUE');
});
test('unreviewed or unavailable responses cannot surface records',()=>{
  const pending=response({status:'NO_SOURCE_APPROVED_RECORDS',records:[]});
  assert.equal(review(request(),pending).status,'UNAVAILABLE');
  assert.equal(review(request(),response({status:'PENDING'})).reason,'NON_REVIEWED_RECORDS_PRESENT');
  assert.equal(review(request(),response({sourceVerification:'PENDING'})).status,'UNAVAILABLE');
});
test('malformed evidence and admission prediction claims fail closed',()=>{
  assert.equal(review(request(),response({records:[{...row,sourcePdfPage:null}]})).status,'UNAVAILABLE');
  assert.equal(review(request(),response({admissionProbabilityEnabled:true})).status,'UNAVAILABLE');
  assert.equal(review(request(),response({officialApplicationSubmitted:true})).status,'UNAVAILABLE');
});
test('the exchange does not retain or echo search text or raw backend payload',()=>{
  const result=review(request({year:1405,limit:2,page:1,q:'حقوق'}),response());
  assert.equal(result.status,'SOURCE_REVIEWED_CATALOGUE');
  assert.equal('relativeUrl' in result,false);
  assert.equal('query' in result,false);
  assert.equal('records' in result,false);
});
