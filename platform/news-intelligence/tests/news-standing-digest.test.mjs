import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNewsPreferences,selectDigestCandidates} from '../newsletter.mjs';

const now='2026-10-25T08:30:00Z';
const account='owner-reader-1';
const consent={accountId:account,purpose:'ARTICLES',granted:true,
  withdrawn:false,consentId:'c-1'};
const preferences=normalizeNewsPreferences({
  accountId:account,language:'fa',topics:['EXAMINATIONS','UNIVERSITIES'],
  digestModes:['DAILY','URGENT','WEEKLY','EXAM_ONLY'],
  consentRecord:consent,verifiedEmail:true,updatedAt:now
});
const standing={
  standingOfficialPublicationVerified:true,
  originalCmsReceiptVerified:true,
  standingPolicyId:'12345678-1234-4234-9234-123456789abc',
  standingPolicyDigest:'a'.repeat(64),
  publisherReceiptVerified:true,publicationState:'PUBLISHED',
  publicUrl:'https://drjavadrezazadeh.com/fa/akhbar/sanjesh-registration/',
  publishedAt:'2026-10-25T08:05:00Z',priority:'P0',
  topic:'EXAMINATIONS',headlines:{fa:'ثبت‌نام رسمی آزمون',en:'Official exam registration'}
};
test('original ARTICLES consent is used for News topics; withdrawn consent fails closed',()=>{
  assert.equal(preferences.originalEcoPurpose,'ARTICLES');
  assert.throws(()=>normalizeNewsPreferences({
    accountId:account,language:'fa',topics:['EXAMINATIONS'],digestModes:['DAILY'],
    consentRecord:{...consent,purpose:'NEWSLETTER'},verifiedEmail:true,updatedAt:now
  }),/NEWS_NEWSLETTER_CONSENT_INVALID/);
  assert.throws(()=>normalizeNewsPreferences({
    accountId:account,language:'fa',topics:['EXAMINATIONS'],digestModes:['DAILY'],
    consentRecord:{...consent,withdrawn:true},verifiedEmail:true,updatedAt:now
  }),/NEWS_NEWSLETTER_CONSENT_INVALID/);
});
test('original standing-policy official publication is selected, without per-story owner approval',()=>{
  const plan=selectDigestCandidates({preferences,articles:[standing],mode:'URGENT',nowUtc:now});
  assert.equal(plan.items.length,1);
  assert.equal(plan.items[0].url,standing.publicUrl);
  assert.equal(plan.smtpDelivered,false);
  assert.equal(plan.lastMomentEcoArticlesConsentRecheckRequired,true);
});
test('unknown, forged, unpublished, future and unrelated-domain news never enter a digest',()=>{
  const candidates=[
    {...standing,publicUrl:'https://drjavadrezazadeh.com.evil.test/fa/akhbar/fake/'},
    {...standing,originalCmsReceiptVerified:false},
    {...standing,publisherReceiptVerified:false},
    {...standing,publicationState:'WAITING_FOR_PUBLISHER'},
    {...standing,standingPolicyDigest:'invalid'},
    {...standing,publishedAt:'2026-10-25T09:05:00Z'},
    {...standing,topic:'SPORTS'},
    {...standing,publicUrl:'https://drjavadrezazadeh.com/fa/app/admin/'}
  ];
  const plan=selectDigestCandidates({preferences,articles:candidates,mode:'DAILY',nowUtc:now});
  assert.deepEqual(plan.items,[]);
});
test('prior individually approved, authenticated published articles remain eligible',()=>{
  const manuallyApproved={
    ...standing,standingOfficialPublicationVerified:false,
    ownerApproved:true,
    publicUrl:'https://drjavadrezazadeh.com/en/news-insights/official-results/',
    headlines:{fa:'نتایج رسمی',en:'Official results'}
  };
  const plan=selectDigestCandidates({preferences,articles:[manuallyApproved],
    mode:'DAILY',nowUtc:now});
  assert.equal(plan.items.length,1);
});


import {planOwnerEditorialBatchAlert} from '../notifications.mjs';
test('owner notification requires original signed uncertain evidence; urgency alone is not review',()=>{
  const digest='b'.repeat(64);
  const valid={
    evidenceExceptions:[{digest,issueCode:'CLAIMS_UNVERIFIED_OR_CONTRADICTED',
      underlyingEvidenceVerified:true}],
    originalEvidenceDesk:{source:'ORIGINAL_JREI_VERIFIED_EXCEPTION_DESK',
      signedCurrentReview:true},
    ownerId:account,nowUtc:now,secureAdminRoute:'/fa/app/admin/'
  };
  assert.throws(()=>planOwnerEditorialBatchAlert({
    ...valid,evidenceExceptions:[{digest,issueCode:'P0_URGENT_OFFICIAL',
      underlyingEvidenceVerified:true}]
  }),/NEWS_OWNER_EDITORIAL_BATCH_INVALID/);
  assert.throws(()=>planOwnerEditorialBatchAlert({
    ...valid,evidenceExceptions:[{digest,issueCode:'CMS_OFFLINE',
      underlyingEvidenceVerified:true}]
  }),/NEWS_OWNER_EDITORIAL_BATCH_INVALID/);
  assert.throws(()=>planOwnerEditorialBatchAlert({
    ...valid,originalEvidenceDesk:{
      source:'BROWSER_CLAIMED_SOURCE',signedCurrentReview:true}
  }),/NEWS_OWNER_EDITORIAL_BATCH_INVALID/);
  const planned=planOwnerEditorialBatchAlert(valid);
  assert.equal(planned.exceptionCount,1);
  assert.equal(planned.requiresIndividualOwnerApprovalForVerifiedOfficialNews,false);
  assert.equal(planned.publicPublicationAuthorizedByNotification,false);
});
