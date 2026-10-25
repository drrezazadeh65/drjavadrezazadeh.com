<?php
declare(strict_types=1);
/**
 * Bind the JREI News source contracts to the EXISTING operations session,
 * never a parallel owner identity or public API. The caller has already
 * authenticated SUPER_ADMIN and recent TOTP, and verified the exact CSRF.
 * Source only: BOTH independent release flags default OFF.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
// Never load a source-only module at operations.php bootstrap. A release
// may ship with News disabled, and platform/ is deliberately absent from
// public_html. All established customer/admin API routes must still work.

/**
 * Exact, private, READ-ONLY original KA evidence review for an owner approval.
 * Does not publish, fetch URLs, mutate source records or bypass SCIENCE gates.
 * Every missing table/policy/digest fails closed; original JREI-KA is the sole
 * source of authority and the original owner MFA route remains mandatory.
 */
function jrNewsRecheckOriginalArticleReceipt(
    PDO $pdo,string $articleSourceId,string $articleUrl,string $contentSha256
): array {
    $denied=['source'=>'ORIGINAL_JREI_SOURCE_RECHECK',
        'current'=>false,'rightsApproved'=>false,'currentEvidenceSha256'=>null];
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$articleSourceId) ||
       !preg_match('/^[a-f0-9]{64}$/D',$contentSha256) ||
       strlen($articleUrl)<12 || strlen($articleUrl)>1000 ||
       preg_match('/[[:cntrl:][:space:]]/',$articleUrl))
        return $denied;
    $parts=parse_url($articleUrl);
    if(!is_array($parts)||($parts['scheme']??null)!=='https'||
       empty($parts['host'])||isset($parts['user'])||isset($parts['pass'])||
       isset($parts['fragment'])||
       (isset($parts['port'])&&(int)$parts['port']!==443)||
       filter_var((string)$parts['host'],FILTER_VALIDATE_IP)!==false)
        return $denied;
    $sql=<<<'SQL'
SELECT o.content_sha256 AS verified_digest
FROM jrei_news_discovered_urls d
JOIN jrei_news_monitors n ON BINARY n.monitor_id=BINARY d.monitor_id AND n.enabled=1
JOIN jrei_exam_sources f ON BINARY f.source_id=BINARY n.jrei_source_reference
JOIN jrei_ka_source_policies fp
  ON BINARY fp.source_id=BINARY f.source_id AND fp.revision=n.policy_revision
JOIN jrei_exam_sources a
  ON BINARY a.source_id=BINARY d.approved_article_source_id
 AND BINARY a.source_locator_uri=BINARY d.canonical_article_url
JOIN jrei_ka_source_policies ap ON BINARY ap.source_id=BINARY a.source_id
JOIN jrei_ka_private_observations o
  ON BINARY o.source_id=BINARY a.source_id AND o.source_policy_revision=ap.revision
 AND BINARY o.source_uri_sha256=BINARY d.canonical_url_sha256
JOIN jrei_ka_jobs j
  ON BINARY j.job_id=BINARY o.job_id AND BINARY j.source_id=BINARY o.source_id
 AND j.source_policy_revision=o.source_policy_revision
 AND BINARY j.observed_digest=BINARY o.content_sha256
 AND j.job_state='ACQUIRED_REVIEW'
WHERE a.source_id=? AND BINARY d.canonical_article_url=BINARY ?
  AND BINARY o.content_sha256=BINARY ?
  AND BINARY d.canonical_url_sha256=BINARY SHA2(a.source_locator_uri,256)
  AND BINARY n.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
  AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
  AND f.review_state='AUTHORITATIVE_REVIEWED'
  AND f.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND f.is_revoked=0 AND f.is_superseded=0
  AND f.verified_at IS NOT NULL AND f.reviewer_account_id IS NOT NULL
  AND fp.scheduling_state='APPROVED'
  AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
  AND fp.transport_reviewed=1
  AND fp.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND fp.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND fp.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND a.review_state='AUTHORITATIVE_REVIEWED'
  AND a.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND a.is_revoked=0 AND a.is_superseded=0
  AND a.verified_at IS NOT NULL AND a.reviewer_account_id IS NOT NULL
  AND ap.scheduling_state='APPROVED'
  AND ap.rights_reviewed=1 AND ap.robots_terms_reviewed=1
  AND ap.transport_reviewed=1
  AND ap.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND ap.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND ap.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND o.mime_type='text/html'
  AND o.state='PENDING_SCIENTIFIC_REVIEW'
  AND o.rights_state_at_acquisition IN
    ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND o.bytes_total BETWEEN 50 AND 8388608
  AND o.private_object_key=BINARY CONCAT(o.content_sha256,'.bin')
