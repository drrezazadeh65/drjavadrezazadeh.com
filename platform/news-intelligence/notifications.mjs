/**
 * JREI News notification plans. Respect existing eco_notification_* records.
 * Pure plans cannot send SMTP, infer mailbox delivery or override opt-outs.
 */
import {assert,isHash,isId,plain,safeText,sha256,utcInstant} from './contracts.mjs';
const CHANNELS=new Set(['EMAIL','DASHBOARD']);
export function planExamReminderEmail({reservation,event,accountConsent,
  nowUtc,preferredLanguage='fa'}={}){
  assert(plain(reservation)&&
    reservation.schema==='jr.jrei.reminder-reservation.v1'&&
    plain(event)&&event.schema==='jr.jrei.exam-event.v1'&&
    event.version===reservation.eventVersion&&
    reservation.eventId===event.eventId&&
    CHANNELS.has(reservation.channel)&&
    plain(accountConsent)&&
    accountConsent.accountId===reservation.accountId&&
    accountConsent.purpose==='EXAM_REMINDERS'&&
    accountConsent.optedIn===true&&
    accountConsent.withdrawn!==true&&
    accountConsent.emailVerified===true&&
    ['fa','en'].includes(preferredLanguage)&&utcInstant(nowUtc),
    'NEWS_REMINDER_OUTBOX_NOT_CONSENTED');
  assert(Date.parse(reservation.scheduledAt)<=Date.parse(nowUtc)&&
    Date.parse(event.startsAt)>Date.parse(nowUtc),
    'NEWS_REMINDER_NOT_DUE');
  const title=preferredLanguage==='fa'?event.titleFa:event.titleEn;
  const subject=preferredLanguage==='fa'?
    'یادآوری مهلت: '+title:'Upcoming examination deadline: '+title;
  return Object.freeze({schema:'jr.jrei.news-reminder-message.v1',
    accountId:reservation.accountId,channel:reservation.channel,
    purpose:'EXAM_REMINDERS',subject,locale:preferredLanguage,
    eventId:event.eventId,sourceUrl:event.sourceUrl,
    daysBefore:reservation.daysBefore,
    scheduledAt:reservation.scheduledAt,
    eventVersion:event.version,sendAfter:nowUtc,
    idempotencyKey:reservation.idempotencyKey,
    needsExistingEcoOutbox:true,mailboxDeliveryVerified:false,
    requiresLastMomentConsentAndDateRecheck:true});
}
export function newsletterSubject({mode,locale,count,periodLabel}={}){
  assert(['DAILY','WEEKLY','URGENT','EXAM_ONLY'].includes(mode)&&
    ['fa','en'].includes(locale)&&
    Number.isInteger(count)&&count>0&&count<=40&&
    safeText(periodLabel,3,100),'NEWS_NEWSLETTER_SUBJECT_INVALID');
  return locale==='fa'?
    'اخبار منتخب آموزشی شما — '+periodLabel:
    'Your JREI education news digest — '+periodLabel;
}
export function planOwnerEditorialBatchAlert({pendingDigests,ownerId,nowUtc,
  secureAdminRoute}={}){
  assert(Array.isArray(pendingDigests)&&pendingDigests.length>=1&&
    pendingDigests.length<=100&&pendingDigests.every(isHash)&&
    new Set(pendingDigests).size===pendingDigests.length&&
    isId(ownerId)&&utcInstant(nowUtc)&&
    secureAdminRoute==='/fa/app/admin/',
    'NEWS_OWNER_EDITORIAL_BATCH_INVALID');
  return Object.freeze({schema:'jr.jrei.news-owner-review-batch.v1',
    ownerId,newsCount:pendingDigests.length,
    exactDraftDigests:Object.freeze([...pendingDigests]),
    createdAt:nowUtc,adminRoute:secureAdminRoute,
    idempotencyKey:sha256([ownerId,...pendingDigests].join('|')),
    reviewEachDraftIndividually:true,
    noUnreviewedBulkPublication:true,
    outbox:'EXISTING_AUTHENTICATED_ECO_NOTIFICATION_ONLY'});
}
