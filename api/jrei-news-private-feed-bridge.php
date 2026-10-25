<?php
declare(strict_types=1);
/**
 * JREI News: project ORIGINAL, already downloaded JREI-KA RSS/Atom evidence
 * into a PRIVATE link-review queue. No own network transport, no new crawler,
 * no public publication, no additional source registrar or second database.
 *
 * Source-only; the owner-approved private Cron must invoke this explicitly.
 * Both original acquisition policy and independent News activation default OFF.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-acquisition-dispatch.php';
require_once __DIR__.'/internal/jrei-news/feed-discovery.php';
require_once __DIR__.'/internal/jrei-news/original-auto-article-link.php';

function jrNewsBridgeOriginalFeedObservation(
    PDO $pdo,array $cfg,int $at
): array {
    $summary=[
        'schema'=>'jr.jrei.news-original-feed-bridge.v1',
        'state'=>'OFF','feedObservationsExamined'=>0,
        'newPrivateLinksSuggested'=>0,'previouslySeenLinks'=>0,
        'invalidEntries'=>0,'requiresOriginalArticleSourceApproval'=>true,
        'newNetworkRequests'=>0,'articlesPublished'=>0
    ];
    if($at<=0)throw new InvalidArgumentException('news_feed_bridge_clock_invalid');
    if(($cfg['jrei_news_feed_discovery_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_ka_schedule_enabled']??false)!==true||
       ($cfg['jrei_ka_autofetch_enabled']??false)!==true)
        return $summary;
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
        return [...$summary,'state'=>'ORIGINAL_JREI_ACQUISITION_PAUSED'];
    $root=jrKaPrivateArchiveRoot($cfg);
    if($root===null)
        return [...$summary,'state'=>'ORIGINAL_PRIVATE_ARCHIVE_UNAVAILABLE'];
    // Every candidate derives from the ORIGINAL immutable acquisition
    // receipt, job and reviewed source policy. The feed parser independently
    // rechecks all rights under lock before staging any URL.
    $stmt=$pdo->prepare(
        "SELECT n.monitor_id,n.jrei_source_reference,
                o.observation_id,o.content_sha256,o.mime_type,o.bytes_total,
                o.private_object_key,o.observed_at
         FROM jrei_news_monitors n
         JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         JOIN jrei_ka_private_observations o
           ON o.source_id=s.source_id
          AND o.source_policy_revision=n.policy_revision
          AND o.source_uri_sha256=n.source_url_sha256
         JOIN jrei_ka_jobs j ON j.job_id=o.job_id
          AND j.source_id=o.source_id
          AND j.source_policy_revision=o.source_policy_revision
          AND j.job_state='ACQUIRED_REVIEW'
          AND j.observed_digest=o.content_sha256
         WHERE n.enabled=1 AND n.policy_revision=p.revision
           AND n.source_url_sha256=SHA2(s.source_locator_uri,256)
           AND s.review_state='AUTHORITATIVE_REVIEWED'
           AND s.rights_state IN
             ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND s.is_revoked=0 AND s.is_superseded=0
           AND s.verified_at IS NOT NULL
           AND s.reviewer_account_id IS NOT NULL
           AND p.scheduling_state='APPROVED'
           AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
           AND p.transport_reviewed=1
           AND p.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND p.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND p.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND o.state='PENDING_SCIENTIFIC_REVIEW'
           AND o.rights_state_at_acquisition IN
             ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND o.mime_type IN
             ('application/rss+xml','application/atom+xml',
              'application/xml','text/xml')
           AND o.bytes_total BETWEEN 50 AND 2097152
           AND o.private_object_key=CONCAT(o.content_sha256,'.bin')
           AND NOT EXISTS (
             SELECT 1 FROM jrei_news_discovered_urls d
             WHERE d.monitor_id=n.monitor_id
               AND d.latest_feed_sha256=o.content_sha256
           )
         ORDER BY o.observed_at DESC,o.observation_id ASC LIMIT 8"
    );
    $stmt->execute();
    $rows=$stmt->fetchAll(PDO::FETCH_ASSOC);
    $summary['state']='NO_NEW_APPROVED_FEED_OBSERVATION';
    foreach($rows as $row){
        $summary['feedObservationsExamined']++;
        $digest=(string)$row['content_sha256'];
        $id=(string)$row['observation_id'];
        $source=(string)$row['jrei_source_reference'];
        if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
           !preg_match('/^[a-f0-9-]{36}$/iD',$id)||
           !preg_match('/^[a-f0-9-]{36}$/iD',$source))
            continue;
        $size=(int)$row['bytes_total'];
        if($size<50||$size>2097152)continue;
        $observation=[
            'source'=>'ORIGINAL_JREI_PRIVATE_APPROVED_FEED_OBSERVATION',
            'sourceId'=>$source,'observationId'=>$id,
            'contentSha256'=>$digest,
            'rightsAndRobotsChecked'=>true,'sourcePolicyCurrent'=>true
        ];
        $reader=static function(array $requested,string $registryId) use(
            $root,$row,$digest,$id,$source,$size
        ): array {
            if(($requested['observationId']??null)!==$id||
               ($requested['contentSha256']??null)!==$digest||
               $registryId!==$source||
               ($row['private_object_key']??null)!==$digest.'.bin')
                throw new RuntimeException('news_private_original_receipt_mismatch');
            $path=$root.DIRECTORY_SEPARATOR.$digest.'.bin';
            if(is_link($path))throw new RuntimeException('news_original_object_is_link');
            $real=realpath($path);
            if($real===false||dirname($real)!==$root||
               !is_file($real)||!is_readable($real)||filesize($real)!==$size)
                throw new RuntimeException('news_original_object_unavailable');
            $bytes=file_get_contents($real);
            if(!is_string($bytes)||strlen($bytes)!==$size||
               !hash_equals($digest,hash('sha256',$bytes)))
                throw new RuntimeException('news_original_object_digest_invalid');
            return [
                'source'=>'ORIGINAL_JREI_PRIVATE_CONTENT_STORE',
                'mime'=>$row['mime_type'],'bytes'=>$bytes
            ];
        };
        try{
            $stage=jrNewsStageVerifiedFeedLinkSuggestions(
                $pdo,(string)$row['monitor_id'],$observation,$reader,$at
            );
            if(($stage['schema']??null)!=='jr.jrei.news-feed-discovery-stage.v1')
                throw new RuntimeException('news_feed_stage_receipt_invalid');
            $summary['newPrivateLinksSuggested']+=(int)$stage['newSuggestedUrls'];
            $summary['previouslySeenLinks']+=(int)$stage['previouslySeenUrls'];
            $summary['invalidEntries']+=(int)$stage['invalidEntries'];
            $summary['state']='PRIVATE_METADATA_REVIEW_PENDING';
        }catch(Throwable $e){
            // A revoked source or malformed archived feed is NOT automatic
            // permission to retry a different host or publish raw data.
            $summary['invalidEntries']++;
            $summary['state']='PARTIAL_PRIVATE_REVIEW_REQUIRED';
        }
    }
    // An already verified ORIGINAL article source requires no additional
    // per-story human confirmation. Sources not registered by the original
    // JREI-KA authority remain safely pending; this module never approves
    // them and never starts a second crawler.
    $links=jrNewsAutoLinkOriginalVerifiedArticleSources(
        $pdo,[
            'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
            'originalServerSessionVerified'=>true,
            'newsPipelineEnabled'=>true
        ],$at,40);
    $summary['automaticallyLinkedOriginalArticleSources']=
        (int)$links['linked'];
    $summary['stillAwaitingIndependentSourceRegistration']=
        (int)$links['pending'];
    $summary['requiresOriginalArticleSourceApproval']=false;
    $summary['requiresIndependentOriginalSourceAuthorization']=true;
    return $summary;
}
