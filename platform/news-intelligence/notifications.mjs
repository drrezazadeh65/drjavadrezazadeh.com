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
/**
 * Newer owner policy: ONLY evidence or source exceptions receive an owner
 * alert. Official verified P0 urgency is not an exception and never creates
 * owner approval work. Technical CMS/model outages are SYSTEM_HOLD instead.
 *
 * An ORIGINAL signed evidence reviewer must supply these records; this pure
 * function may only plan a private eco outbox message, not authenticate a
 * reviewer or actually send it.
 */
export function planOwnerEditorialBatchAlert({
  evidenceExceptions,originalEvidenceDesk,ownerId,nowUtc,secureAdminRoute
}={}){
  const permitted=new Set([
    'SOURCE_AUTHORITY_UNCONFIRMED',
    'PUBLICATION_RIGHTS_UNCONFIRMED',
    'CLAIMS_UNVERIFIED_OR_CONTRADICTED'
  ]);
  assert(plain(originalEvidenceDesk)&&
    originalEvidenceDesk.source==='ORIGINAL_JREI_VERIFIED_EXCEPTION_DESK'&&
    originalEvidenceDesk.signedCurrentReview===true&&
    Array.isArray(evidenceExceptions)&&evidenceExceptions.length>=1&&
    evidenceExceptions.length<=100&&
    evidenceExceptions.every(x=>plain(x)&&isHash(x.digest)&&
      permitted.has(x.issueCode)&&x.underlyingEvidenceVerified===true)&&
    new Set(evidenceExceptions.map(x=>x.digest+'|'+x.issueCode)).size===
      evidenceExceptions.length&&
    isId(ownerId)&&utcInstant(nowUtc)&&
    secureAdminRoute==='/fa/app/admin/',
    'NEWS_OWNER_EDITORIAL_BATCH_INVALID');
  const sorted=[...evidenceExceptions]
    .sort((a,b)=>a.digest.localeCompare(b.digest)||
      a.issueCode.localeCompare(b.issueCode));
  const ids=sorted.map(x=>x.digest+'|'+x.issueCode);
  return Object.freeze({
    schema:'jr.jrei.news-owner-evidence-exceptions-batch.v2',
    ownerId,exceptionCount:sorted.length,
    exactEvidenceExceptions:Object.freeze(sorted.map(x=>Object.freeze({
      digest:x.digest,issueCode:x.issueCode
    }))),
    createdAt:nowUtc,adminRoute:secureAdminRoute,
    idempotencyKey:sha256([ownerId,...ids].join('|')),
    requiresIndividualOwnerApprovalForVerifiedOfficialNews:false,
    onlyQuestionableClaimsOrSourceRightsAreOwnerReviewed:true,
    technicalFailuresNeverOwnerReviewAlerts:true,
    publicPublicationAuthorizedByNotification:false,
    outbox:'EXISTING_AUTHENTICATED_ECO_NOTIFICATION_ONLY'
  });
}
