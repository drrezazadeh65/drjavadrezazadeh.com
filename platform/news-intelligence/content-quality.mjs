/**
 * Pre-approval news quality gate, not a scientific-certification oracle.
 * Strict source/claim/date checks and public SEO quality requirements.
 */
import {assert,isHash,plain,publicHttps,safeText,utcInstant} from './contracts.mjs';
export function preOwnerNewsQualityReview({candidate,evidence,fa,en,media,
  internalLinks=[],linksCheckedByServer=false,checkedAt}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    plain(evidence)&&evidence.schema==='jr.jrei.news-evidence-review.v1'&&
    evidence.candidateFingerprint===candidate.fingerprint&&
    evidence.evidenceSha256===candidate.evidenceSha256&&
    isHash(candidate.evidenceSha256)&&
    plain(media)&&media.rightsReviewed===true&&
    media.isDocumentaryPhoto!==undefined&&
    Array.isArray(internalLinks)&&internalLinks.length<=16&&
    utcInstant(checkedAt),'NEWS_QUALITY_INPUT_UNVERIFIED');
  const issues=[];
  for(const [language,draft] of [['fa',fa],['en',en]]){
    if(!plain(draft)||draft.language!==language||
      !safeText(draft.headline,8,180)||
      !safeText(draft.summary,25,1000)||
      !safeText(draft.body,80,30000)||
      !safeText(draft.nextSteps,10,3000)||
      draft.sourceUrl!==candidate.sourceUrl)
      issues.push(language.toUpperCase()+'_DRAFT_INCOMPLETE');
    if(plain(draft)&&typeof draft.body==='string'&&
      /(?:<script|javascript:|data:text\/html)/i.test(draft.body))
      issues.push(language.toUpperCase()+'_UNSAFE_MARKUP');
  }
  if(candidate.priority==='P0'&&candidate.observedAt&&
     Date.parse(checkedAt)-Date.parse(candidate.observedAt)>60*60000)
    issues.push('URGENT_SOURCE_RECHECK_REQUIRED');
  if(linksCheckedByServer!==true&&internalLinks.length)
    issues.push('INTERNAL_LINK_DESTINATIONS_UNVERIFIED');
  if(media.provenance==='ORIGINAL_AI_ILLUSTRATION'&&
     media.isDocumentaryPhoto===true)
    issues.push('MISLEADING_SYNTHETIC_PHOTO');
  if(internalLinks.some(l=>!plain(l)||
     !['fa','en'].includes(l.language)||
     !/^\/(?:fa|en)\//.test(l.path??'')||
     !safeText(l.reason,8,300)))
    issues.push('INTERNAL_LINK_INTEGRITY');
  if(candidate.publishedAt!==null&&
     (!utcInstant(candidate.publishedAt)||
      Date.parse(candidate.publishedAt)>Date.parse(checkedAt)+120000))
    issues.push('SOURCE_PUBLICATION_DATE_INVALID');
  const safeSource=(()=>{try{return !!publicHttps(candidate.sourceUrl);}
    catch{return false;}})();
  if(!safeSource)issues.push('OFFICIAL_SOURCE_URL_INVALID');
  return Object.freeze({schema:'jr.jrei.news-quality-gate.v1',
    candidateFingerprint:candidate.fingerprint,
    checkedAt,editorialReadyForOwnerPreview:issues.length===0,
    findings:Object.freeze(issues),
    reviewerMustIndependentlyVerifyMeaning:true,
    ownerApprovalStillRequired:true,
    noAutomaticPublication:true});
}
