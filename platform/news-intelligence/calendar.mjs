/**
 * Official exam event planner. All time instants UTC; no guessed dates.
 * Notification delivery is delegated to existing eco_notification_* services.
 */
import {assert,isId,plain,publicHttps,safeText,sha256,utcInstant} from './contracts.mjs';
export const EXAM_MILESTONES=Object.freeze(['REGISTRATION_OPENS','REGISTRATION_CLOSES',
  'REGISTRATION_EXTENDED','EDIT_DEADLINE','ADMIT_CARD_RELEASE',
  'EXAM_DATE','PRELIMINARY_RESULTS','SELECTION_OPENS','SELECTION_CLOSES',
  'FINAL_RESULTS','APPEAL_DEADLINE','SCHOLARSHIP_DEADLINE']);
export const REMINDER_DAYS=Object.freeze([0,1,3,5,7,10,15,30]);
export function officialExamEvent({eventId,examId,milestone,titleFa,titleEn,
  startsAt,timezone='Asia/Tehran',sourceUrl,evidenceSha256,verifiedBy,
  verifiedAt,version=1,previousVersion=null}={}){
  assert(isId(eventId)&&isId(examId)&&EXAM_MILESTONES.includes(milestone)&&
    safeText(titleFa,6,200)&&safeText(titleEn,6,200)&&utcInstant(startsAt)&&
    ['Asia/Tehran','UTC'].includes(timezone)&&
    /^[a-f0-9]{64}$/.test(evidenceSha256??'')&&
    isId(verifiedBy)&&utcInstant(verifiedAt)&&
    Number.isInteger(version)&&version>0&&
    (previousVersion===null||(Number.isInteger(previousVersion)&&
      previousVersion===version-1)),
    'NEWS_EXAM_EVENT_INVALID');
  const url=publicHttps(sourceUrl);
  return Object.freeze({schema:'jr.jrei.exam-event.v1',eventId,examId,milestone,
    titleFa,titleEn,startsAt,timezone,sourceUrl:url,evidenceSha256,
    verifiedBy,verifiedAt,version,previousVersion,
    status:'OFFICIAL_DATE_REVIEWED',requiresOwnerPublicationApproval:true});
}
export function reviseExamEvent({previous,next,reason,reviewedBy,reviewedAt}={}){
  assert(plain(previous)&&plain(next)&&
    previous.schema==='jr.jrei.exam-event.v1'&&
    next.schema==='jr.jrei.exam-event.v1'&&
    previous.eventId===next.eventId&&
    previous.examId===next.examId&&
    next.version===previous.version+1&&
    next.previousVersion===previous.version&&
    safeText(reason,10,500)&&isId(reviewedBy)&&utcInstant(reviewedAt),
    'NEWS_EXAM_REVISION_INVALID');
  return Object.freeze({schema:'jr.jrei.exam-revision.v1',eventId:next.eventId,
    fromVersion:previous.version,toVersion:next.version,
    changedAt:reviewedAt,reviewedBy,reason,
    cancelExistingReminderReservations:true,
    createReplacementRemindersAfterApproval:true,
    requiresOwnerApproval:true});
}
export function reminderReservations({event,accountId,daysBefore,nowUtc,
  consent,deliveryChannel='EMAIL'}={}){
  assert(plain(event)&&event.schema==='jr.jrei.exam-event.v1'&&
    isId(accountId)&&Array.isArray(daysBefore)&&daysBefore.length<=8&&
    daysBefore.every(d=>REMINDER_DAYS.includes(d))&&utcInstant(nowUtc)&&
    ['EMAIL','DASHBOARD'].includes(deliveryChannel)&&
    plain(consent)&&consent.accountId===accountId&&
    consent.purpose==='EXAM_REMINDERS'&&consent.optedIn===true&&
    consent.withdrawn!==true&&consent.verified===true,
    'NEWS_REMINDER_CONSENT_REQUIRED');
  const now=Date.parse(nowUtc),eventMs=Date.parse(event.startsAt);
  return Object.freeze([...new Set(daysBefore)].sort((a,b)=>b-a)
    .map(days=>({schema:'jr.jrei.reminder-reservation.v1',
      eventId:event.eventId,eventVersion:event.version,accountId,
      channel:deliveryChannel,daysBefore:days,
      scheduledAt:new Date(eventMs-days*86400000).toISOString(),
      idempotencyKey:sha256([event.eventId,event.version,accountId,
        deliveryChannel,days].join('|')),state:'PENDING_APPROVED_OUTBOX'}))
    .filter(item=>Date.parse(item.scheduledAt)>now));
}
export function eventIcsDescriptor(event){
  assert(event&&event.schema==='jr.jrei.exam-event.v1','NEWS_ICS_EVENT_INVALID');
  // Caller must escape ICS content, generate DTSTAMP and serve with safe MIME.
  return Object.freeze({uid:event.eventId+'@drjavadrezazadeh.com',
    dtstartUtc:event.startsAt,summaryFa:event.titleFa,summaryEn:event.titleEn,
    source:event.sourceUrl,version:event.version,
    timezone:event.timezone,requiresSafeIcsSerializer:true});
}
