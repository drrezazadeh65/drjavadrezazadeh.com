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

/**
 * Read-only original mother-DB binding for a candidate's exact article,
 * immutable bilingual draft hash and independent evidence review. The only
 * callback allowed is a server-owned, original JREI/CMS policy resolver;
 * this is NOT an HTTP route and writes NO publication authorization.
 * Every fact must be freshly rechecked by the future transactional publisher.
 */
function jrNewsOriginalAutoHandoffReadiness(
    PDO $pdo,string $revisionId,callable $originalQualityAndCmsResolver
): array {
    if(preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)!==1)
        throw new InvalidArgumentException('news_official_revision_invalid');
    $stmt=$pdo->prepare(
        "SELECT v.revision_id,v.bilingual_editorial_json,v.approval_digest,
                v.editorial_state,c.source_url,c.content_sha256,
                d.approved_article_source_id,e.verification_state,
                e.issuer_verified,e.usage_rights_verified,
                e.content_sha256 AS reviewed_sha
         FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         JOIN jrei_news_monitors m ON m.monitor_id=c.monitor_id
             AND m.enabled=1
         JOIN jrei_news_discovered_urls d
             ON d.monitor_id=c.monitor_id
            AND BINARY d.canonical_url_sha256=BINARY SHA2(c.source_url,256)
            AND d.canonical_article_url=c.source_url
            AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
         JOIN jrei_news_evidence_reviews e
             ON e.review_id=v.evidence_review_id
            AND e.candidate_id=c.candidate_id
         WHERE v.revision_id=? LIMIT 1"
    );
    $stmt->execute([$revisionId]);
    $row=$stmt->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))return [
        'decision'=>'SYSTEM_HOLD','reason'=>'CURRENT_PRIVATE_DRAFT_NOT_READY',
        'published'=>false,'originalCmsWritePerformed'=>false
    ];
    $json=(string)$row['bilingual_editorial_json'];
    $sha=(string)$row['content_sha256'];
    if($row['editorial_state']!=='PENDING_OWNER_APPROVAL'||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$row['approval_digest'])||
       !hash_equals((string)$row['approval_digest'],hash('sha256',$json))||
       $row['verification_state']!=='APPROVED'||
       (int)$row['issuer_verified']!==1||
       (int)$row['usage_rights_verified']!==1||
       !hash_equals($sha,(string)$row['reviewed_sha'])||
       !preg_match('/^[a-f0-9]{64}$/D',$sha)){
        return [
            'decision'=>'SYSTEM_HOLD','reason'=>'PRIVATE_REVIEW_OR_DIGEST_INVALID',
            'published'=>false,'originalCmsWritePerformed'=>false
        ];
    }
    $draft=json_decode($json,true,24,JSON_THROW_ON_ERROR);
    $routes=is_array($draft)?($draft['routeProposal']??null):null;
    if(!is_array($routes)||
       ($routes['schema']??null)!=='jr.jrei.news-bilingual-proposed-routes.v1'||
       !preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',(string)($routes['faPath']??''))||
       !preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',
            (string)($routes['enPath']??''))){
        return [
            'decision'=>'SYSTEM_HOLD','reason'=>'SIGNED_BILINGUAL_ROUTES_INVALID',
            'published'=>false,'originalCmsWritePerformed'=>false
        ];
    }
    $source=jrNewsOriginalOfficialSourceSnapshot(
        $pdo,(string)$row['approved_article_source_id'],
        (string)$row['source_url']
    );
    // Do not invoke the model, CMS or quality resolver for a source whose
    // original article-specific acquisition/public rights are not current.
    // This is the only point at which a doubtful source enters owner review.
    if($source['registryState']!=='AUTHORITATIVE_REVIEWED'||
       $source['issuerIdentityVerified']!==true||
       $source['notRevoked']!==true||
       $source['exactSourceUrlApproved']!==true||
       $source['rightsForPublicNews']!==true||
       $source['termsAndRobotsCurrent']!==true){
        $blocked=jrNewsOfficialPublicationDecision(
            ['evidenceSha256'=>$sha],$source,[],[],[]
        );
        $blocked['revisionId']=$revisionId;
        $blocked['requiresTransactionalPublisherRecheck']=true;
        return $blocked;
    }
    $resolved=$originalQualityAndCmsResolver([
        'revisionId'=>$revisionId,
        'approvalDigest'=>$row['approval_digest'],
        'sourceId'=>$row['approved_article_source_id'],
        'sourceUrl'=>$row['source_url'],
        'evidenceSha256'=>$sha,
        'faRoute'=>$routes['faPath'],'enRoute'=>$routes['enPath']
    ]);
    if(!is_array($resolved)||
       ($resolved['source']??null)!=='ORIGINAL_JREI_PRIVATE_NEWS_POLICY'||
       !is_array($resolved['evidence']??null)||
       !is_array($resolved['editorial']??null)||
       !is_array($resolved['publisher']??null)){
        return [
            'decision'=>'SYSTEM_HOLD','reason'=>'ORIGINAL_POLICY_PORT_UNAVAILABLE',
            'published'=>false,'originalCmsWritePerformed'=>false
        ];
    }
    $decision=jrNewsOfficialPublicationDecision(
        ['evidenceSha256'=>$sha],$source,$resolved['evidence'],
        $resolved['editorial'],$resolved['publisher']
    );
    $decision['revisionId']=$revisionId;
    $decision['requiresTransactionalPublisherRecheck']=true;
    $decision['standingOwnerPolicyMustBeRecordedByOriginalCms']=true;
    return $decision;
}
