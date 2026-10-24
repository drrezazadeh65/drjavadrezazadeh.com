/**
 * Official correction workflow: preserve original revision, require fresh owner
 * approval, and recalculate reminders when an official date changes.
 */
import {assert,isHash,isId,plain,safeText,sha256,utcInstant} from './contracts.mjs';
export function proposeOfficialCorrection({publishedArticle,officialChange,
  preparedAt,independentReviewer}={}){
  assert(plain(publishedArticle)&&publishedArticle.publicationState==='PUBLISHED'&&
    publishedArticle.ownerApproved===true&&
    isHash(publishedArticle.approvalDigest)&&
    isHash(publishedArticle.evidenceSha256)&&
    plain(officialChange)&&officialChange.schema==='jr.jrei.news-amendment.v1'&&
    officialChange.previousHash===publishedArticle.evidenceSha256&&
    officialChange.currentHash!==publishedArticle.evidenceSha256&&
    safeText(officialChange.explanation,12,2000)&&
    utcInstant(preparedAt)&&isId(independentReviewer),
    'NEWS_CORRECTION_SOURCE_INVALID');
  return Object.freeze({schema:'jr.jrei.news-correction-proposal.v1',
    originalApprovedDigest:publishedArticle.approvalDigest,
    originalEvidenceSha256:publishedArticle.evidenceSha256,
    newEvidenceSha256:officialChange.currentHash,
    officialSourceUrl:officialChange.sourceUrl,
    correctionReason:officialChange.explanation,
    proposedAt:preparedAt,reviewerId:independentReviewer,
    correctionDigest:sha256([publishedArticle.approvalDigest,
      officialChange.currentHash,officialChange.explanation].join('|')),
    state:'REQUIRES_FRESH_OWNER_APPROVAL',
    priorPublicVersionPreserved:true,publiclyUpdated:false,
    scheduleExistingRemindersForCancellation:true});
}
export function correctionDistribution({correction,ownerDecision,
  changedDeadlines=[],affectedSubscriberCount=0}={}){
  assert(plain(correction)&&correction.schema==='jr.jrei.news-correction-proposal.v1'&&
    plain(ownerDecision)&&ownerDecision.action==='APPROVE_CORRECTION'&&
    ownerDecision.ownerMfaVerified===true&&
    ownerDecision.approvedDigest===correction.correctionDigest&&
    Array.isArray(changedDeadlines)&&changedDeadlines.length<=100&&
    Number.isInteger(affectedSubscriberCount)&&affectedSubscriberCount>=0,
    'NEWS_CORRECTION_NOT_OWNER_APPROVED');
  return Object.freeze({schema:'jr.jrei.news-correction-distribution.v1',
    approvedDigest:correction.correctionDigest,
    notifyAffectedSubscribers:affectedSubscriberCount>0,
    changedDeadlineIds:changedDeadlines,
    shouldCancelOldReminders:changedDeadlines.length>0,
    enqueueReplacementRemindersAfterVerifiedCalendarUpdate:
      changedDeadlines.length>0,
    neverRewriteOriginalAudit:true,
    requiresExistingPublisherAndOutbox:true,
    actuallySent:false});
}
