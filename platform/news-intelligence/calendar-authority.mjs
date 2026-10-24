/**
 * Approval gate to make original official-exam events visible in the news
 * calendar. The original mother DB owner account/MFA and original source
 * authority must be checked by the authenticated backend on every revision.
 *
 * Pure source-only transformation; never invent a published exam date.
 */
import {assert,isHash,plain,utcInstant} from './contracts.mjs';
export function ownerApprovedExamCalendarEvent({event,ownerDecision,
  originalSourceState,nowUtc}={}){
  assert(plain(event)&&event.schema==='jr.jrei.exam-event.v1'&&
    event.status==='OFFICIAL_DATE_REVIEWED'&&
    isHash(event.evidenceSha256)&&
    plain(ownerDecision)&&
    ownerDecision.source==='EXISTING_OWNER_MFA_AUDIT'&&
    ownerDecision.accountOwnerVerified===true&&
    ownerDecision.ownerMfaCurrent===true&&
    ownerDecision.action==='APPROVE_EXAM_MILESTONE'&&
    ownerDecision.eventId===event.eventId&&
    ownerDecision.eventVersion===event.version&&
    ownerDecision.evidenceSha256===event.evidenceSha256&&
    ownerDecision.withdrawn!==true&&
    plain(originalSourceState)&&
    originalSourceState.source==='EXISTING_JREI_SOURCE_REGISTRY'&&
    originalSourceState.issuerVerified===true&&
    originalSourceState.currentEvidenceSha256===event.evidenceSha256&&
    originalSourceState.rightsCurrent===true&&
    utcInstant(nowUtc)&&
    Date.parse(event.startsAt)>=Date.parse(nowUtc),
    'NEWS_CALENDAR_OWNER_APPROVAL_OR_SOURCE_INVALID');
  return Object.freeze({...event,
    ownerPublicationApproved:true,
    approvalState:'OFFICIAL_EVENT_AND_OWNER_VERIFIED',
    approvalRevision:event.version,
    approvalCheckedAt:nowUtc,
    noPredictedDates:true});
}
export function proposedDeadlineChangeHandling({previous,next,ownerDecision,
  originalSourceState,atUtc}={}){
  assert(plain(previous)&&plain(next)&&
    previous.schema==='jr.jrei.exam-event.v1'&&
    next.schema==='jr.jrei.exam-event.v1'&&
    previous.eventId===next.eventId&&next.version===previous.version+1&&
    previous.evidenceSha256!==next.evidenceSha256&&
    utcInstant(atUtc),'NEWS_CALENDAR_CHANGE_INVALID');
  const approved=ownerApprovedExamCalendarEvent({
    event:next,ownerDecision,originalSourceState,nowUtc:atUtc});
  return Object.freeze({schema:'jr.jrei.official-deadline-amendment.v1',
    eventId:next.eventId,oldVersion:previous.version,
    newVersion:next.version,
    oldUtc:previous.startsAt,newUtc:next.startsAt,
    newApprovedEvent:approved,
    action:'CANCEL_OLD_UNSENT_REMINDERS_AND_REQUEUE_CONSENTED_SUBSCRIBERS',
    correctionRequiresNewOwnerApprovedNewsArticle:true,
    noNotificationsSent:true,
    noSilentReplacementOfOldPublicAudit:true});
}
