/**
 * Publication plan for integration with existing owner-approved CMS.
 * Pure and fail closed. NEVER overwrites frozen existing public routes.
 */
import {assert,isHash,plain,publicHttps,sha256,utcInstant} from './contracts.mjs';
const SITE='https://drjavadrezazadeh.com';
export function verifiedPublicationPlan({queue,preview,paths,ownerRegistry,
  immutableRouteRegistry,nowUtc}={}){
  assert(plain(queue)&&queue.schema==='jr.jrei.news-publication-queue.v1'&&
    queue.status==='ELIGIBLE_FOR_PRIVATE_PUBLISHER'&&queue.published===false&&
    isHash(queue.previewDigest)&&
    plain(preview)&&preview.schema==='jr.jrei.news-editorial-preview.v1'&&
    preview.approvalDigest===queue.previewDigest&&
    plain(ownerRegistry)&&ownerRegistry.ownerAuthenticated===true&&
    ownerRegistry.currentApprovalDigest===queue.previewDigest&&
    ownerRegistry.approvalRevoked!==true&&
    ownerRegistry.privacyGatePassed===true&&
    ownerRegistry.rightsGatePassed===true&&
    plain(paths)&&typeof paths.fa==='string'&&
    typeof paths.en==='string'&&
    Array.isArray(immutableRouteRegistry)&&utcInstant(nowUtc),
    'NEWS_PUBLICATION_PLAN_NOT_AUTHORIZED');
  for(const lang of ['fa','en']){
    const path=paths[lang];
    assert(/^\/(?:fa|en)\/[a-z0-9\/-]+\/$/.test(path)&&
      path.startsWith('/'+lang+'/')&&!path.includes('//')&&
      !immutableRouteRegistry.includes(path),
      'NEWS_FROZEN_PUBLIC_URL_COLLISION');
  }
  assert(paths.fa!==paths.en,'NEWS_BILINGUAL_URL_COLLISION');
  return Object.freeze({schema:'jr.jrei.news-publication-plan.v1',
    approvalDigest:queue.previewDigest,
    approvedBy:queue.approvedBy,createdAt:nowUtc,
    languagePaths:{fa:paths.fa,en:paths.en},
    canonicalUrls:{fa:SITE+paths.fa,en:SITE+paths.en},
    idempotencyKey:sha256([queue.previewDigest,paths.fa,paths.en].join('|')),
    state:'WAITING_FOR_EXISTING_AUTHENTICATED_PUBLISHER',
    ownerApproved:true,
    existingContentMustNeverBeOverwritten:true,
    sourceRecheckRequiredAtDispatch:true,
    noPublicWritePerformed:true});
}
export function publicationReceiptGate({plan,receipt,verifiedAt}={}){
  assert(plain(plan)&&plan.schema==='jr.jrei.news-publication-plan.v1'&&
    plain(receipt)&&receipt.immutableContentHashFa&&
    receipt.immutableContentHashEn&&
    isHash(receipt.immutableContentHashFa)&&
    isHash(receipt.immutableContentHashEn)&&
    receipt.ownerApprovalDigest===plan.approvalDigest&&
    receipt.publisherAuthenticated===true&&
    receipt.publishedCanonicalFa===plan.canonicalUrls.fa&&
    receipt.publishedCanonicalEn===plan.canonicalUrls.en&&
    receipt.finalSourceReviewPassed===true&&
    utcInstant(verifiedAt),'NEWS_PUBLICATION_RECEIPT_NOT_VERIFIED');
  return Object.freeze({schema:'jr.jrei.news-publication-receipt.v1',
    at:verifiedAt,approvalDigest:plan.approvalDigest,
    canonicalUrls:plan.canonicalUrls,contentHashes:{
      fa:receipt.immutableContentHashFa,en:receipt.immutableContentHashEn},
    requiresAuthenticLiveUrlVerification:true,
    publicPublicationEvidenceReceived:true});
}
