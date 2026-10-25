<?php
declare(strict_types=1);
/**
 * Owner-governed correction/retraction AFTER the ORIGINAL authenticated CMS
 * has independently installed the exact bilingual notice or verified 404.
 * SOURCE ONLY. A request body, model, crawler or claimed HTTP 200 is not
 * independent publisher evidence. No public files, crawlers, mail or sitemap
 * writes are performed here.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/owner-editorial.php';

function jrNewsConfirmReviewedRetraction(
    PDO $pdo,array $ownerSession,string $publicationId,string $reason,
    callable $readAndVerifyOriginalCmsRetraction,
    callable $suppressExistingQueuedNewsDistributions,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)||
       strlen(trim($reason))<15||strlen($reason)>2000||
       preg_match('//u',$reason)!==1||$nowEpoch<=0)
        throw new InvalidArgumentException('news_retraction_owner_input_invalid');

    // Resolve the pre-existing original publisher receipt and BOTH exact
    // canonical routes before querying the trusted CMS. No InnoDB lock is
    // held across external publisher verification.
    $sql='SELECT publication_id,revision_id,publisher_state,
                 fa_route,en_route,publisher_receipt_reference,
                 fa_content_sha256,en_content_sha256
          FROM jrei_news_publications WHERE publication_id=?';
    $q=$pdo->prepare($sql);$q->execute([$publicationId]);
    $observed=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($observed))
        throw new RuntimeException('news_retraction_publication_missing');
    if($observed['publisher_state']==='RETRACTED')
        return ['state'=>'ALREADY_RETRACTED','publicationId'=>$publicationId,
            'additionalPublicAction'=>false];
    if($observed['publisher_state']!=='PUBLISHED'||
       !is_string($observed['publisher_receipt_reference'])||
       strlen($observed['publisher_receipt_reference'])<8)
        throw new RuntimeException('news_retraction_not_a_verified_publication');

    // This callable MUST be injected exclusively by the original server-side
    // CMS authority. Browser JSON cannot supply or override its result.
    $receipt=$readAndVerifyOriginalCmsRetraction([
        'publicationId'=>$publicationId,
        'revisionId'=>$observed['revision_id'],
        'faRoute'=>$observed['fa_route'],
        'enRoute'=>$observed['en_route'],
        'originalPublisherReceipt'=>$observed['publisher_receipt_reference'],
        'faPublishedContentSha256'=>$observed['fa_content_sha256'],
        'enPublishedContentSha256'=>$observed['en_content_sha256'],
        'ownerAccountId'=>$owner['actor']
    ]);
    if(!is_array($receipt)||
       ($receipt['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS'||
       ($receipt['verified']??null)!==true||
       ($receipt['originalOwnerApprovalCurrent']??null)!==true||
       ($receipt['bothCanonicalRoutesVerified']??null)!==true||
       ($receipt['canonicalAndSitemapUpdated']??null)!==true||
       ($receipt['publicationId']??null)!==$publicationId||
       ($receipt['originalPublisherReceipt']??null)!==
           $observed['publisher_receipt_reference']||
       ($receipt['faRoute']??null)!==$observed['fa_route']||
       ($receipt['enRoute']??null)!==$observed['en_route']||
       !in_array($receipt['faOutcome']??null,
           ['RETRACTION_NOTICE','VERIFIED_404'],true)||
       !in_array($receipt['enOutcome']??null,
           ['RETRACTION_NOTICE','VERIFIED_404'],true)||
       !preg_match('/^[a-f0-9]{64}$/D',
           (string)($receipt['faVerifiedContentSha256']??''))||
       !preg_match('/^[a-f0-9]{64}$/D',
           (string)($receipt['enVerifiedContentSha256']??''))||
       !is_int($receipt['verifiedAtEpoch']??null)||
       $receipt['verifiedAtEpoch']<$nowEpoch-900||
       $receipt['verifiedAtEpoch']>$nowEpoch+60||
       !is_string($receipt['receiptReference']??null)||
       strlen($receipt['receiptReference'])<8||
       strlen($receipt['receiptReference'])>200) {
        throw new RuntimeException('news_original_cms_retraction_not_verified');
    }
    $pdo->beginTransaction();
    try {
        // An intervening CMS receipt change, concurrent withdrawal or new
        // revision cannot inherit yesterday's verification decision.
        $locked=$pdo->prepare($sql.' FOR UPDATE');
        $locked->execute([$publicationId]);
        $current=$locked->fetch(PDO::FETCH_ASSOC);
        if(!is_array($current)||$current!==$observed)
            throw new RuntimeException('news_retraction_changed_during_cms_review');
        $changed=$pdo->prepare(
            "UPDATE jrei_news_publications
             SET publisher_state='RETRACTED'
             WHERE publication_id=? AND publisher_state='PUBLISHED'"
        );
        $changed->execute([$publicationId]);
        if($changed->rowCount()!==1)
            throw new RuntimeException('news_retraction_state_transition_failed');
        $pdo->prepare(
            "UPDATE jrei_news_search_documents SET index_state='RETRACTED'
             WHERE publication_id=? AND index_state='PUBLISHED'"
        )->execute([$publicationId]);
        // Original eco/AWOSE queue suppression port: SQL-only, uses this
        // transaction's PDO. Never perform external delivery from this port.
        $suppressed=$suppressExistingQueuedNewsDistributions(
            $pdo,$publicationId,'NEWS_RETRACTED'
        );
        if(!is_int($suppressed)||$suppressed<0)
            throw new RuntimeException('news_retraction_distribution_suppression_failed');
        if(function_exists('operationsAudit')){
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_owner_retraction_confirmed',
                hash('sha256',$publicationId.'|'.$reason.'|'.
                    $receipt['faVerifiedContentSha256'].'|'.
                    $receipt['enVerifiedContentSha256'].'|'.
                    $receipt['receiptReference']));
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-owner-retraction-receipt.v1',
            'publicationId'=>$publicationId,'state'=>'RETRACTED',
            'formerEvidencePreserved'=>true,
            'newsSearchResultWithdrawn'=>true,
            'pendingDistributionSuppressed'=>$suppressed,
            'originalCmsRetractionVerified'=>true,
            'bothOriginalCmsLanguageRoutesVerified'=>true,
            'noPublicFilesWrittenByThisFunction'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
