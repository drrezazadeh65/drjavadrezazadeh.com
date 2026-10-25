/**
 * Breaking-news radar: urgency is priority, NOT owner approval.
 * Only genuinely uncertain official evidence enters the owner desk.
 * Upstream independently verified official observations are indispensable.
 */
import {assert,isHash,plain,sha256,utcInstant} from './contracts.mjs';
const MAX_STALE=Object.freeze({P0:60,P1:360,P2:1440});
export function breakingNewsTriage({candidate,verification,nowUtc,previouslyAlerted=[]}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    ['P0','P1','P2'].includes(candidate.priority)&&
    plain(verification)&&verification.sourceRegistryRead===true&&
    verification.evidenceReviewed===true&&verification.issuerVerified===true&&
    verification.sourceStillCurrent===true&&
    verification.evidenceSha256===candidate.evidenceSha256&&
    utcInstant(verification.reviewedAt)&&utcInstant(nowUtc)&&
    Array.isArray(previouslyAlerted)&&previouslyAlerted.length<=5000,
    'NEWS_BREAKING_SOURCE_NOT_VERIFIED');
  const ageMinutes=Math.max(0,(Date.parse(nowUtc)-Date.parse(candidate.observedAt))/60000);
  const stale=ageMinutes>MAX_STALE[candidate.priority];
  const alertKey=sha256(['JREI_NEWS',candidate.fingerprint,
    verification.reviewedAt].join('|'));
  const repeated=previouslyAlerted.includes(alertKey);
  const uncertain=verification.claimsContradictory===true||
    verification.issuerClaimUncertain===true||
    verification.rightsUncertain===true;
  const status=stale?'STALE_REVERIFY_SOURCE':
    uncertain?'OWNER_EXCEPTION_QUEUE':repeated?'ALREADY_NOTIFIED':
    candidate.priority==='P0'?'URGENT_OFFICIAL_FAST_LANE':
    candidate.priority==='P1'?'PRIORITY_OFFICIAL_DESK':'EDITORIAL_DIGEST';
  return Object.freeze({schema:'jr.jrei.news-breaking-triage.v1',
    fingerprint:candidate.fingerprint,priority:candidate.priority,
    alertKey,ageMinutes,status,sourceStillCurrent:!stale,
    requiresOwnerApproval:status==='OWNER_EXCEPTION_QUEUE',
    publicAutoPublish:false,requiresDownstreamPublisherPolicy:true,
    skipLongAnalysisUntilFirstApproval:false});
}
export function urgentNotificationPolicy({triage,ownerEmailVerified,
  hourlyBudgetRemaining,privateNewsNotificationsEnabled}={}){
  assert(plain(triage)&&triage.schema==='jr.jrei.news-breaking-triage.v1'&&
    typeof ownerEmailVerified==='boolean'&&
    Number.isInteger(hourlyBudgetRemaining)&&hourlyBudgetRemaining>=0&&
    typeof privateNewsNotificationsEnabled==='boolean',
    'NEWS_ALERT_SETTINGS_INVALID');
  const canQueue=triage.status==='OWNER_EXCEPTION_QUEUE'&&
    triage.priority==='P0'&&
    ownerEmailVerified&&hourlyBudgetRemaining>0&&
    privateNewsNotificationsEnabled;
  return Object.freeze({schema:'jr.jrei.news-owner-alert-policy.v1',
    alertKey:triage.alertKey,canQueue,reason:canQueue?'P0_EVIDENCE_EXCEPTION_NOTICE':
      'DISABLED_OR_UNAVAILABLE',sendViaExistingOutboxOnly:true,
    publicPostAuthorized:false,mailActuallySent:false});
}
