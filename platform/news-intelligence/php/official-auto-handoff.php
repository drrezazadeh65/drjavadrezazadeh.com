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
/**
 * Real read-only issuer provenance, bound to the exact original JREI
 * article source ID and canonical URL. This is NOT a news article review
 * and cannot replace independent claim verification or media rights.
 * Never accept a client's boolean isOfficial as input.
 */
function jrNewsOriginalOfficialSourceSnapshot(
    PDO $pdo,string $articleSourceId,string $articleUrl
): array {
    if(preg_match('/^[a-f0-9-]{36}$/iD',$articleSourceId)!==1 ||
       strlen($articleUrl)>1000 ||
       filter_var($articleUrl,FILTER_VALIDATE_URL)===false ||
       strncmp($articleUrl,'https://',8)!==0)
        throw new InvalidArgumentException('news_original_source_lookup_invalid');
    $q=$pdo->prepare(
        'SELECT s.source_locator_uri,s.review_state,s.rights_state,
                s.reviewer_account_id,s.verified_at,s.is_revoked,
                s.is_superseded,p.scheduling_state,p.rights_reviewed,
                p.robots_terms_reviewed,p.transport_reviewed,
                p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                p.transport_evidence_sha256
         FROM jrei_exam_sources s
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         WHERE s.source_id=? LIMIT 1'
    );
    $q->execute([$articleSourceId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)) {
        return ['source'=>'ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY',
            'registryState'=>'MISSING','issuerIdentityVerified'=>false,
            'notRevoked'=>false,'exactSourceUrlApproved'=>false,
            'rightsForPublicNews'=>false,'termsAndRobotsCurrent'=>false];
    }
    $hashesValid=true;
    foreach(['rights_evidence_sha256','robots_terms_evidence_sha256',
             'transport_evidence_sha256'] as $key){
        if(preg_match('/^[a-f0-9]{64}$/D',(string)($row[$key]??''))!==1){
            $hashesValid=false;break;
        }
    }
    $approved=$row['scheduling_state']==='APPROVED'&&
        (int)$row['rights_reviewed']===1&&
        (int)$row['robots_terms_reviewed']===1&&
        (int)$row['transport_reviewed']===1&&$hashesValid;
    return [
        'source'=>'ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY',
        'registryState'=>$row['review_state'],
        'issuerIdentityVerified'=>!empty($row['reviewer_account_id'])&&
            !empty($row['verified_at']),
        'notRevoked'=>(int)$row['is_revoked']===0&&
            (int)$row['is_superseded']===0,
        'exactSourceUrlApproved'=>hash_equals(
            (string)$row['source_locator_uri'],$articleUrl),
        'rightsForPublicNews'=>$approved&&
            $row['rights_state']==='PERMITTED_REPRODUCTION',
        'termsAndRobotsCurrent'=>$approved
    ];
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
