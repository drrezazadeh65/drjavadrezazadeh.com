<?php
declare(strict_types=1);
/**
 * JREI News candidate intake — source reviewed acquisition only.
 *
 * A successful licensed download only authorizes PRIVATE metadata staging;
 * a news claim still needs issuer verification and owner publication approval.
 * This source-only file is not loaded by any live worker or public route.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/official-feed-extractor.php';

function jrNewsPrivateUuid(): string {
    $b=random_bytes(16);
    $b[6]=chr((ord($b[6]) & 15) | 64);
    $b[8]=chr((ord($b[8]) & 63) | 128);
    $s=bin2hex($b);
    return substr($s,0,8).'-'.substr($s,8,4).'-'.
        substr($s,12,4).'-'.substr($s,16,4).'-'.substr($s,20,12);
}

/** Only a mother-DB-owned receipt from the governed JREI source registry. */
function jrNewsPersistObservedCandidate(
    PDO $pdo, array $candidate, array $sourceAuthority,
    callable $independentJreiObservationReader, int $now
): array {
    if ($now<=0 ||
        ($candidate['schema']??null)!=='jr.jrei.news-feed-candidate.v1' ||
        ($candidate['evidenceStatus']??null)!=='UNREVIEWED_METADATA' ||
        !is_string($candidate['sourceId']??null) ||
        !is_string($candidate['title']??null) ||
        (function_exists('mb_strlen') ?
            mb_strlen($candidate['title'],'UTF-8')>240 :
            strlen($candidate['title'])>720) ||
        trim($candidate['title'])==='' ||
        !is_string($candidate['url']??null) ||
        strlen($candidate['url'])>1000 ||
        ($sourceAuthority['source']??null)!=='PRIVATE_JREI_SOURCE_REGISTRY' ||
        ($sourceAuthority['reviewStatus']??null)!=='APPROVED' ||
        ($sourceAuthority['usageRights']??null)!=='PUBLIC_REUSE_APPROVED' ||
        ($sourceAuthority['termsApproved']??null)!==true ||
        ($sourceAuthority['robotsApproved']??null)!==true ||
        ($sourceAuthority['sourceId']??null)!==$candidate['sourceId']) {
        throw new InvalidArgumentException('news_source_intake_not_authorized');
    }
    $approvedOrigin=parse_url((string)($sourceAuthority['canonicalUrl']??''),PHP_URL_HOST);
    if (!is_string($approvedOrigin)||$approvedOrigin==='') {
        throw new RuntimeException('news_source_origin_missing');
    }
    $url=jrNewsFeedPublicUrl($candidate['url'],strtolower($approvedOrigin));
    if ($url===null)throw new RuntimeException('news_source_url_outside_registry');
    $existingReceipt=$independentJreiObservationReader($candidate['sourceId'],
        $candidate['sourceFingerprint']);
    if (!is_array($existingReceipt) ||
        ($existingReceipt['source']??null)!=='ORIGINAL_JREI_PRIVATE_OBSERVATION' ||
        ($existingReceipt['sourceId']??null)!==$candidate['sourceId'] ||
        ($existingReceipt['sourcePolicyCurrent']??null)!==true ||
        !preg_match('/^[a-f0-9]{64}$/D',
            (string)($existingReceipt['contentSha256']??'')) ||
        ($existingReceipt['privateBytesAcquired']??null)!==true) {
        throw new RuntimeException('news_observation_requires_original_jrei_evidence');
    }
    $contentHash=$existingReceipt['contentSha256'];
    $sourceHash=hash('sha256',$url);
    $fingerprint=hash('sha256',$candidate['sourceId'].'|'.$url.'|'.$contentHash);
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT monitor_id FROM jrei_news_monitors
             WHERE jrei_source_reference=? AND source_url_sha256=?
               AND enabled=1 LIMIT 1 FOR UPDATE'
        );
        $q->execute([$candidate['sourceId'],
            hash('sha256',(string)$sourceAuthority['canonicalUrl'])]);
        $monitor=$q->fetch(PDO::FETCH_ASSOC);
        if (!$monitor)throw new RuntimeException('news_monitor_not_owner_enabled');
        $q=$pdo->prepare(
            'SELECT candidate_id FROM jrei_news_candidates
             WHERE fingerprint_sha256=? LIMIT 1 FOR UPDATE'
        );
        $q->execute([$fingerprint]);
        $existing=$q->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            $pdo->commit();
            return ['state'=>'ALREADY_STAGED',
                'candidateId'=>$existing['candidate_id'],
                'publicationAuthorized'=>false];
        }
        $id=jrNewsPrivateUuid();
        $q=$pdo->prepare(
            'INSERT INTO jrei_news_candidates
             (candidate_id,monitor_id,fingerprint_sha256,source_url,
              content_sha256,headline,event_type,priority_code,
              source_published_at,first_observed_at,state)
             VALUES(?,?,?,?,?,?,?,?,
                    ?,?,"PENDING_EVIDENCE_VERIFICATION")'
        );
        $publishedAt=$candidate['sourcePublishedAt']??null;
        $publishedTs=null;
        if (is_string($publishedAt)) {
            $timestamp=strtotime($publishedAt);
            if ($timestamp!==false && $timestamp>0) $publishedTs=$timestamp;
        }
        $q->execute([$id,$monitor['monitor_id'],$fingerprint,$url,
            $contentHash,$candidate['title'],
            'GENERAL_EDUCATION','P2',$publishedTs,$now]);
        $pdo->commit();
        return ['state'=>'PENDING_EVIDENCE_VERIFICATION',
            'candidateId'=>$id,'fingerprint'=>$fingerprint,
            'publicationAuthorized'=>false,
            'ownerReviewRequired'=>true];
    } catch (Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
