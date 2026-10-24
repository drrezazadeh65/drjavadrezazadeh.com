/** Authenticated, immutable owner editorial approval and distribution gates. */
import {assert,isHash,isId,plain,sha256,utcInstant} from './contracts.mjs';
export function approvalEmailDescriptor({preview,recipient,baseUrl,
  previewTokenReference,expiresAt}={}){
  assert(plain(preview)&&preview.schema==='jr.jrei.news-editorial-preview.v1'&&
    isHash(preview.approvalDigest)&&typeof recipient==='string'&&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)&&
    typeof baseUrl==='string'&&baseUrl==='https://drjavadrezazadeh.com'&&
    isId(previewTokenReference)&&utcInstant(expiresAt),
    'NEWS_APPROVAL_EMAIL_INVALID');
  return Object.freeze({schema:'jr.jrei.news-approval-email.v1',
    recipient,subject:preview.priority==='P0'?
      'JREI — urgent editorial review':'JREI — editorial review',
    previewReference:preview.approvalDigest,
    previewUrl:baseUrl+'/fa/app/admin/',
    tokenReference:previewTokenReference,expiresAt,
    headlineFa:preview.fa.headline,headlineEn:preview.en.headline,
    imageReference:preview.image.assetReference,
    sourceUrl:preview.sourceUrl,
    action:'OPEN_AUTHENTICATED_OWNER_APPROVAL',
    containsDirectPublishLink:false,queuedOnly:true,sent:false});
}
export function publicationQueueDescriptor({decision,preview,
  currentApprovedSourceHash,serverRecheckedAt}={}){
  assert(plain(decision)&&decision.schema==='jr.jrei.news-owner-decision.v1'&&
    decision.canDispatch===true&&
    decision.status==='APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE'&&
    plain(preview)&&preview.schema==='jr.jrei.news-editorial-preview.v1'&&
    preview.approvalDigest===decision.approvalDigest&&
    preview.candidateFingerprint===decision.candidateFingerprint&&
    currentApprovedSourceHash===preview.evidenceSha256&&
    utcInstant(serverRecheckedAt),
    'NEWS_PUBLICATION_NOT_AUTHORIZED');
  return Object.freeze({schema:'jr.jrei.news-publication-queue.v1',
    idempotencyKey:sha256([decision.approvalDigest,decision.ownerId].join('|')),
    previewDigest:decision.approvalDigest,approvedBy:decision.ownerId,
    approvedAt:decision.actionAt,recheckedAt:serverRecheckedAt,
    requiresExistingAuthenticatedPublisher:true,
    requiresFinalLiveLinkAndRouteChecks:true,
    status:'ELIGIBLE_FOR_PRIVATE_PUBLISHER',published:false});
}
export function amendmentApprovalPolicy({existingVersion,proposedVersion,
  changedFields=[]}={}){
  assert(Number.isInteger(existingVersion)&&existingVersion>0&&
    Number.isInteger(proposedVersion)&&proposedVersion>existingVersion&&
    Array.isArray(changedFields)&&changedFields.length>0&&
    changedFields.every(s=>typeof s==='string'&&s.length<100),
    'NEWS_AMENDMENT_POLICY_INVALID');
  return Object.freeze({requiresFreshOwnerApproval:true,
    supersedes:existingVersion,newVersion:proposedVersion,
    changedFields:[...new Set(changedFields)],
    neverOverwriteApprovedVersionSilently:true});
}
