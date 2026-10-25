import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNewsSource,stageNewsCandidate,sha256,prepareEditorialPreview,
  decideEditorialApproval} from '../contracts.mjs';
import {proposeImmutableBilingualNewsRoutes} from '../slug-routes.mjs';
import {planIranNightNewsWindow} from '../scheduler-integration.mjs';
import {planBalancedNewsDesk} from '../editorial-coverage-planner.mjs';
import {decideOfficialNewsRoute,planOfficialNewsHandoffs} from '../official-publication-policy.mjs';
import {ownerApprovedExamCalendarEvent} from '../calendar-authority.mjs';

const sha=sha256('official reviewed article');
const observed='2026-10-24T05:00:00Z';
const source=Object.freeze({
  sourceId:'source-official',sourceName:'Approved University Authority',
  canonicalUrl:'https://university.example.edu/news/',
  trustClass:'OFFICIAL',usageRights:'METADATA_ONLY',
  language:'mixed',reviewStatus:'APPROVED',reviewedBy:'admin-owner',
  robotsPermission:'ALLOWED',termsPermission:'ALLOWED',
  pollIntervalMinutes:60
});
const candidate=stageNewsCandidate({
  approvedSource:source,sourceUrl:'https://university.example.edu/news/notice-1',
  title:'Verified admissions announcement',observedAt:observed,
  evidenceSha256:sha,eventType:'REGISTRATION_OPENED',
  category:'universities',topics:['admission']
});

