/** User-directed, opt-in news digests; never sends mail directly. */
import {assert,isId,plain,sha256,utcInstant} from './contracts.mjs';
import {CHANNEL_TOPICS} from './taxonomy.mjs';
export const DIGEST_MODES=Object.freeze(['URGENT','DAILY','WEEKLY','EXAM_ONLY']);
export function normalizeNewsPreferences({accountId,language,topics,digestModes,
  consentRecord,verifiedEmail,updatedAt}={}){
  assert(isId(accountId)&&['fa','en'].includes(language)&&
    Array.isArray(topics)&&topics.length<=CHANNEL_TOPICS.length&&
    topics.every(t=>CHANNEL_TOPICS.includes(t))&&
    Array.isArray(digestModes)&&digestModes.length>=1&&
    digestModes.every(m=>DIGEST_MODES.includes(m))&&
    plain(consentRecord)&&consentRecord.accountId===accountId&&
    consentRecord.purpose==='NEWSLETTER'&&consentRecord.granted===true&&
    consentRecord.withdrawn!==true&&verifiedEmail===true&&
    utcInstant(updatedAt),'NEWS_NEWSLETTER_CONSENT_INVALID');
  return Object.freeze({schema:'jr.jrei.news-preferences.v1',accountId,language,
    topics:[...new Set(topics)],digestModes:[...new Set(digestModes)],
    consentId:consentRecord.consentId,updatedAt,
    unsubscribeAvailable:true,marketingOptInNotImplied:true});
}
export function selectDigestCandidates({preferences,articles,mode,nowUtc}={}){
  assert(plain(preferences)&&preferences.schema==='jr.jrei.news-preferences.v1'&&
    DIGEST_MODES.includes(mode)&&preferences.digestModes.includes(mode)&&
    utcInstant(nowUtc)&&Array.isArray(articles)&&articles.length<=2000,
    'NEWS_DIGEST_INPUT_INVALID');
  const hours=mode==='DAILY'?24:mode==='WEEKLY'?168:mode==='URGENT'?12:168;
  const min=Date.parse(nowUtc)-hours*3600000;
  const chosen=articles.filter(a=>a&&a.publicationState==='PUBLISHED'&&
    a.ownerApproved===true&&a.publicUrl&&
    a.topic&&preferences.topics.includes(a.topic)&&
    utcInstant(a.publishedAt)&&Date.parse(a.publishedAt)>=min&&
    (mode!=='URGENT'||a.priority==='P0')&&
    (mode!=='EXAM_ONLY'||a.topic==='EXAMINATIONS'));
  const distinct=[...new Map(chosen.map(a=>[a.publicUrl,a])).values()];
  return Object.freeze({schema:'jr.jrei.news-digest-plan.v1',
    accountId:preferences.accountId,language:preferences.language,mode,
    generatedAt:nowUtc,items:distinct.slice(0,40).map(a=>({
      url:a.publicUrl,headline:a.headlines?.[preferences.language]??null,
      publishedAt:a.publishedAt,priority:a.priority})),
    idempotencyKey:sha256([preferences.accountId,mode,nowUtc.slice(0,10),
      ...distinct.map(a=>a.publicUrl)].join('|')),
    state:'PRIVATE_OUTBOX_PROPOSAL',smtpDelivered:false});
}
export function unsubscribeDirective({accountId,topic=null,nowUtc}={}){
  assert(isId(accountId)&&(topic===null||CHANNEL_TOPICS.includes(topic))&&
    utcInstant(nowUtc),'NEWS_UNSUBSCRIBE_INVALID');
  return Object.freeze({schema:'jr.jrei.news-unsubscribe.v1',
    accountId,topic,requestedAt:nowUtc,
    requiresAuthenticatedOrVerifiedUnsubscribeToken:true,
    cancelPendingMatchingDeliveries:true,sendNoFurtherMarketing:true});
}
