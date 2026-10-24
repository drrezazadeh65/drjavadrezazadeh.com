/** Evidence and amendments. No semantic claims of truth from hashes alone. */
import {assert,isHash,isId,plain,publicHttps,safeText,utcInstant,sha256} from './contracts.mjs';
export function reviewNewsEvidence({candidate,sourceRecord,reviewer,reviewedAt,
  issuerVerified,rightsVerified,sourceStillCurrent,claimChecks=[]}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    isHash(candidate.evidenceSha256)&&plain(sourceRecord)&&
    sourceRecord.sourceId===candidate.sourceId&&
    sourceRecord.contentSha256===candidate.evidenceSha256&&
    sourceRecord.reviewStatus==='APPROVED'&&
    sourceRecord.authoritativeRegistryRead===true&&
    isId(reviewer)&&utcInstant(reviewedAt)&&
    issuerVerified===true&&rightsVerified===true&&sourceStillCurrent===true,
    'NEWS_EVIDENCE_NOT_VERIFIED');
  assert(Array.isArray(claimChecks)&&claimChecks.length>=1&&claimChecks.length<=40,
    'NEWS_CLAIMS_MISSING');
  for(const c of claimChecks){
    assert(plain(c)&&safeText(c.claim,10,600)&&
      safeText(c.supportingExcerpt,10,4000)&&
      c.reviewed===true&&c.sourceId===candidate.sourceId&&
      c.supportingExcerpt.includes(c.claim),
      'NEWS_CLAIM_UNSUPPORTED');
  }
  return Object.freeze({schema:'jr.jrei.news-evidence-review.v1',
    candidateFingerprint:candidate.fingerprint,
    evidenceSha256:candidate.evidenceSha256,
    sourceRegistryRead:true,evidenceReviewed:true,issuerVerified:true,
    sourceStillCurrent:true,reviewerId:reviewer,reviewedAt,
    claimCount:claimChecks.length,verifiedExtractiveSupportOnly:true,
    semanticEquivalenceNotProven:true,canPublish:false});
}
export function compareOfficialAmendment({previous,current,verifiedBy,verifiedAt,
  changeExplanation}={}){
  for(const x of [previous,current]){
    assert(plain(x)&&isHash(x.evidenceSha256)&&
      safeText(x.sourceUrl,12,1000),'NEWS_AMENDMENT_VERSION_INVALID');
    publicHttps(x.sourceUrl);
  }
  assert(previous.sourceUrl===current.sourceUrl&&
    previous.evidenceSha256!==current.evidenceSha256&&
    isId(verifiedBy)&&utcInstant(verifiedAt)&&
    safeText(changeExplanation,12,2000),'NEWS_AMENDMENT_NOT_CONFIRMED');
  return Object.freeze({schema:'jr.jrei.news-amendment.v1',
    sourceUrl:current.sourceUrl,previousHash:previous.evidenceSha256,
    currentHash:current.evidenceSha256,verifiedBy,verifiedAt,
    explanation:changeExplanation,requiresNewOwnerApproval:true,
    existingPublicContentMustNotBeSilentlyRewritten:true});
}
export function rumorAssessment({claim,primarySources=[],reviewedBy,reviewedAt}={}){
  assert(safeText(claim,10,800)&&Array.isArray(primarySources)&&
    primarySources.length<=12&&isId(reviewedBy)&&utcInstant(reviewedAt),
    'NEWS_RUMOR_INPUT_INVALID');
  const statuses=new Set(['CONFIRMED','REFUTED','INCONCLUSIVE']);
  for(const s of primarySources){
    assert(plain(s)&&statuses.has(s.finding)&&safeText(s.excerpt,10,2000)&&
      s.sourceReviewed===true,'NEWS_RUMOR_SOURCE_UNREVIEWED');
    publicHttps(s.url);
  }
  const positives=primarySources.filter(s=>s.finding==='CONFIRMED').length;
  const negatives=primarySources.filter(s=>s.finding==='REFUTED').length;
  const state=positives&&negatives?'CONFLICTING_OFFICIAL_INFORMATION':
    positives?'REVIEWED_SOURCE_SUPPORTS_CLAIM':
    negatives?'REVIEWED_SOURCE_REFUTES_CLAIM':'INSUFFICIENT_OFFICIAL_EVIDENCE';
  return Object.freeze({schema:'jr.jrei.news-rumor-review.v1',
    claim,reviewedBy,reviewedAt,state,sourceCount:primarySources.length,
    verified:false,requiresEditorialApproval:true,
    fingerprint:sha256(claim+'|'+reviewedAt)});
}
