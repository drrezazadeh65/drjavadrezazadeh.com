import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrustedAdmissionContext} from '../platform/jr-konkur-trust-boundary-v2.mjs';
const scorecard={year:1405,examinationGroup:'MATHEMATICS',rank:100,rankVerified:true,officialVerificationEvidence:true,rankSourceVerified:true};
const offering={id:'12345',year:1405,sourceFileId:'abc',page:1,reviewState:'APPROVED',sourcePageReviewed:true,conditionsReviewed:true,documentApproved:true,requirements:[]};
const rule={year:1405,admissionTrack:'EXAM',reviewState:'APPROVED',sourceVerified:true,version:'v1'};
test('self-reported attestation cannot forge official rank',()=>{
 const x=buildTrustedAdmissionContext({scorecard,trustedCatalogue:[offering],trustedRules:[rule]});
 assert.equal(x.candidate.rankSourceVerified,false);assert.equal(x.rankAcceptedAsOfficial,false);assert.equal(x.admissionProbability,null);
});
test('incomplete source approval is rejected',()=>{
 const x=buildTrustedAdmissionContext({scorecard,trustedCatalogue:[{...offering,sourcePageReviewed:false}],trustedRules:[rule]});
 assert.equal(x.offerings.length,0);assert.ok(x.issues.includes('UNVERIFIED_OFFERING'));
});
test('unapproved rule is rejected',()=>{
 const x=buildTrustedAdmissionContext({scorecard,trustedCatalogue:[offering],trustedRules:[{...rule,sourceVerified:false}]});
 assert.equal(x.rules.length,0);assert.ok(x.issues.includes('UNVERIFIED_RULE'));
});
test('oversized catalogue is rejected',()=>{
 const x=buildTrustedAdmissionContext({scorecard,trustedCatalogue:Array(501).fill(offering),trustedRules:[]});
 assert.equal(x.status,'REJECTED');
});
