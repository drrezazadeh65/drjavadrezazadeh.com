<?php
declare(strict_types=1);
/**
 * READ-ONLY owner MFA publication preflight. Original release/route authority
 * is deliberately NOT inferred from filesystem vacancy, owner approval or
 * this report. This file never stages, renders, writes or deploys content.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/owner-editorial.php';

function jrNewsOwnerPublicationReadiness(
    PDO $pdo,array $ownerSession,string $revisionId,
    callable $originalSourceCurrent,string $publicDocumentRoot
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId))
        throw new InvalidArgumentException('news_publisher_preflight_revision_invalid');
    $blocked=['ORIGINAL_CMS_PUBLISHER_NOT_CONNECTED',
        'IMMUTABLE_ROUTE_REGISTRY_NOT_VERIFIED',
        'MEDIA_REPUBLICATION_RIGHTS_NOT_RECHECKED'];
    $checks=[
        'ownerApprovalAndExactDigest'=>false,
        'licensedOriginalSourceCurrent'=>false,
        'bilingualRoutesFromApprovedDraft'=>false,
        'existingFilesystemRouteCollisionAbsent'=>null,
        'immutableOriginalRouteRegistryVerified'=>false,
        'originalCmsPublisherConnected'=>false,
        'licensedMediaCurrent'=>false
    ];
    $paths=['fa'=>null,'en'=>null];
    try {
        $q=$pdo->prepare(
            "SELECT v.approval_digest,v.bilingual_editorial_json,v.editorial_state,
                    d.action_code,d.approval_digest AS decision_digest,
                    c.source_url,c.content_sha256,
                    discovered.approved_article_source_id AS article_source_id
             FROM jrei_news_editorial_versions v
             JOIN jrei_news_owner_decisions d
               ON BINARY d.revision_id=BINARY v.revision_id
             JOIN jrei_news_candidates c
               ON BINARY c.candidate_id=BINARY v.candidate_id
             JOIN jrei_news_discovered_urls discovered
               ON BINARY discovered.monitor_id=BINARY c.monitor_id
              AND BINARY discovered.canonical_url_sha256=BINARY SHA2(c.source_url,256)
             WHERE v.revision_id=? AND d.owner_account_id=?
               AND d.action_code='APPROVE'
               AND discovered.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
             ORDER BY d.decided_at DESC LIMIT 1"
        );
        $q->execute([$revisionId,$owner['actor']]);
        $record=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($record)||$record['editorial_state']!=='OWNER_APPROVED'||
           !is_string($record['approval_digest'])||
           !preg_match('/^[a-f0-9]{64}$/D',$record['approval_digest'])||
           !hash_equals($record['approval_digest'],(string)$record['decision_digest'])||
           !hash_equals($record['approval_digest'],
             hash('sha256',(string)$record['bilingual_editorial_json']))) {
            $blocked[]='ORIGINAL_OWNER_APPROVAL_NOT_CURRENT';
        } else {
            $checks['ownerApprovalAndExactDigest']=true;
            $draft=json_decode((string)$record['bilingual_editorial_json'],
                true,24,JSON_THROW_ON_ERROR);
            $routeProposal=is_array($draft)?($draft['routeProposal']??null):null;
            if(is_array($routeProposal)&&
               ($routeProposal['schema']??null)==='jr.jrei.news-bilingual-proposed-routes.v1'&&
               is_string($routeProposal['faPath']??null)&&
               is_string($routeProposal['enPath']??null)&&
               preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',$routeProposal['faPath'])&&
               preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',$routeProposal['enPath'])) {
                $paths=['fa'=>$routeProposal['faPath'],
                        'en'=>$routeProposal['enPath']];
                $checks['bilingualRoutesFromApprovedDraft']=true;
                $root=realpath($publicDocumentRoot);
                if(is_string($root)&&is_dir($root)){
                    $occupied=false;
                    foreach($paths as $uri){
                        $target=$root.DIRECTORY_SEPARATOR.
                            str_replace('/',DIRECTORY_SEPARATOR,ltrim($uri,'/'));
                        if(file_exists($target)||is_link($target))$occupied=true;
                    }
                    $checks['existingFilesystemRouteCollisionAbsent']=!$occupied;
                    if($occupied)$blocked[]='PUBLIC_FILESYSTEM_ROUTE_COLLISION';
                } else $blocked[]='ORIGINAL_PUBLIC_DOCUMENT_ROOT_UNAVAILABLE';
            } else $blocked[]='APPROVED_BILINGUAL_ROUTE_PROPOSAL_INVALID';
            $receipt=$originalSourceCurrent(
                (string)$record['article_source_id'],
                (string)$record['source_url'],
                (string)$record['content_sha256']
            );
            if(is_array($receipt)&&
               ($receipt['source']??null)==='ORIGINAL_JREI_SOURCE_RECHECK'&&
               ($receipt['current']??null)===true&&
               ($receipt['rightsApproved']??null)===true&&
               ($receipt['currentEvidenceSha256']??null)===$record['content_sha256']){
                $checks['licensedOriginalSourceCurrent']=true;
            } else $blocked[]='ORIGINAL_SOURCE_RIGHTS_OR_EVIDENCE_STALE';
        }
    }catch(Throwable $e){
        // No schema or private-data details in an owner-facing result.
        $blocked[]='MOTHER_DATABASE_EDITORIAL_EVIDENCE_UNAVAILABLE';
    }
    return [
        'schema'=>'jr.jrei.news-owner-publication-readiness.v1',
        'revisionId'=>$revisionId,
        'state'=>'BLOCKED_ORIGINAL_PUBLISHER',
        'routes'=>$paths,'checks'=>$checks,
        'blockers'=>array_values(array_unique($blocked)),
        'publisherReady'=>false,'published'=>false,
        'filesystemWritePerformed'=>false,
        'originalCmsReceiptVerified'=>false,
        'operatorAction'=>'WIRE_VERIFIED_ORIGINAL_CMS_PUBLISHER_AND_ROUTE_REGISTRY'
    ];
}
