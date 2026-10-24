<?php
declare(strict_types=1);
/**
 * Discover possible article URLs from an ORIGINAL JREI-approved and privately
 * acquired RSS/Atom feed. No linked article is downloaded or approved here.
 * The original registered-source workflow must separately approve its URL.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/candidate-intake.php';

function jrNewsStageVerifiedFeedLinkSuggestions(
    PDO $pdo,string $monitorId,array $originalObservation,
    callable $originalJreiPrivateFeedReader,int $nowEpoch
): array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$monitorId)||
        $nowEpoch<=0||
        ($originalObservation['source']??null)!==
            'ORIGINAL_JREI_PRIVATE_APPROVED_FEED_OBSERVATION'||
        ($originalObservation['rightsAndRobotsChecked']??null)!==true||
        ($originalObservation['sourcePolicyCurrent']??null)!==true||
        !preg_match('/^[a-f0-9]{64}$/D',
            (string)($originalObservation['contentSha256']??''))) {
        throw new RuntimeException('news_original_feed_observation_untrusted');
    }
    $q=$pdo->prepare(
        "SELECT n.monitor_id,n.jrei_source_reference,n.policy_revision,
                s.source_locator_uri,s.review_state,s.is_revoked,
                p.revision,p.scheduling_state
         FROM jrei_news_monitors n
         JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         WHERE n.monitor_id=? AND n.enabled=1"
    );
    $q->execute([$monitorId]);
    $monitor=$q->fetch(PDO::FETCH_ASSOC);
    if(!$monitor || $monitor['review_state']!=='AUTHORITATIVE_REVIEWED' ||
        (int)$monitor['is_revoked']!==0 ||
        $monitor['scheduling_state']!=='APPROVED' ||
        (int)$monitor['policy_revision']!==(int)$monitor['revision'] ||
        $originalObservation['sourceId']!==$monitor['jrei_source_reference']){
        throw new RuntimeException('news_feed_monitor_policy_no_longer_valid');
    }
    $sourceUrl=(string)$monitor['source_locator_uri'];
    $sourceHost=parse_url($sourceUrl,PHP_URL_HOST);
    if(!is_string($sourceHost)||$sourceHost==='') {
        throw new RuntimeException('news_feed_source_host_missing');
    }
    $blob=$originalJreiPrivateFeedReader(
        $originalObservation,$monitor['jrei_source_reference']
    );
    if(!is_array($blob)||
        ($blob['source']??null)!=='ORIGINAL_JREI_PRIVATE_CONTENT_STORE'||
        ($blob['mime']??null)===null||
        !is_string($blob['bytes']??null)||
        strlen($blob['bytes'])>2097152||
        !hash_equals($originalObservation['contentSha256'],
            hash('sha256',$blob['bytes']))) {
        throw new RuntimeException('news_feed_private_byte_receipt_unverified');
    }
    $feed=jrNewsParseApprovedFeed(
        $blob['bytes'],$blob['mime'],strtolower($sourceHost),
        $monitor['jrei_source_reference'],
        gmdate('Y-m-d\TH:i:s\Z',$nowEpoch)
    );
    $discovered=0;$alreadySeen=0;$skipped=0;
    $pdo->beginTransaction();
    try {
        $ins=$pdo->prepare(
            "INSERT INTO jrei_news_discovered_urls
              (discovery_id,monitor_id,source_registry_id,
               canonical_article_url,canonical_url_sha256,
               latest_feed_sha256,discovered_headline,claimed_published_at,
               first_seen_at,last_seen_at,review_state)
             VALUES(?,?,?,?,?,?,?,?,?,?,
                    'REQUIRES_ARTICLE_SOURCE_APPROVAL')
             ON DUPLICATE KEY UPDATE
               last_seen_at=VALUES(last_seen_at),
               latest_feed_sha256=VALUES(latest_feed_sha256),
               discovered_headline=VALUES(discovered_headline)"
        );
        foreach($feed['candidates'] as $entry){
            if(!is_string($entry['url']??null)||
                !is_string($entry['title']??null)||
                strlen($entry['title'])>960){
                $skipped++;continue;
            }
            $publishedTs=null;
            if(is_string($entry['sourcePublishedAt']??null)){
                $parsed=strtotime($entry['sourcePublishedAt']);
                if($parsed!==false&&$parsed>0)$publishedTs=$parsed;
            }
            $ins->execute([
                jrNewsPrivateUuid(),$monitorId,$monitor['jrei_source_reference'],
                $entry['url'],hash('sha256',$entry['url']),
                $feed['feedContentSha256'],$entry['title'],
                $publishedTs,$nowEpoch,$nowEpoch
            ]);
            // MariaDB may report rowCount=2 for UPDATE; only INSERT=1.
            if($ins->rowCount()===1)$discovered++;
            else $alreadySeen++;
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return [
        'schema'=>'jr.jrei.news-feed-discovery-stage.v1',
        'monitorId'=>$monitorId,'newSuggestedUrls'=>$discovered,
        'previouslySeenUrls'=>$alreadySeen,'invalidEntries'=>$skipped,
        'feedContentSha256'=>$feed['feedContentSha256'],
        'originalArticleSourceApprovalStillNeeded'=>true,
        'automaticArticleFetches'=>0,'publicArticlesWritten'=>0
    ];
}
