<?php
declare(strict_types=1);
/**
 * Owner-approved correction/retraction record after ORIGINAL CMS has
 * independently published a transparent editorial notice or withdrawn
 * the original public page. Preserves prior evidence and audit revisions.
 * It does not silently delete a page or execute a site deployment.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';

function jrNewsConfirmReviewedRetraction(
    PDO $pdo,array $ownerSession,string $publicationId,
    string $reason,array $originalCmsRetractionReceipt,
    callable $suppressExistingQueuedNewsDistributions,
    int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)||
        !is_string($reason)||strlen(trim($reason))<15||
        strlen($reason)>2000||$nowEpoch<=0) {
        throw new InvalidArgumentException('news_retraction_owner_input_invalid');
    }
    if (($originalCmsRetractionReceipt['source']??null)!==
            'ORIGINAL_AUTHENTICATED_CMS'||
        ($originalCmsRetractionReceipt['originalOwnerApprovalCurrent']??null)!==true||
        ($originalCmsRetractionReceipt['samePublicationId']??null)!==$publicationId||
        ($originalCmsRetractionReceipt['noticeVisibleOrProper404']??null)!==true||
        ($originalCmsRetractionReceipt['canonicalAndSitemapUpdated']??null)!==true||
        !preg_match('/^[a-f0-9]{64}$/D',
            (string)($originalCmsRetractionReceipt['noticeContentSha256']??''))) {
        throw new RuntimeException('news_original_cms_retraction_not_verified');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT publication_id,publisher_state,revision_id,
                    fa_route,en_route
             FROM jrei_news_publications
             WHERE publication_id=? FOR UPDATE'
        );
        $q->execute([$publicationId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if (!$row)throw new RuntimeException('news_retraction_publication_missing');
        if ($row['publisher_state']==='RETRACTED'){
            $pdo->commit();
            return ['state'=>'ALREADY_RETRACTED','publicationId'=>$publicationId,
                'additionalPublicAction'=>false];
        }
        if ($row['publisher_state']!=='PUBLISHED')
            throw new RuntimeException('news_retraction_not_a_published_article');
        $pdo->prepare(
            "UPDATE jrei_news_publications
             SET publisher_state='RETRACTED'
             WHERE publication_id=? AND publisher_state='PUBLISHED'"
        )->execute([$publicationId]);
        $pdo->prepare(
            "UPDATE jrei_news_search_documents
             SET index_state='RETRACTED'
             WHERE publication_id=? AND index_state='PUBLISHED'"
        )->execute([$publicationId]);
        $suppressed=$suppressExistingQueuedNewsDistributions(
            $pdo,$publicationId,'NEWS_RETRACTED'
        );
        if (!is_int($suppressed)||$suppressed<0)
            throw new RuntimeException('news_retraction_distribution_suppression_failed');
        if (function_exists('operationsAudit')) {
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_owner_retraction_confirmed',
                hash('sha256',$publicationId.'|'.$reason.'|'.
                    $originalCmsRetractionReceipt['noticeContentSha256']));
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-owner-retraction-receipt.v1',
            'publicationId'=>$publicationId,
            'state'=>'RETRACTED',
            'formerEvidencePreserved'=>true,
            'newsSearchResultWithdrawn'=>true,
            'pendingDistributionSuppressed'=>$suppressed,
            'originalCmsRetractionVerified'=>true,
            'noPublicFilesWrittenByThisFunction'=>true
        ];
    }catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
