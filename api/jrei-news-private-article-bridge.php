<?php
declare(strict_types=1);
/**
 * Source-only JREI News article intake using the ORIGINAL private JREI-KA
 * acquisition receipt. A feed suggestion becomes an article candidate only
 * AFTER its exact URL is independently registered and rights-reviewed.
 * No new HTTP requests, article approval, public publishing or model calls.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-acquisition-dispatch.php';
require_once dirname(__DIR__).'/platform/news-intelligence/php/candidate-intake.php';

function jrNewsBridgeOriginalArticleObservation(
    PDO $pdo,array $cfg,int $now
): array {
    $result=[
        'schema'=>'jr.jrei.news-original-article-bridge.v1',
        'state'=>'OFF','reviewedObservationsExamined'=>0,
        'privateNewsCandidatesStaged'=>0,'alreadyStaged'=>0,
        'requiresIndependentScientificReview'=>true,
        'requiresOwnerPublicationApproval'=>true,
        'newHttpRequests'=>0,'articlesPublished'=>0
    ];
    if($now<=0)throw new InvalidArgumentException('news_article_bridge_clock_invalid');
    if(($cfg['jrei_news_article_intake_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_ka_schedule_enabled']??false)!==true||
       ($cfg['jrei_ka_autofetch_enabled']??false)!==true)
        return $result;
    // The original JREI-KA owner can pause ALL acquisition independently
    // of feature switches and individual source policies. Respect that
    // decision before inspecting new archived source observations.
    $controls=$pdo->query(
        'SELECT scheduling_enabled,acquisition_enabled FROM jrei_ka_controls
         WHERE singleton_id=1 LIMIT 1'
    )->fetch(PDO::FETCH_ASSOC);
    if(!is_array($controls)||
       (int)$controls['scheduling_enabled']!==1||
       (int)$controls['acquisition_enabled']!==1)
        return [...$result,'state'=>'ORIGINAL_JREI_ACQUISITION_PAUSED'];
    $root=jrKaPrivateArchiveRoot($cfg);
    if($root===null)
        return [...$result,'state'=>'ORIGINAL_PRIVATE_ARCHIVE_UNAVAILABLE'];
    $q=$pdo->prepare(
        "SELECT n.monitor_id,n.jrei_source_reference AS feed_source_id,
                feed.source_locator_uri AS feed_url,feed.rights_state AS feed_rights,
                d.canonical_article_url,d.discovered_headline,
                d.claimed_published_at,a.source_id AS article_source_id,
                o.observation_id,o.content_sha256,o.bytes_total,
                o.private_object_key,o.mime_type
         FROM jrei_news_discovered_urls d
         JOIN jrei_news_monitors n ON n.monitor_id=d.monitor_id
         JOIN jrei_exam_sources feed
           ON feed.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies fp ON fp.source_id=feed.source_id
         JOIN jrei_exam_sources a
           ON a.source_id=d.approved_article_source_id
          AND a.source_locator_uri=d.canonical_article_url
         JOIN jrei_ka_source_policies ap ON ap.source_id=a.source_id
         JOIN jrei_ka_private_observations o
           ON o.source_id=a.source_id
          AND o.source_policy_revision=ap.revision
          AND o.source_uri_sha256=d.canonical_url_sha256
         JOIN jrei_ka_jobs j ON j.job_id=o.job_id
          AND j.source_id=a.source_id
          AND j.source_policy_revision=o.source_policy_revision
          AND j.job_state='ACQUIRED_REVIEW'
          AND j.observed_digest=o.content_sha256
         WHERE d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
           AND n.enabled=1 AND n.policy_revision=fp.revision
           AND n.source_url_sha256=SHA2(feed.source_locator_uri,256)
           AND feed.review_state='AUTHORITATIVE_REVIEWED'
           AND feed.rights_state IN
             ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND feed.is_revoked=0 AND feed.is_superseded=0
           AND feed.reviewer_account_id IS NOT NULL
           AND feed.verified_at IS NOT NULL
           AND fp.scheduling_state='APPROVED'
           AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
           AND fp.transport_reviewed=1
           AND fp.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND fp.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND fp.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND a.review_state='AUTHORITATIVE_REVIEWED'
           AND a.rights_state IN
             ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND a.is_revoked=0 AND a.is_superseded=0
           AND a.reviewer_account_id IS NOT NULL
           AND a.verified_at IS NOT NULL
           AND ap.scheduling_state='APPROVED'
           AND ap.rights_reviewed=1 AND ap.robots_terms_reviewed=1
           AND ap.transport_reviewed=1
           AND ap.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND ap.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND ap.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND o.state='PENDING_SCIENTIFIC_REVIEW'
           AND o.mime_type='text/html'
           AND o.rights_state_at_acquisition IN
             ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND o.bytes_total BETWEEN 50 AND 8388608
           AND o.private_object_key=CONCAT(o.content_sha256,'.bin')
           AND NOT EXISTS (
             SELECT 1 FROM jrei_news_candidates c
             WHERE c.fingerprint_sha256=SHA2(
               CONCAT(n.jrei_source_reference,'|',
                      d.canonical_article_url,'|',o.content_sha256),256)
           )
         ORDER BY o.observed_at DESC,o.observation_id ASC LIMIT 6"
    );
    $q->execute();
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    $result['state']='NO_NEW_APPROVED_ARTICLE_OBSERVATION';
    foreach($rows as $row){
        $result['reviewedObservationsExamined']++;
        $hash=(string)$row['content_sha256'];
        $size=(int)$row['bytes_total'];
        $url=(string)$row['canonical_article_url'];
        $feedId=(string)$row['feed_source_id'];
        if(!preg_match('/^[a-f0-9]{64}$/D',$hash)||
           !preg_match('/^[a-f0-9-]{36}$/iD',$feedId)||
           $size<50||$size>8388608||
           strlen($url)>1000||
           (string)$row['private_object_key']!==$hash.'.bin')
            continue;
        $privateFile=$root.DIRECTORY_SEPARATOR.$hash.'.bin';
        if(is_link($privateFile))continue;
        $real=realpath($privateFile);
        if($real===false||dirname($real)!==$root||
           !is_file($real)||!is_readable($real)||
           filesize($real)!==$size||
           !hash_equals($hash,(string)hash_file('sha256',$real)))
            continue;
        $fingerprint=hash('sha256',$feedId.'|'.$url);
        $published=$row['claimed_published_at']===null?null:
            gmdate('Y-m-d\TH:i:s\Z',(int)$row['claimed_published_at']);
        $candidate=[
            'schema'=>'jr.jrei.news-feed-candidate.v1',
            'sourceId'=>$feedId,'url'=>$url,
            'title'=>(string)$row['discovered_headline'],
            'sourcePublishedAt'=>$published,
            'sourceFingerprint'=>$fingerprint,
            'evidenceStatus'=>'UNREVIEWED_METADATA'
        ];
        $authority=[
            'source'=>'PRIVATE_JREI_SOURCE_REGISTRY',
            'sourceId'=>$feedId,
            'canonicalUrl'=>$row['feed_url'],
            'reviewStatus'=>'APPROVED',
            'usageRights'=>$row['feed_rights']==='PERMITTED_REPRODUCTION'?
                'PUBLIC_REUSE_APPROVED':'METADATA_ONLY',
            'termsApproved'=>true,'robotsApproved'=>true
        ];
        $originalReader=static function(
            string $articleUrl,string $registeredFeedId,string $proposalHash
        )use($row,$url,$feedId,$fingerprint,$hash): array{
            if($articleUrl!==$url||$registeredFeedId!==$feedId||
               !hash_equals($fingerprint,$proposalHash))
                throw new RuntimeException('news_article_original_receipt_mismatch');
            return [
                'source'=>'ORIGINAL_JREI_PRIVATE_OBSERVATION',
                'sourceId'=>$row['article_source_id'],
                'articleCanonicalUrl'=>$url,
                'contentKind'=>'PUBLIC_HTML_ARTICLE',
                'articleSourceRightsApproved'=>true,
                'sourcePolicyCurrent'=>true,
                'contentSha256'=>$hash,
                'privateBytesAcquired'=>true
            ];
        };
        try{
            $stage=jrNewsPersistObservedCandidate(
                $pdo,$candidate,$authority,$originalReader,$now
            );
            if(($stage['state']??null)==='ALREADY_STAGED')
                $result['alreadyStaged']++;
            else $result['privateNewsCandidatesStaged']++;
            $result['state']='PRIVATE_SCIENTIFIC_REVIEW_PENDING';
        }catch(Throwable $e){
            $result['state']='PARTIAL_PRIVATE_REVIEW_REQUIRED';
        }
    }
    return $result;
}
