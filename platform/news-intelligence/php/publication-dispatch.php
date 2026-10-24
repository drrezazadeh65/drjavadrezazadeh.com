<?php
declare(strict_types=1);
/**
 * JREI News publication persistence for the EXISTING CMS.
 * SOURCE ONLY. The original server must provide the owner's MFA session,
 * route registry, verified source, copyright review, and authentic publisher.
 * No file, network, mail, Cron or sitemap write is performed here.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/candidate-intake.php';
require_once __DIR__.'/owner-editorial.php';

/**
 * Stage an owner-approved immutable version in the original mother DB.
 * $currentPublisherPolicy returns ORIGINAL server-owned rights/route checks;
 * never accept this proof from a browser, crawler or model response.
 */
function jrNewsStageApprovedPublication(
    PDO $pdo,array $session,string $revisionId,
    string $faRoute,string $enRoute,
    callable $currentPublisherPolicy,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($session);
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)||
        $nowEpoch<=0)throw new InvalidArgumentException('news_publication_request_invalid');
    foreach (['fa'=>$faRoute,'en'=>$enRoute] as $lang=>$route) {
        if (!preg_match('#^/'.$lang.'/[a-z0-9/-]{3,240}/$#D',$route)||
            str_contains($route,'//')||str_contains($route,'..'))
            throw new InvalidArgumentException('news_publication_route_invalid');
    }
    if ($faRoute===$enRoute)
        throw new InvalidArgumentException('news_publication_language_collision');
    $pdo->beginTransaction();
    try {
        $lock=$pdo->prepare(
            "SELECT v.revision_id,v.candidate_id,v.approval_digest,
                    v.bilingual_editorial_json,v.editorial_state,
                    v.approved_image_ref,c.source_url,c.content_sha256,
                    dsrc.approved_article_source_id,
                    d.decision_id,d.action_code,d.owner_account_id,
                    d.approval_digest AS decision_digest
             FROM jrei_news_editorial_versions v
             JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
             JOIN jrei_news_discovered_urls dsrc
               ON dsrc.monitor_id=c.monitor_id
              AND BINARY dsrc.canonical_url_sha256=BINARY SHA2(c.source_url,256)
              AND dsrc.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
             JOIN jrei_news_owner_decisions d ON d.revision_id=v.revision_id
             WHERE v.revision_id=? AND d.action_code='APPROVE'
             ORDER BY d.decided_at DESC LIMIT 1 FOR UPDATE"
        );
        $lock->execute([$revisionId]);
        $row=$lock->fetch(PDO::FETCH_ASSOC);
        if (!$row || $row['editorial_state']!=='OWNER_APPROVED' ||
            $row['owner_account_id']!==$owner['actor'] ||
            !hash_equals((string)$row['approval_digest'],
                (string)$row['decision_digest']) ||
            !hash_equals((string)$row['approval_digest'],
                hash('sha256',(string)$row['bilingual_editorial_json']))) {
            throw new RuntimeException('news_publication_owner_approval_missing');
        }
        $policy=$currentPublisherPolicy([
            'revisionId'=>$revisionId,
            'approvalDigest'=>$row['approval_digest'],
            'sourceUrl'=>$row['source_url'],
            'articleSourceId'=>$row['approved_article_source_id'],
            'evidenceSha256'=>$row['content_sha256'],
            'featuredImage'=>$row['approved_image_ref'],
            'faRoute'=>$faRoute,'enRoute'=>$enRoute,
            'ownerAccountId'=>$owner['actor']
        ]);
        if (!is_array($policy) ||
            ($policy['source']??null)!=='ORIGINAL_CMS_AND_JREI_POLICY' ||
            ($policy['ownerMfaCurrent']??null)!==true ||
            ($policy['sourceStillOfficialAndCurrent']??null)!==true ||
            ($policy['imageRightsCurrent']??null)!==true ||
            ($policy['immutableUrlRegistryChecked']??null)!==true ||
            ($policy['noExistingPathCollision']??null)!==true ||
            ($policy['bothLanguagesReviewed']??null)!==true ||
            ($policy['approvalDigest']??null)!==$row['approval_digest']) {
            throw new RuntimeException('news_original_publisher_policy_not_ready');
        }
        $q=$pdo->prepare('SELECT publication_id,fa_route,en_route,publisher_state
            FROM jrei_news_publications WHERE revision_id=? FOR UPDATE');
        $q->execute([$revisionId]);
        $existing=$q->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            if ($existing['fa_route']!==$faRoute ||
                $existing['en_route']!==$enRoute) {
                throw new RuntimeException('news_approved_routes_immutable');
            }
            $pdo->commit();
            return [
                'schema'=>'jr.jrei.news-publishing-stage.v1',
                'publicationId'=>$existing['publication_id'],
                'state'=>$existing['publisher_state'],
                'alreadyStaged'=>true,'publishedByThisCall'=>false
            ];
        }
        $id=jrNewsPrivateUuid();
        $pdo->prepare(
            'INSERT INTO jrei_news_publications
             (publication_id,revision_id,approved_decision_id,
              fa_route,en_route,publisher_state,published_at)
             VALUES(?,?,?,?,?,"WAITING_FOR_PUBLISHER",NULL)'
        )->execute([$id,$revisionId,$row['decision_id'],$faRoute,$enRoute]);
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-publishing-stage.v1',
            'publicationId'=>$id,'state'=>'WAITING_FOR_PUBLISHER',
            'alreadyStaged'=>false,'publishedByThisCall'=>false,
            'existingAuthenticatedPublisherRequired'=>true
        ];
    }catch(Throwable $e){
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Record a real two-language publication receipt. Never infer it from
 * owner approval or an HTTP 200 response alone. An independently authenticated
 * original CMS receipt validator must verify exact artifacts and canonicals.
 */
function jrNewsConfirmOriginalCmsPublication(
    PDO $pdo,string $publicationId,array $serverOwnerPolicy,
    callable $readAndVerifyOriginalCmsReceipt,int $nowEpoch
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$publicationId) ||
        $nowEpoch<=0 ||
        ($serverOwnerPolicy['source']??null)!=='ORIGINAL_PRIVATE_CMS' ||
        ($serverOwnerPolicy['finalIntegratedAcceptanceVerified']??null)!==true ||
        ($serverOwnerPolicy['ownerAuthorizedActivation']??null)!==true) {
        throw new RuntimeException('news_publication_confirmation_disabled');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT p.publication_id,p.fa_route,p.en_route,p.publisher_state,
                    p.publisher_receipt_reference,p.fa_content_sha256,
                    p.en_content_sha256,p.revision_id,
                    v.approval_digest,v.editorial_state,
                    v.bilingual_editorial_json,
                    d.action_code,d.approval_digest AS decision_digest
             FROM jrei_news_publications p
             JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
             JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
             WHERE p.publication_id=? FOR UPDATE'
        );
        $q->execute([$publicationId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if (!$row ||
            !in_array($row['publisher_state'],
                ['WAITING_FOR_PUBLISHER','PUBLISHED'],true) ||
            $row['editorial_state']!=='OWNER_APPROVED' ||
            $row['action_code']!=='APPROVE' ||
            !hash_equals((string)$row['approval_digest'],
                (string)$row['decision_digest']) ||
            !hash_equals((string)$row['approval_digest'],
                hash('sha256',(string)$row['bilingual_editorial_json']))) {
            throw new RuntimeException('news_publisher_receipt_approval_invalid');
        }
        $receipt=$readAndVerifyOriginalCmsReceipt([
            'publicationId'=>$publicationId,'revisionId'=>$row['revision_id'],
            'faRoute'=>$row['fa_route'],'enRoute'=>$row['en_route'],
            'approvalDigest'=>$row['approval_digest']
        ]);
        if (!is_array($receipt)||
            ($receipt['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS' ||
            ($receipt['verified']??null)!==true ||
            ($receipt['faRoute']??null)!==$row['fa_route'] ||
            ($receipt['enRoute']??null)!==$row['en_route'] ||
            ($receipt['approvalDigest']??null)!==$row['approval_digest'] ||
            ($receipt['bothCanonicalDocumentsVerified']??null)!==true ||
            ($receipt['sourceRecheckedAfterPublication']??null)!==true ||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($receipt['faContentSha256']??'')) ||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($receipt['enContentSha256']??'')) ||
            !is_string($receipt['receiptReference']??null) ||
            strlen($receipt['receiptReference'])>200 ||
            strlen($receipt['receiptReference'])<8) {
            throw new RuntimeException('news_original_cms_receipt_not_verified');
        }
        if ($row['publisher_state']==='PUBLISHED') {
            if ($row['fa_content_sha256']!==$receipt['faContentSha256'] ||
                $row['en_content_sha256']!==$receipt['enContentSha256'] ||
                $row['publisher_receipt_reference']!==$receipt['receiptReference']) {
                throw new RuntimeException('news_duplicate_receipt_conflict');
            }
            $pdo->commit();
            return ['status'=>'ALREADY_PUBLISHED','publicationId'=>$publicationId,
                'newPublicWrite'=>false,'originalReceiptVerified'=>true];
        }
        $pdo->prepare(
            "UPDATE jrei_news_publications
             SET publisher_state='PUBLISHED',
                 publisher_receipt_reference=?,
                 fa_content_sha256=?,en_content_sha256=?,published_at=?
             WHERE publication_id=? AND publisher_state='WAITING_FOR_PUBLISHER'"
        )->execute([
            $receipt['receiptReference'],$receipt['faContentSha256'],
            $receipt['enContentSha256'],$nowEpoch,$publicationId
        ]);
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-original-publisher-receipt.v1',
            'status'=>'PUBLISHED','publicationId'=>$publicationId,
            'publicWritePerformedByOriginalCmsNotThisModule'=>true,
            'originalReceiptVerified'=>true,
            'requiresSearchIndexAndFeedRefresh'=>true];
    }catch(Throwable $e){
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}


