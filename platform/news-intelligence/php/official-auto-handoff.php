<?php
declare(strict_types=1);
/**
 * JREI News standing official-source editorial policy — SOURCE ONLY.
 * This is NOT a publisher or a substitute for server-side source authority.
 * Proofs must come from original authenticated JREI, CMS and QA workers.
 * Missing publication infrastructure is a SYSTEM_HOLD, not a suspicious
 * news claim requiring owner approval. No SQL, email, HTTP, files or Cron.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsOfficialPublicationDecision(
    array $candidate,array $source,array $evidence,
    array $editorial,array $publisher
): array {
    $sha=$candidate['evidenceSha256']??null;
    if(!is_string($sha)||preg_match('/^[a-f0-9]{64}$/D',$sha)!==1)
        throw new InvalidArgumentException('news_official_candidate_hash_invalid');
    $concerns=[];$holds=[];
    if(($source['source']??null)!=='ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY'||
       ($source['registryState']??null)!=='AUTHORITATIVE_REVIEWED'||
       ($source['issuerIdentityVerified']??null)!==true||
       ($source['notRevoked']??null)!==true||
       ($source['exactSourceUrlApproved']??null)!==true)
        $concerns[]='SOURCE_AUTHORITY_UNCONFIRMED';
    if(($source['rightsForPublicNews']??null)!==true||
       ($source['termsAndRobotsCurrent']??null)!==true)
        $concerns[]='PUBLICATION_RIGHTS_UNCONFIRMED';
    if(($evidence['source']??null)!=='ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE'||
       ($evidence['currentIssuerEvidence']??null)!==true||
       ($evidence['verifiedContentSha256']??null)!==$sha||
       ($evidence['claimsMatchPrimaryNotice']??null)!==true||
       ($evidence['noMaterialContradictions']??null)!==true)
        $concerns[]='CLAIMS_UNVERIFIED_OR_CONTRADICTED';
    if(($editorial['source']??null)!=='ORIGINAL_JREI_EDITORIAL_QA'||
       ($editorial['bilingualComplete']??null)!==true||
       ($editorial['authorVoiceQualityPassed']??null)!==true||
       ($editorial['newsGuidanceComplete']??null)!==true||
       ($editorial['internalLinksChecked']??null)!==true||
       ($editorial['seoAndCanonicalChecked']??null)!==true||
       ($editorial['imageRightsCurrent']??null)!==true||
       ($editorial['assistantContextGrounded']??null)!==true)
        $holds[]='EDITORIAL_QUALITY_INCOMPLETE';
    if(($publisher['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS_POLICY'||
       ($publisher['originalCmsConnected']??null)!==true||
       ($publisher['exactRoutesCollisionFree']??null)!==true||
       ($publisher['authenticatedPublishReceiptSupported']??null)!==true)
        $holds[]='CMS_PUBLICATION_UNAVAILABLE';
    $decision=$concerns!==[]?'OWNER_EXCEPTION_QUEUE':
        ($holds!==[]?'SYSTEM_HOLD':'ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF');
    return [
        'schema'=>'jr.jrei.news-official-publishing-decision.v2',
        'decision'=>$decision,'policyBasis'=>'OWNER_STANDING_OFFICIAL_SOURCE_POLICY',
        'humanPerArticleApprovalRequired'=>$decision==='OWNER_EXCEPTION_QUEUE',
        'concerns'=>$concerns,'blockers'=>$holds,
        'published'=>false,'automaticCmsWritePerformed'=>false,
        'realAuthenticatedCmsReceiptRequired'=>true,
        'dailyStoryQuota'=>null,
        'originalServerMustIndependentlyReverifyAllProofs'=>true
    ];
}
