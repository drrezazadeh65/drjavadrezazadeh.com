/**
 * JREI News — source-only, deterministic official-versus-exception gate.
 * Owner's standing editorial policy: official verified announcements may
 * proceed automatically AFTER genuine CMS/rights/quality checks; ambiguous
 * claims are owner-review exceptions. This never writes or publishes.
 * Do not infer a licensed or trusted issuer from a domain's name alone.
 */
import {assert,plain,isHash} from './contracts.mjs';
export function decideOfficialNewsRoute({candidate,source,evidence,editorial,
  publisher}={}){
  assert(plain(candidate)&&plain(source)&&plain(evidence)&&
    plain(editorial)&&plain(publisher)&&isHash(candidate.evidenceSha256),
    'NEWS_OFFICIAL_POLICY_INPUT_INVALID');
  const failures=[];
  if(source.registryState!=='AUTHORITATIVE_REVIEWED'||
     source.issuerIdentityVerified!==true||
     source.notRevoked!==true||
     source.exactSourceUrlApproved!==true)
    failures.push('SOURCE_AUTHORITY_UNCONFIRMED');
  if(source.rightsForPublicNews!==true||
     source.termsAndRobotsCurrent!==true)
    failures.push('PUBLICATION_RIGHTS_UNCONFIRMED');
  if(evidence.currentIssuerEvidence!==true||
     evidence.verifiedContentSha256!==candidate.evidenceSha256||
     evidence.claimsMatchPrimaryNotice!==true||
     evidence.noMaterialContradictions!==true)
    failures.push('CLAIMS_UNVERIFIED_OR_CONTRADICTED');
  if(editorial.bilingualComplete!==true||
     editorial.authorVoiceQualityPassed!==true||
     editorial.newsGuidanceComplete!==true||
     editorial.internalLinksChecked!==true||
     editorial.seoAndCanonicalChecked!==true||
     editorial.imageRightsCurrent!==true||
     editorial.assistantContextGrounded!==true)
    failures.push('EDITORIAL_QUALITY_INCOMPLETE');
  if(publisher.originalCmsConnected!==true||
     publisher.exactRoutesCollisionFree!==true||
     publisher.authenticatedPublishReceiptSupported!==true)
    failures.push('CMS_PUBLICATION_UNAVAILABLE');
  const ready=failures.length===0;
  return Object.freeze({
    schema:'jr.jrei.news-official-publishing-decision.v1',
    decision:ready?'ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF':'OWNER_EXCEPTION_QUEUE',
    humanPerArticleApprovalRequired:!ready,
    policyBasis:'OWNER_STANDING_OFFICIAL_SOURCE_POLICY',
    reasons:failures,
    // Eligibility never fabricates a CMS receipt or public URL.
    published:false,automaticCmsWritePerformed:false,
    realAuthenticatedCmsReceiptRequired:true,
    dailyStoryQuota:null
  });
}