LIMIT 1
SQL;
    try {
        $q=$pdo->prepare($sql);
        $q->execute([$articleSourceId,$articleUrl,$contentSha256]);
        $digest=$q->fetchColumn();
        if(!is_string($digest)||!hash_equals($contentSha256,$digest))
            return $denied;
        return ['source'=>'ORIGINAL_JREI_SOURCE_RECHECK',
            'current'=>true,'rightsApproved'=>true,
            'currentEvidenceSha256'=>$digest];
    }catch(Throwable $e){
        return $denied;
    }
}

function jrOperationsNewsDispatch(
    PDO $pdo,array $config,string $route,string $method,
    array $body,string $ownerId,string $mfaSessionHash
): array {
    if(!in_array($method,['GET','POST'],true)||
       !preg_match('#^/owner/[a-z0-9/-]{1,90}$#D',$route)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$ownerId)||
       !preg_match('/^[a-f0-9]{64}$/D',$mfaSessionHash))
        throw new InvalidArgumentException('news_owner_original_route_invalid');
    if(($config['jrei_news_integrated_release_accepted']??false)!==true||
       getenv('JR_JREI_NEWS_API_ENABLED')!=='true')
        throw new DomainException('news_original_integration_not_accepted');
    // This library is deployed only into the existing HTTP-denied api/internal/
    // directory. It is loaded AFTER both trusted activation flags are checked,
    // never while bootstrapping the ordinary operations controller.
    $newsLibrary=__DIR__.'/internal/jrei-news/news-library.php';
    if(!is_file($newsLibrary)||!is_readable($newsLibrary))
        throw new DomainException('news_original_private_library_unavailable');
    require_once $newsLibrary;
    // The caller constructed this context only from the existing PHP
    // operationsRoute verified session + TOTP + same-origin CSRF, never JSON.
    $owner=[
        'source'=>'EXISTING_OPERATIONS_SESSION',
        'ownerAuthenticated'=>true,'mfaVerified'=>true,
        'csrfVerified'=>true,'scope'=>'JREI_NEWS_EDITORIAL',
        'accountId'=>$ownerId,
        'mfaAuditReference'=>'operations-mfa:'.substr($mfaSessionHash,0,64)
    ];
    $ctx=[
        'originalApiBootstrap'=>true,
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true,
        'existingOwnerMfaSession'=>$owner
    ];
    // All unsupported original integration ports deliberately throw.
    // A source-only bridge can list/read/stage/PAUSE approved metadata but
    // cannot counterfeit CMS receipts, Eco consent, independent review,
    // payment, journalism or mail delivery.
    $unavailable=static function(): never {
        throw new DomainException('news_original_external_port_not_accepted');
    };
    $ports=[];
    if(($config['jrei_news_source_activation_accepted']??false)===true){
        $ports['originalNewsMonitorActivationPolicy']=
          static function(string $monitorId,string $actor)use($ownerId):array{
            if($actor!==$ownerId||
               !preg_match('/^[a-f0-9-]{36}$/iD',$monitorId))
                throw new DomainException('news_owner_monitor_policy_invalid');
            return [
                'source'=>'ORIGINAL_OWNER_APPROVED_JREI_RELEASE',
                'finalIntegratedAcceptanceVerified'=>true,
                'newsMonitoringActivatedByOwner'=>true
            ];
          };
    }
    $sourceCurrent=static fn(string $sourceId,string $uri,string $digest):array=>
        jrNewsRecheckOriginalArticleReceipt($pdo,$sourceId,$uri,$digest);
    $ports['originalNewsPublicationPreflight']=
        static function(PDO $db,array $owner,string $revisionId)
          use($sourceCurrent):array {
            return jrNewsOwnerPublicationReadiness(
                $db,$owner,$revisionId,$sourceCurrent,dirname(__DIR__)
            );
        };
    return jrNewsDispatchApi(
        $pdo,$method,'/news/v1'.$route,$body,$ctx,
        $unavailable,
        static fn():bool=>false,
        $sourceCurrent,$unavailable,$ports
    );
}
