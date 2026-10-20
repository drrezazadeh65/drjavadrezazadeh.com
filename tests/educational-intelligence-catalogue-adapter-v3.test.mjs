import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptOfficialCatalogueResponse as adapt} from '../platform/educational-intelligence-catalogue-adapter-v3.mjs';
const row={year:1405,programmeCode:'01234',programme:'SYNTHETIC PROGRAMME',university:'SYNTHETIC UNIVERSITY',
  city:'SYNTHETIC CITY',capacity:20,sourceDocument:'FAKE-CI-PDF',sourceRevision:1,sourcePdfPage:12,
  eligibilityStatus:'NOT_ASSESSED',officialRegistration:false};
const response={ok:true,year:1405,status:'SOURCE_REVIEWED_CATALOGUE',sourceVerification:'HUMAN_REVIEWED',
  records:[row],admissionProbabilityEnabled:false,eligibilityAssessment:'NOT_PERFORMED',
  officialApplicationSubmitted:false};

test('adapter returns only reviewed catalogue facts with conservative labels',()=>{
  const r=adapt(response);
  assert.equal(r.status,'SOURCE_REVIEWED_CATALOGUE');
  assert.equal(r.items[0].programmeCode,'01234');
  assert.equal(r.items[0].evidence.pdfPage,12);
  assert.equal(r.items[0].probability,null);
  assert.equal(r.officialApplication,false);
});
test('missing or unapproved catalogues remain unavailable',()=>{
  for (const status of ['OFFICIAL_CATALOGUE_NOT_READY','NO_SOURCE_APPROVED_RECORDS'])
    assert.equal(adapt({...response,status,records:[]}).status,'UNAVAILABLE');
  assert.equal(adapt({...response,sourceVerification:'PENDING'}).status,'UNAVAILABLE');
});
test('malformed or partially approved source rows fail the entire batch closed',()=>{
  assert.equal(adapt({...response,records:[row,{...row,sourcePdfPage:null}]}).reason,'ROW_PROVENANCE_OR_SCHEMA_INVALID');
  assert.equal(adapt({...response,records:[{...row,programmeCode:'1234'}]}).status,'UNAVAILABLE');
  assert.equal(adapt({...response,records:Array(51).fill(row)}).reason,'UNBOUNDED_OR_EMPTY_RESULT');
  assert.equal(adapt({...response,admissionProbabilityEnabled:true}).reason,'INVALID_SERVER_CONTRACT');
  assert.equal(adapt({...response,eligibilityAssessment:'PERFORMED'}).status,'UNAVAILABLE');
});
test('no spoofed official registration or year mismatch',()=>{
  assert.equal(adapt({...response,records:[{...row,officialRegistration:true}]}).status,'UNAVAILABLE');
  assert.equal(adapt(response,{year:1406}).reason,'INVALID_SERVER_CONTRACT');
});
