/**
 * Evidence-first editorial desk selection — topic and audience diversity.
 * Never guarantees impressions, rankings, or daily publication volumes.
 * Verified news has no arbitrary daily editorial quota. This is planning only:
 * publication still requires the authenticated original CMS and rights checks.
 */
import {assert,isHash,plain,utcInstant} from './contracts.mjs';
const PRIORITY_SCORE=Object.freeze({P0:1000,P1:300,P2:80});
const CATEGORY_COVERAGE=Object.freeze([
  'school','examinations','universities','employment',
  'language','international','research'
]);
export function planBalancedNewsDesk({candidates=[],nowUtc,
  alreadySelectedToday=[],ownerLimits={},
  officialSourceStates={}}={}){
  assert(Array.isArray(candidates)&&candidates.length<=5000&&
    utcInstant(nowUtc)&&
    Array.isArray(alreadySelectedToday)&&alreadySelectedToday.length<=5000&&
    plain(ownerLimits)&&plain(officialSourceStates)&&
    (ownerLimits.regularDailyDraftGoal===undefined||
      (Number.isInteger(ownerLimits.regularDailyDraftGoal)&&
       ownerLimits.regularDailyDraftGoal>=0&&ownerLimits.regularDailyDraftGoal<=5000))&&
    (ownerLimits.urgentMaxReviewAlerts===undefined||
      (Number.isInteger(ownerLimits.urgentMaxReviewAlerts)&&
       ownerLimits.urgentMaxReviewAlerts>=0&&ownerLimits.urgentMaxReviewAlerts<=5000)),
    'NEWS_EDITORIAL_DAILY_SELECTION_INVALID');
  const selectedAlready=new Set(alreadySelectedToday);
  const blocked=[],eligible=[];
  const now=Date.parse(nowUtc);
  for(const c of candidates){
    assert(plain(c)&&c.schema==='jr.jrei.news-candidate.v1'&&
      isHash(c.fingerprint)&&['P0','P1','P2'].includes(c.priority)&&
      utcInstant(c.observedAt),'NEWS_EDITORIAL_CANDIDATE_INVALID');
    if(selectedAlready.has(c.fingerprint)) {
      blocked.push({fingerprint:c.fingerprint,why:'ALREADY_SELECTED'});continue;
    }
    const source=officialSourceStates[c.sourceId];
    if(!plain(source)||source.issuerVerified!==true||
      source.sourceStillCurrent!==true||
      source.evidenceSha256!==c.evidenceSha256||
      source.usageRightsCurrent!==true) {
      blocked.push({fingerprint:c.fingerprint,why:'SOURCE_CURRENT_PROOF_MISSING'});
      continue;
    }
    const ageHours=Math.max(0,(now-Date.parse(c.observedAt))/3600000);
    if(c.priority==='P0'&&ageHours>24) {
      blocked.push({fingerprint:c.fingerprint,why:'URGENT_FACT_TOO_OLD'});
      continue;
    }
    const category=CATEGORY_COVERAGE.includes(c.category)?
      c.category:'research';
    eligible.push({...c,category,ageHours});
  }
  // Rank for processing order, never to silently drop a verified story.
  // Incoming batch limits protect worker memory, not the day's output.
  const ranked=eligible.sort((a,b)=>
    PRIORITY_SCORE[b.priority]-PRIORITY_SCORE[a.priority]||
    a.ageHours-b.ageHours||
    a.fingerprint.localeCompare(b.fingerprint));
  const urgent=ranked.filter(item=>item.priority==='P0');
  const dailyRegular=ranked.filter(item=>item.priority!=='P0');
  return Object.freeze({
    schema:'jr.jrei.news-desk-day-plan.v1',plannedAt:nowUtc,
    regularDrafts:dailyRegular.map(s=>({
      fingerprint:s.fingerprint,category:s.category,
      priority:s.priority,sourceId:s.sourceId})),
    urgentOfficialDesk:urgent.map(s=>({
      fingerprint:s.fingerprint,sourceId:s.sourceId,
      priority:s.priority,reason:'TIME_SENSITIVE_OFFICIAL_SOURCE'})),
    // P0 is an urgency classification, NOT a suspicious-news owner alert.
    // Evidence exception routing lives in official-publication-policy.mjs.
    urgentOwnerReview:[],
    blocked,regularDraftCount:dailyRegular.length,
    urgentCount:urgent.length,
    actualPublicArticleCount:0,
    noAutoPublishing:true,unlimitedDailyEditorialSelection:true,
    processingBatchBounded:true,noRankOrTrafficPromises:true,
    noArtificialBacklinkFarming:true,
    originalCmsPublicationReceiptRequired:true,
    editorialOwnerReviewOnlyForExceptions:true
  });
}