test('approved news source, category and evidence create a private candidate',()=>{
  assert.equal(normalizeNewsSource(source).usageRights,'METADATA_ONLY');
  assert.equal(candidate.schema,'jr.jrei.news-candidate.v1');
  assert.equal(candidate.priority,'P0');
  assert.equal(candidate.publicVisible,false);
  assert.equal(candidate.category,'universities');
  assert.throws(()=>stageNewsCandidate({
    approvedSource:source,sourceUrl:'http://127.0.0.1/private',
    title:'Forbidden mirror',observedAt:observed,
    evidenceSha256:sha,eventType:'REGISTRATION_OPENED'
  }));
});
test('unverified author approval cannot dispatch or publish',()=>{
  const entry={language:'fa',headline:'ثبت نام آزمون دانشگاه در اطلاعیه رسمی',
    summary:'اعلامیه رسمی دانشگاه درباره زمان ثبت نام و مدارک مورد نیاز.',
    body:'این متن توضیح مرحله به مرحله درباره ثبت نام و منابع رسمی آن است.',
    nextSteps:'لطفاً اطلاعیه رسمی دانشگاه را مطالعه کنید.',
    sourceUrl:candidate.sourceUrl};
  const en={language:'en',headline:'University registration is now officially open',
    summary:'The institution published an official notice with the current application period.',
    body:'This article explains the official application steps and where to verify the institutional deadline.',
    nextSteps:'Review the original official announcement before acting.',
    sourceUrl:candidate.sourceUrl};
  const draft=prepareEditorialPreview({
    candidate,verification:{sourceRegistryRead:true,evidenceReviewed:true,
      issuerVerified:true,sourceStillCurrent:true,evidenceSha256:sha,
      reviewerId:'reviewer-1',reviewedAt:observed},fa:entry,en,
    image:{provenance:'ORIGINAL_DESIGN',rightsReviewed:true,
      isDocumentaryPhoto:false,assetReference:'/assets/images/news/notice.webp',
      altFa:'تصویر مفهومی دانشگاه',altEn:'University concept illustration'},
    internalLinks:[]
  });
  assert.equal(draft.publicVisible,false);
  assert.throws(()=>decideEditorialApproval({preview:draft,
    ownerAction:{action:'APPROVE',ownerId:'owner-1',
      approvalDigest:draft.approvalDigest,actionAt:observed},
    serverAuthorization:{ownerSessionVerified:true,mfaVerified:false,
      csrfVerified:true,currentSourceVerified:true,
      storedPreviewDigest:draft.approvalDigest,authorizedOwnerId:'owner-1'}
  }),/NEWS_OWNER_AUTHORIZATION_REQUIRED/);
  const review=decideEditorialApproval({preview:draft,
    ownerAction:{action:'APPROVE',ownerId:'owner-1',
      approvalDigest:draft.approvalDigest,actionAt:observed},
    serverAuthorization:{ownerSessionVerified:true,mfaVerified:true,
      csrfVerified:true,currentSourceVerified:true,
      storedPreviewDigest:draft.approvalDigest,authorizedOwnerId:'owner-1'}
  });
  assert.equal(review.published,false);
  assert.equal(review.canDispatch,true);
});
test('propose stable bilingual routes without changing frozen URLs',()=>{
  const p=proposeImmutableBilingualNewsRoutes({
    headlineEn:'International English teacher examination',
    candidateFingerprint:candidate.fingerprint,
    existingCanonicalRoutes:[],
    originalPublicRouteRegistry:{
      source:'EXISTING_SITE_IMMUTABLE_URL_REGISTRY',
      completeCurrentSnapshot:true}
  });
  assert.ok(p.faPath.startsWith('/fa/akhbar/'));
  assert.ok(p.enPath.startsWith('/en/news-insights/'));
  assert.equal(p.dnsOrPublicPageChanged,false);
  assert.throws(()=>proposeImmutableBilingualNewsRoutes({
    headlineEn:'International English teacher examination',
    candidateFingerprint:candidate.fingerprint,
    existingCanonicalRoutes:[p.enPath],
    originalPublicRouteRegistry:{
      source:'EXISTING_SITE_IMMUTABLE_URL_REGISTRY',
      completeCurrentSnapshot:true}
  }),/NEWS_STABLE_SLUG_ALREADY_IN_USE/);
});
test('night quota never bypasses current rights and approved window',()=>{
  const budget={source:'ORIGINAL_JREI_QUOTA_CONTROLLER',
    bytesRemainingToday:300000000000,bytesReservedToday:0};
  const policy={source:'ORIGINAL_JREI_APPROVED_SOURCE_REGISTRY',
    acquisitionAuthorized:true,robotsAndTermsCurrent:true,
    maxObjectBytes:2000000};
  const night=planIranNightNewsWindow({
    atUtc:'2026-10-23T23:30:00Z',originalJreiBudget:budget,
    sourcePolicy:policy});
  assert.equal(night.insideNightWindow,true);
  assert.equal(night.eligibleToRequestOriginalJreiLease,true);
  assert.equal(night.actualBytesTransferred,0);
  const daytime=planIranNightNewsWindow({
    atUtc:'2026-10-24T07:30:00Z',originalJreiBudget:budget,
    sourcePolicy:policy});
  assert.equal(daytime.eligibleToRequestOriginalJreiLease,false);
  const unsignedUrgent=planIranNightNewsWindow({
    atUtc:'2026-10-24T07:30:00Z',originalJreiBudget:budget,
    sourcePolicy:policy,workClass:'URGENT_NEWS_RECHECK'});
  assert.equal(unsignedUrgent.eligibleToRequestOriginalJreiLease,false);
});
test('news desk prioritizes verified P0 without auto publishing',()=>{
  const planned=planBalancedNewsDesk({
    candidates:[candidate],nowUtc:'2026-10-24T06:00:00Z',
    alreadySelectedToday:[],
    ownerLimits:{regularDailyDraftGoal:3,urgentMaxReviewAlerts:5},
    officialSourceStates:{
      [candidate.sourceId]:{issuerVerified:true,sourceStillCurrent:true,
        usageRightsCurrent:true,evidenceSha256:sha}}
  });
  assert.equal(planned.urgentCount,1);
  assert.equal(planned.actualPublicArticleCount,0);
  assert.equal(planned.noAutoPublishing,true);
});
test('calendar approvals bind exact source hash and revision',()=>{
  const event={schema:'jr.jrei.exam-event.v1',eventId:'exam-milestone-1',
    status:'OFFICIAL_DATE_REVIEWED',evidenceSha256:sha,
    startsAt:'2026-11-10T08:00:00Z',version:1};
  const decision={source:'EXISTING_OWNER_MFA_AUDIT',
    accountOwnerVerified:true,ownerMfaCurrent:true,
    action:'APPROVE_EXAM_MILESTONE',eventId:event.eventId,
    eventVersion:1,evidenceSha256:sha,withdrawn:false};
  const sourceState={source:'EXISTING_JREI_SOURCE_REGISTRY',
    issuerVerified:true,currentEvidenceSha256:sha,rightsCurrent:true};
  const r=ownerApprovedExamCalendarEvent({
    event,ownerDecision:decision,originalSourceState:sourceState,
    nowUtc:'2026-10-24T06:00:00Z'});
  assert.equal(r.ownerPublicationApproved,true);
  assert.throws(()=>ownerApprovedExamCalendarEvent({
    event:{...event,version:2},ownerDecision:decision,
    originalSourceState:sourceState,nowUtc:'2026-10-24T06:00:00Z'
  }),/NEWS_CALENDAR_OWNER_APPROVAL_OR_SOURCE_INVALID/);
});

