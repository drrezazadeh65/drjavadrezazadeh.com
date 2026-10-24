import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from '../contracts.mjs';
import {prepareExactNewsPublisherArtifacts} from '../news-publication-artifacts.mjs';
const faPath='/fa/akhbar/official-university-admissions-cba987012345/';
const enPath='/en/news-insights/official-university-admissions-cba987012345/';
const evidenceSha256=sha256('original signed article body');
const sourceUrl='https://university.example.edu/news/official-admissions';
const fa={
  language:'fa',headline:'اعلام رسمی آغاز ثبت نام جدید دانشگاه',
  description:'اطلاعیه معتبر دانشگاه درباره مراحل و شرایط ثبت نام آزمون جدید دانشگاهی منتشر شده است.',
  summary:'دانشگاه اعلام کرد که جزئیات ثبت نام و دستورالعمل مراجعه به منبع رسمی منتشر شده است.',
  body:'این متن آموزشی مراحل بررسی اطلاعیه و منبع رسمی دانشگاه را توضیح می‌دهد. <script>alert(1)</script>',
  nextSteps:'قبل از اقدام، آخرین اطلاعیه معتبر دانشگاه را بررسی کنید.',
  sourceUrl
};
const en={
  language:'en',headline:'Official university admissions registration announcement',
  description:'The university has issued a verified registration announcement outlining the current admissions requirements and official guidance.',
  summary:'The institution has published information about the official admissions process, required records, and the issuing authority.',
  body:'The original university statement describes how applicants can verify the official admission timetable and check eligibility without relying on unverified third-party claims.',
  nextSteps:'Confirm the newest official university notice before making any decision.',
  sourceUrl
};
const persisted={
  schema:'jr.jrei.news-owner-editorial-payload.v1',
  fa,en,
  candidateId:'22222222-2222-4222-8222-222222222222',
  reviewId:'11111111-1111-4111-8111-111111111111',
  evidenceSha256,
  imageAssetReference:'assets/images/news/official-university.webp',
  routeProposal:{schema:'jr.jrei.news-bilingual-proposed-routes.v1',
    faPath,enPath,slug:'official-university-admissions-cba987012345'},
  internalLinks:[]
};
const json=JSON.stringify(persisted);
const digest=sha256(json);
const plan={schema:'jr.jrei.news-publication-plan.v1',
  approvalDigest:digest,languagePaths:{fa:faPath,en:enPath}};
const owner={
  source:'ORIGINAL_AUTHENTICATED_CMS',ownerMfaDecisionVerified:true,
  currentSourceEvidenceVerified:true,licensedMediaVerified:true,
  publicReleaseActivated:true};
const source={source:'ORIGINAL_JREI_REVIEWED_SOURCE',current:true,
  republicationRightsCurrent:true,issuerName:'Official University Authority',
  evidenceSha256,sourceUrl,priority:'P0'};
const media={source:'ORIGINAL_SITE_MEDIA_REGISTRY',rightsReviewed:true,
  assetReference:'assets/images/news/official-university.webp',
  provenance:'ORIGINAL_DESIGN',altFa:'تصویر رسمی دانشگاه',
  altEn:'Original educational university illustration'};
const at='2026-10-24T09:00:00Z';
const args={
  exactPersistedEditorialJson:json,publicationPlan:plan,
  publisherAuthority:owner,verifiedSource:source,verifiedMedia:media,
  intendedPublicationAt:at,modifiedAt:at,
  existingPublicFilesystemPaths:[]
};
test('verified CMS bundle creates two immutable, source-only, search-ready pages',()=>{
  const out=prepareExactNewsPublisherArtifacts(args);
  assert.equal(out.filesystemWritesPerformed,0);
  assert.equal(out.requiresAuthenticOriginalCmsReceipt,true);
  assert.equal(out.fa.canonical,'https://drjavadrezazadeh.com'+faPath);
  assert.equal(out.en.canonical,'https://drjavadrezazadeh.com'+enPath);
  assert.equal(out.fa.sha256,sha256(out.fa.utf8Content));
  assert.equal(out.en.sha256,sha256(out.en.utf8Content));
  assert.match(out.fa.utf8Content,/<html lang="fa" dir="rtl">/);
  assert.match(out.en.utf8Content,/<html lang="en" dir="ltr">/);
  assert.match(out.fa.utf8Content,/<link rel="alternate" hreflang="en"/);
  assert.match(out.en.utf8Content,/<link rel="alternate" hreflang="fa"/);
  assert.match(out.en.utf8Content,/en\/news-insights\//);
  assert.match(out.fa.utf8Content,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(out.fa.utf8Content,/<script>alert\(1\)<\/script>/);
  assert.match(out.en.utf8Content,/"@type":"NewsArticle"/);
  assert.equal(out.en.currentlyPublic,false);
});
test('tampered persisted editorial requires fresh owner approval',()=>{
  assert.throws(()=>prepareExactNewsPublisherArtifacts({
    ...args,exactPersistedEditorialJson:json.replace(
      'Official university admissions','Altered university admissions')
  }),/NEWS_STATIC_ARTIFACT_APPROVAL_INVALID/);
});
test('missing media rights and collisions fail closed before any writes',()=>{
  assert.throws(()=>prepareExactNewsPublisherArtifacts({
    ...args,verifiedMedia:{...media,rightsReviewed:false}
  }),/NEWS_STATIC_ARTIFACT_APPROVAL_INVALID/);
  assert.throws(()=>prepareExactNewsPublisherArtifacts({
    ...args,existingPublicFilesystemPaths:[enPath.slice(1)+'index.html']
  }),/NEWS_ARTIFACT_EXISTING_PUBLIC_PATH_COLLISION/);
});
