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
        strlen($candidate['title'])>720 ||
        preg_match('//u',$candidate['title'])!==1 ||
        preg_match_all('/./us',$candidate['title'])>240 ||
        trim($candidate['title'])==='' ||
        !is_string($candidate['url']??null) ||
        strlen($candidate['url'])>1000 ||
        ($sourceAuthority['source']??null)!=='PRIVATE_JREI_SOURCE_REGISTRY' ||
        ($sourceAuthority['reviewStatus']??null)!=='APPROVED' ||
        !in_array(($sourceAuthority['usageRights']??null),
            ['METADATA_ONLY','PUBLIC_REUSE_APPROVED'],true) ||
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
    // This is a deterministic feed-discovery fingerprint, not authority.
    // Recompute it from the exact original source and canonical URL before
    // asking the independent JREI observation reader for stored evidence.
    $fingerprintFromFeed=hash('sha256',$candidate['sourceId'].'|'.$url);
    if(!is_string($candidate['sourceFingerprint']??null)||
       !hash_equals($fingerprintFromFeed,$candidate['sourceFingerprint']))
        throw new RuntimeException('news_feed_candidate_fingerprint_changed');
    $existingReceipt=$independentJreiObservationReader(
        $candidate['url'],$candidate['sourceId'],
        $candidate['sourceFingerprint']);
    if (!is_array($existingReceipt) ||
        ($existingReceipt['source']??null)!=='ORIGINAL_JREI_PRIVATE_OBSERVATION' ||
        !is_string($existingReceipt['sourceId']??null) ||
        ($existingReceipt['articleCanonicalUrl']??null)!==$url ||
        ($existingReceipt['contentKind']??null)!=='PUBLIC_HTML_ARTICLE' ||
        ($existingReceipt['articleSourceRightsApproved']??null)!==true ||
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
        // A prior feed observation is not current acquisition authority.
        // Re-read original JREI rights and source-policy revision while
        // staging; the monitor alone is never a parallel permission grant.
        $q=$pdo->prepare(
            "SELECT n.monitor_id FROM jrei_news_monitors n
             JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE n.jrei_source_reference=? AND n.source_url_sha256=?
               AND n.enabled=1 AND n.policy_revision=p.revision
               AND s.source_locator_uri=?
               AND s.review_state='AUTHORITATIVE_REVIEWED'
               AND s.rights_state IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND s.is_revoked=0 AND s.is_superseded=0
               AND s.reviewer_account_id IS NOT NULL
               AND s.verified_at IS NOT NULL
               AND p.scheduling_state='APPROVED'
               AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
               AND p.transport_reviewed=1
               AND p.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
             LIMIT 1 FOR UPDATE"
        );
        $q->execute([$candidate['sourceId'],
            hash('sha256',(string)$sourceAuthority['canonicalUrl']),
            (string)$sourceAuthority['canonicalUrl']]);
        $monitor=$q->fetch(PDO::FETCH_ASSOC);
        if (!$monitor)throw new RuntimeException('news_monitor_not_owner_enabled');
        // An owner-bound article URL may later be revoked independently
        // of the feed. Check the ORIGINAL article's current acquisition
        // policy inside this same transaction, before preserving metadata.
        $q=$pdo->prepare(
            "SELECT d.approved_article_source_id,d.review_state
             FROM jrei_news_discovered_urls d
             JOIN jrei_exam_sources a
               ON a.source_id=d.approved_article_source_id
             JOIN jrei_ka_source_policies ap ON ap.source_id=a.source_id
             WHERE d.monitor_id=? AND d.canonical_url_sha256=?
               AND d.canonical_article_url=?
               AND a.source_locator_uri=d.canonical_article_url
               AND a.review_state='AUTHORITATIVE_REVIEWED'
               AND a.rights_state IN
                 ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND a.is_revoked=0 AND a.is_superseded=0
               AND a.verified_at IS NOT NULL
               AND a.reviewer_account_id IS NOT NULL
               AND ap.scheduling_state='APPROVED'
               AND ap.rights_reviewed=1
               AND ap.robots_terms_reviewed=1
               AND ap.transport_reviewed=1
               AND ap.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND ap.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND ap.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
             LIMIT 1 FOR UPDATE"
        );
        $q->execute([$monitor['monitor_id'],$sourceHash,$url]);
        $discovered=$q->fetch(PDO::FETCH_ASSOC);
        if(!$discovered ||
            $discovered['review_state']!=='ORIGINAL_JREI_ARTICLE_APPROVED' ||
            empty($discovered['approved_article_source_id']) ||
            $discovered['approved_article_source_id']!==$existingReceipt['sourceId']) {
            throw new RuntimeException('news_article_exact_url_not_jrei_source_approved');
        }
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
