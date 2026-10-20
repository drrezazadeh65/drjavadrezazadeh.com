import test from 'node:test';
import assert from 'node:assert/strict';
import {officialAdmissionSources1405 as manifest,normalizePersianDigits,normalizeProgrammeCode,candidateFiveDigitTokens,auditProposedProgramme,auditCandidateRows} from '../platform/konkur-1405-intake.mjs';
const proposal={year:1405,code:'۰۱۲۳۴',sourceFileId:'1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2',page:100,
 university:'Synthetic institution',programme:'Synthetic course',examinationGroup:'MATHEMATICS',admissionMethod:'EXAM',capacity:10};
test('Sanjesh source registry is six-file intake, not approved publication',()=>{
 assert.equal(manifest.sources.length,6);
 assert.equal(new Set(manifest.sources.map(x=>x.fileId)).size,6);
 assert.ok(manifest.sources.every(x=>x.activeForEligibility===false&&x.sha256===null&&x.pdfPageCount===null));
 assert.equal(manifest.publicationPolicy.admissionProbabilityEnabled,false);
});
test('Persian/Arabic digits retain leading zero and bare five-digit sequences are NOT identified as programmes',()=>{
 assert.equal(normalizePersianDigits('۰١۲۳٤'),'01234');
 assert.equal(normalizeProgrammeCode(' ۰۰۱۲۳ '),'00123');
 assert.equal(normalizeProgrammeCode('1234'),null);
 assert.throws(()=>normalizeProgrammeCode(12345),TypeError);
 const result=candidateFiveDigitTokens('دفتر ۰۱۲۳۴, شناسه 56789 و تلفن 56789');
 assert.deepEqual(result.tokens.map(t=>t.token),['01234','56789']);
 assert.equal(result.programmeRecordsVerified,0);
 assert.ok(result.tokens.every(x=>x.page===null&&x.verification==='NEEDS_PDF_TABLE_REVIEW'));
});
test('a plausible source page is still not independently reviewed and remains unpublished',()=>{
 const r=auditProposedProgramme(proposal);
 assert.equal(r.code,'01234');
 assert.equal(r.sourcePageVerified,false);
 assert.equal(r.eligibleForPublicCatalog,false);
 assert.equal(r.issues.length,0);
 assert.equal(auditProposedProgramme({...proposal,code:'1234'}).issues.includes('INVALID_FIVE_DIGIT_PROGRAMME_CODE'),true);
 assert.equal(auditProposedProgramme({...proposal,year:1406}).issues.includes('WRONG_ADMISSION_CYCLE'),true);
});
test('duplicate proposals, missing provenance and invalid capacity are reported without promotion',()=>{
 const r=auditCandidateRows([proposal,{...proposal,capacity:12},{...proposal,code:'۱۲۳۴۵',capacity:-1,page:null}]);
 assert.equal(r.publishedCount,0);
 assert.equal(r.duplicates.length,1);
 assert.equal(r.invalid.length,1);
 assert.equal(r.automaticActivation,false);
});