test('no arbitrary daily limit on verified official candidate selection',()=>{
  const many=Array.from({length:35},(_,n)=>({
    ...candidate,fingerprint:sha256('news-day-'+n),
    priority:n%3===0?'P0':'P2'
  }));
  const plan=planBalancedNewsDesk({candidates:many,
    nowUtc:'2026-10-24T06:00:00Z',
    ownerLimits:{regularDailyDraftGoal:1,urgentMaxReviewAlerts:1},
    officialSourceStates:{
      [candidate.sourceId]:{issuerVerified:true,sourceStillCurrent:true,
        usageRightsCurrent:true,evidenceSha256:sha}}
  });
  assert.equal(plan.regularDraftCount+plan.urgentCount,35);
  assert.equal(plan.unlimitedDailyEditorialSelection,true);
  assert.equal(plan.actualPublicArticleCount,0);
});
test('only explicitly verified official notices get automatic handoff eligibility',()=>{
  const base={candidate:{evidenceSha256:sha},
    source:{source:'ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY',
      registryState:'AUTHORITATIVE_REVIEWED',
      issuerIdentityVerified:true,notRevoked:true,
      exactSourceUrlApproved:true,rightsForPublicNews:true,
      termsAndRobotsCurrent:true},
    evidence:{source:'ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE',
      currentIssuerEvidence:true,verifiedContentSha256:sha,
      claimsMatchPrimaryNotice:true,noMaterialContradictions:true},
    editorial:{source:'ORIGINAL_JREI_EDITORIAL_QA',
      bilingualComplete:true,authorVoiceQualityPassed:true,
      newsGuidanceComplete:true,internalLinksChecked:true,
      seoAndCanonicalChecked:true,imageRightsCurrent:true,
      assistantContextGrounded:true},
    publisher:{source:'ORIGINAL_AUTHENTICATED_CMS_POLICY',
      originalCmsConnected:true,exactRoutesCollisionFree:true,
      authenticatedPublishReceiptSupported:true}
  };
  const decision=decideOfficialNewsRoute(base);
  assert.equal(decision.decision,'ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF');
  assert.equal(decision.humanPerArticleApprovalRequired,false);
  assert.equal(decision.published,false);
  assert.equal(decision.dailyStoryQuota,null);
  const suspicious=decideOfficialNewsRoute({...base,
    evidence:{...base.evidence,noMaterialContradictions:false}});
  assert.equal(suspicious.decision,'OWNER_EXCEPTION_QUEUE');
  assert.equal(suspicious.humanPerArticleApprovalRequired,true);
  const noRights=decideOfficialNewsRoute({...base,
    source:{...base.source,rightsForPublicNews:false}});
  assert.equal(noRights.decision,'OWNER_EXCEPTION_QUEUE');
  const noCms=decideOfficialNewsRoute({...base,
    publisher:{...base.publisher,originalCmsConnected:false}});
  assert.equal(noCms.published,false);
  assert.equal(noCms.decision,'SYSTEM_HOLD');
  assert.equal(noCms.humanPerArticleApprovalRequired,false);
});

test('many verified official stories are routed without an arbitrary quota',()=>{
  const payload={
    candidate:{evidenceSha256:sha},
    source:{source:'ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY',
      registryState:'AUTHORITATIVE_REVIEWED',
      issuerIdentityVerified:true,notRevoked:true,exactSourceUrlApproved:true,
      rightsForPublicNews:true,termsAndRobotsCurrent:true},
    evidence:{source:'ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE',
      currentIssuerEvidence:true,verifiedContentSha256:sha,
      claimsMatchPrimaryNotice:true,noMaterialContradictions:true},
    editorial:{source:'ORIGINAL_JREI_EDITORIAL_QA',bilingualComplete:true,
      authorVoiceQualityPassed:true,newsGuidanceComplete:true,
      internalLinksChecked:true,seoAndCanonicalChecked:true,
      imageRightsCurrent:true,assistantContextGrounded:true},
    publisher:{source:'ORIGINAL_AUTHENTICATED_CMS_POLICY',
      originalCmsConnected:true,exactRoutesCollisionFree:true,
      authenticatedPublishReceiptSupported:true}
  };
  const items=Array.from({length:63},(_,i)=>({
    ...payload,candidate:{...payload.candidate,
      fingerprint:sha256('verified-official-story-'+i)}
  }));
  // The suspicious report belongs to the owner; missing CMS services do not.
  items[3]={...items[3],evidence:{...items[3].evidence,
    noMaterialContradictions:false}};
  items[6]={...items[6],publisher:{...items[6].publisher,
    originalCmsConnected:false}};
  items.push(items[0]);
  const batch=planOfficialNewsHandoffs({items});
  assert.equal(batch.checkedUniqueCount,63);
  assert.equal(batch.autoHandoff.length,61);
  assert.equal(batch.ownerExceptions.length,1);
  assert.equal(batch.systemHolds.length,1);
  assert.equal(batch.duplicateFingerprints.length,1);
  assert.equal(batch.dailyPublicationLimit,null);
  assert.equal(batch.originalCmsWritePerformed,false);
});
