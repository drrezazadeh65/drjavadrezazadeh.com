/**
 * JREI News — deterministic OFFLINE newsroom routing policy.
 * Only the original authenticated server may supply these attestation
 * objects; a client, crawler or LLM response is NEVER publication authority.
 * An eligible response is a handoff proposal, NOT a CMS publication receipt.
 */
import {assert,plain,isHash} from './contracts.mjs';

export function decideOfficialNewsRoute({candidate,source,evidence,editorial,
  publisher}={}){
  assert(plain(candidate)&&plain(source)&&plain(evidence)&&
    plain(editorial)&&plain(publisher)&&isHash(candidate.evidenceSha256),
    'NEWS_OFFICIAL_POLICY_INPUT_INVALID');
  const concerns=[];
  if(source.source!=='ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY' ||
     source.registryState!=='AUTHORITATIVE_REVIEWED' ||
     source.issuerIdentityVerified!==true||
     source.notRevoked!==true||
     source.exactSourceUrlApproved!==true)
    concerns.push('SOURCE_AUTHORITY_UNCONFIRMED');
  if(source.rightsForPublicNews!==true||
     source.termsAndRobotsCurrent!==true)
    concerns.push('PUBLICATION_RIGHTS_UNCONFIRMED');
  if(evidence.source!=='ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE' ||
     evidence.currentIssuerEvidence!==true||
     evidence.verifiedContentSha256!==candidate.evidenceSha256||
     evidence.claimsMatchPrimaryNotice!==true||
     evidence.noMaterialContradictions!==true)
    concerns.push('CLAIMS_UNVERIFIED_OR_CONTRADICTED');
  const blockers=[];
  if(editorial.source!=='ORIGINAL_JREI_EDITORIAL_QA' ||
     editorial.bilingualComplete!==true||
     editorial.authorVoiceQualityPassed!==true||
     editorial.newsGuidanceComplete!==true||
     editorial.internalLinksChecked!==true||
     editorial.seoAndCanonicalChecked!==true||
     editorial.imageRightsCurrent!==true||
     editorial.assistantContextGrounded!==true)
    blockers.push('EDITORIAL_QUALITY_INCOMPLETE');
  if(publisher.source!=='ORIGINAL_AUTHENTICATED_CMS_POLICY' ||
     publisher.originalCmsConnected!==true||
     publisher.exactRoutesCollisionFree!==true||
     publisher.authenticatedPublishReceiptSupported!==true)
    blockers.push('CMS_PUBLICATION_UNAVAILABLE');
  const decision=concerns.length?'OWNER_EXCEPTION_QUEUE':
    blockers.length?'SYSTEM_HOLD':'ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF';
  return Object.freeze({
    schema:'jr.jrei.news-official-publishing-decision.v2',
    decision,
    humanPerArticleApprovalRequired:decision==='OWNER_EXCEPTION_QUEUE',
    policyBasis:'OWNER_STANDING_OFFICIAL_SOURCE_POLICY',
    concerns,blockers,
    published:false,automaticCmsWritePerformed:false,
    realAuthenticatedCmsReceiptRequired:true,
    dailyStoryQuota:null,
    originalServerMustIndependentlyReverifyAllProofs:true
  });
}

/**
 * Queue every verified story from the bounded current batch, with no
 * cumulative DAILY quota. Each invocation remains side-effect free. The
 * existing JREI scheduler decides bounded workers and retries separately.
 */
export function planOfficialNewsHandoffs({items=[]}={}){
  assert(Array.isArray(items)&&items.length<=5000,
    'NEWS_OFFICIAL_BATCH_INVALID');
  const seen=new Set();
  const auto=[],exceptions=[],held=[],duplicates=[];
  for(const item of items){
    const digest=item?.candidate?.fingerprint;
    assert(isHash(digest),'NEWS_OFFICIAL_BATCH_FINGERPRINT_INVALID');
    if(seen.has(digest)){duplicates.push(digest);continue;}
    seen.add(digest);
    const result=decideOfficialNewsRoute(item);
    const record=Object.freeze({fingerprint:digest,
      candidateId:item.candidate?.candidateId??null,
      decision:result.decision,
      reasons:[...result.concerns,...result.blockers]});
    if(result.decision==='ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF')
      auto.push(record);
    else if(result.decision==='OWNER_EXCEPTION_QUEUE')
      exceptions.push(record);
    else held.push(record);
  }
  return Object.freeze({
    schema:'jr.jrei.news-official-batch-plan.v1',
    autoHandoff:auto,ownerExceptions:exceptions,
    systemHolds:held,duplicateFingerprints:duplicates,
    checkedUniqueCount:seen.size,
    dailyPublicationLimit:null,
    originalCmsWritePerformed:false,
    ownerReviewOnlyForEvidenceConcerns:true
  });
}