/**
 * Resolve exact approved bilingual routes from the original immutable
 * owner-reviewed JSON, never from POST body or a model response.
 * This creates a private publication queue entry only, no website write.
 */
function jrNewsStageFromApprovedStoredRouteProposal(
    PDO $pdo,array $ownerSession,string $revisionId,
    callable $currentPublisherPolicy,int $nowEpoch
): array {
    jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)) {
        throw new InvalidArgumentException('news_owner_staged_route_id_invalid');
    }
    $q=$pdo->prepare(
        "SELECT approval_digest,bilingual_editorial_json,editorial_state
         FROM jrei_news_editorial_versions
         WHERE revision_id=? AND editorial_state='OWNER_APPROVED' LIMIT 1"
    );
    $q->execute([$revisionId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!$row ||
        !hash_equals((string)$row['approval_digest'],
            hash('sha256',(string)$row['bilingual_editorial_json']))) {
        throw new RuntimeException('news_staged_approved_draft_tampered');
    }
    $draft=json_decode((string)$row['bilingual_editorial_json'],true,24,
        JSON_INVALID_UTF8_SUBSTITUTE);
    $proposal=is_array($draft)?($draft['routeProposal']??null):null;
    if(!is_array($proposal)||
        ($proposal['schema']??null)!=='jr.jrei.news-bilingual-proposed-routes.v1'||
        !is_string($proposal['faPath']??null)||
        !is_string($proposal['enPath']??null)||
        !preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',$proposal['faPath'])||
        !preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',$proposal['enPath'])) {
        throw new RuntimeException('news_stored_approved_routes_invalid');
    }
    return jrNewsStageApprovedPublication(
        $pdo,$ownerSession,$revisionId,
        $proposal['faPath'],$proposal['enPath'],
        $currentPublisherPolicy,$nowEpoch
    );
}
