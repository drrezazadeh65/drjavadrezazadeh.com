/**
 * Evidence-first editorial desk selection — topic and audience diversity.
 * Never guarantees impressions, rankings, or daily publication volumes.
 * Urgent official deadlines bypass normal draft quota but never owner approval.
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
    Number.isInteger(ownerLimits.regularDailyDraftGoal)&&
    ownerLimits.regularDailyDraftGoal>=0&&
    ownerLimits.regularDailyDraftGoal<=20&&
    Number.isInteger(ownerLimits.urgentMaxReviewAlerts)&&
    ownerLimits.urgentMaxReviewAlerts>=0&&
    ownerLimits.urgentMaxReviewAlerts<=40,
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
  const categoriesSeen=new Set();
  const dailyRegular=[],urgent=[];
  const ranked=eligible.sort((a,b)=>
    PRIORITY_SCORE[b.priority]-PRIORITY_SCORE[a.priority]||
    a.ageHours-b.ageHours||
    a.fingerprint.localeCompare(b.fingerprint));
  for(const item of ranked) {
    if(item.priority==='P0') {
      if(urgent.length<ownerLimits.urgentMaxReviewAlerts)urgent.push(item);
      continue;
    }
    if(dailyRegular.length>=ownerLimits.regularDailyDraftGoal)continue;
    // Include diverse educational stages/institutions when equally trusted.
    if(!categoriesSeen.has(item.category)) {
      dailyRegular.push(item);categoriesSeen.add(item.category);
    }
  }
  for(const item of ranked) {
    if(item.priority==='P0'||dailyRegular.length>=
      ownerLimits.regularDailyDraftGoal)continue;
    if(dailyRegular.some(s=>s.fingerprint===item.fingerprint))continue;
    dailyRegular.push(item);
  }
  return Object.freeze({
    schema:'jr.jrei.news-desk-day-plan.v1',plannedAt:nowUtc,
    regularDrafts:dailyRegular.map(s=>({
      fingerprint:s.fingerprint,category:s.category,
      priority:s.priority,sourceId:s.sourceId})),
    urgentOwnerReview:urgent.map(s=>({
      fingerprint:s.fingerprint,sourceId:s.sourceId,
      priority:s.priority,reason:'TIME_SENSITIVE_OFFICIAL_SOURCE'})),
    blocked,regularDraftCount:dailyRegular.length,
    urgentCount:urgent.length,
    actualPublicArticleCount:0,
    noAutoPublishing:true,noRankOrTrafficPromises:true,
    noArtificialBacklinkFarming:true,
    editorialApprovalAlwaysRequired:true
  });
}
