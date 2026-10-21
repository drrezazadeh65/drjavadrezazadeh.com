import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCandidateScorecard,scorecardToReasonerCandidate,toAsciiDigits} from '../platform/konkur-scorecard-normalizer.mjs';
test('Persian and Arabic numerals are normalized',()=>assert.equal(toAsciiDigits('۱۴۰۵ / ١٢٣'),'1405 / 123'));
test('Kanoon mock data remains unverified for official admission',()=>{
 const x=normalizeCandidateScorecard({provider:'KANOON',year:'۱۴۰۵',examinationGroup:'MATHEMATICS',subjects:[{subjectCode:'MATH',percent:73.5}],rank:123});
 assert.equal(x.valid,true);assert.equal(x.rankSourceVerified,false);assert.equal(x.admissionProbability,null);
 assert.equal(scorecardToReasonerCandidate(x).rankSourceVerified,false);
});
test('unverified rank cannot be presented as Sanjesh-verified',()=>{
 const x=normalizeCandidateScorecard({provider:'SANJESH',year:1405,examinationGroup:'HUMANITIES',subjects:[],rank:100,rankVerified:true});
 assert.equal(x.valid,false);assert.ok(x.issues.includes('MISSING_OFFICIAL_RANK_EVIDENCE'));
});
test('rejects fabricated official attestation and out-of-range marks',()=>{
 const x=normalizeCandidateScorecard({provider:'GAJ',year:1405,examinationGroup:'EXPERIMENTAL',subjects:[{subjectCode:'BIO',percent:120}],rankVerified:true});
 assert.equal(x.valid,false);assert.ok(x.issues.includes('INVALID_SUBJECT_PERCENT'));
 assert.ok(x.issues.includes('UNSUPPORTED_OFFICIAL_RANK_ATTESTATION'));
});
test('official evidence requires explicit attestation and preserves no personal identifiers',()=>{
 const x=normalizeCandidateScorecard({provider:'SANJESH',year:1405,examinationGroup:'ARTS',subjects:[],rank:17,rankVerified:true,officialVerificationEvidence:true,nationalId:'PRIVATE'});
 assert.equal(x.valid,true);assert.equal(x.rankSourceVerified,false);assert.equal(x.personalIdentifiersStored,false);
 assert.equal('nationalId' in x,false);
});

test('MAZ practice scorecards are accepted for descriptive intake, never as official rank',()=>{
 const x=normalizeCandidateScorecard({provider:'MAZ',year:'۱۴۰۵',examinationGroup:'EXPERIMENTAL',subjects:[{subjectCode:'BIO',percent:62}],rank:420});
 assert.equal(x.valid,true);assert.equal(x.provider,'MAZ');
 assert.equal(x.rankSourceVerified,false);assert.equal(x.admissionProbability,null);
 assert.equal(scorecardToReasonerCandidate(x).rankSourceVerified,false);
 const forged=normalizeCandidateScorecard({provider:'MAZ',year:1405,examinationGroup:'EXPERIMENTAL',subjects:[],rank:420,rankVerified:true,officialVerificationEvidence:true});
 assert.equal(forged.valid,false);
 assert.ok(forged.issues.includes('UNSUPPORTED_OFFICIAL_RANK_ATTESTATION'));
});
