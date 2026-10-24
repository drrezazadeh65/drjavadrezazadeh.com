/**
 * Opt-in state proposal for news topics and deadlines.
 * Preserve single optional popup / continue-without-saving contract.
 */
import {assert,isId,plain,utcInstant} from './contracts.mjs';
import {CHANNEL_TOPICS} from './taxonomy.mjs';
export function personalizedNewsConsent({accountId,topics,
  purpose='NEWSLETTER',channel='EMAIL',decision,atUtc,
  guardianGateSatisfied=false,isMinor=false}={}){
  assert(isId(accountId)&&Array.isArray(topics)&&
    topics.length<=CHANNEL_TOPICS.length&&
    topics.every(t=>CHANNEL_TOPICS.includes(t))&&
    ['NEWSLETTER','EXAM_REMINDERS'].includes(purpose)&&
    ['EMAIL','DASHBOARD'].includes(channel)&&
    ['GRANT','DECLINE','WITHDRAW'].includes(decision)&&
    utcInstant(atUtc)&&typeof isMinor==='boolean'&&
    typeof guardianGateSatisfied==='boolean',
    'NEWS_PERSONALIZATION_CONSENT_INVALID');
  const granted=decision==='GRANT'&&
    (!isMinor||guardianGateSatisfied===true);
  return Object.freeze({schema:'jr.jrei.news-consent-intent.v1',
    accountId,purpose,channel,topics:[...new Set(topics)],
    granted,decision,atUtc,
    requiresExistingEcoConsentRecording:true,
    continueWithoutSavingAllowed:true,
    noForcedMarketingForEssentialNews:true,
    noRepetitiveConsentPopups:true});
}
export const NEWS_SINGLE_POPUP_COPY=Object.freeze({
  fa:Object.freeze({
    heading:'اخبار و مهلت‌های مهم را از دست ندهید',
    body:'فقط موضوعات موردعلاقه‌تان را انتخاب کنید تا خبرها و یادآورها را در زمان مناسب دریافت کنید.',
    accept:'فعال‌کردن اطلاع‌رسانی من',
    decline:'فعلاً بدون عضویت ادامه می‌دهم'}),
  en:Object.freeze({
    heading:'Stay informed about relevant education deadlines',
    body:'Choose the educational news and reminders you want to receive.',
    accept:'Enable my updates',
    decline:'Continue without subscribing'})
});
