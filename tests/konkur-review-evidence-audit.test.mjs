import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {audit1405HumanReviewClaims} from '../platform/konkur-review-evidence-audit.mjs';
const m=JSON.parse(fs.readFileSync('platform/konkur-1405-sources.json','utf8'));
const f=m.sources[0];
const claim=(page=1)=>({sourceKey:f.key,pdfPage:page,sourceSha256:f.sha256,
 reviewers:[
  {reviewerRef:'REVIEWER_001',decision:'APPROVE',reviewedOn:'2026-10-22'},
  {reviewerRef:'REVIEWER_002',decision:'APPROVE',reviewedOn:'2026-10-22'}
 ],tableCompared:true,amendmentsChecked:true});
test('all 2412 pages start without independent human acceptance and with 3 coverage gaps',()=>{
 const a=audit1405HumanReviewClaims(m);
 assert.equal(a.totalPages,2412);
 assert.equal(a.claimEntries,0);
 assert.equal(a.approvedProgrammeRecords,0);
 assert.equal(a.officialProgrammePublicationAllowed,false);
 assert.equal(a.independentlyAuthenticatedReviews,0);
 assert.equal(a.unresolvedGuideCategories.length,3);
 assert.equal(a.databaseWrites,0);
});
test('two unverified review signoff claims do not authenticate PDF truth',()=>{
 const x=audit1405HumanReviewClaims(m,[claim(1),claim(2)]);
 assert.equal(x.structurallyConsistentClaims,2);
 assert.equal(x.independentlyAuthenticatedReviews,0);
 assert.equal(x.officialProgrammePublicationAllowed,false);
 assert.equal(JSON.stringify(x).includes('REVIEWER_001'),false);
});
test('forged page, duplicate, unexpected private fields or wrong hash rejected',()=>{
 for(const claims of [[claim(),claim()],[{...claim(),pdfPage:90000}],
  [{...claim(),sourceSha256:'e'.repeat(64)}],[{...claim(),studentId:'secret'}]])
  assert.throws(()=>audit1405HumanReviewClaims(m,claims),TypeError);
 const same={...claim(),reviewers:[claim().reviewers[0],claim().reviewers[0]]};
 const result=audit1405HumanReviewClaims(m,[same]);
 assert.equal(result.invalidClaims,1);
 assert.equal(result.structurallyConsistentClaims,0);
 assert.equal(result.officialProgrammePublicationAllowed,false);
});
