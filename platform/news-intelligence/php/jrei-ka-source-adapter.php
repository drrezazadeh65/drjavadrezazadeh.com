<?php
declare(strict_types=1);
/**
 * Reuse the ORIGINAL JREI-KA authority and source policies. News monitors
 * are a projection, not a parallel source registry or autonomous scraper.
 *
 * ORIGINAL JREI-KA scheduling enforces refresh_interval_seconds >= 3600.
 * A 5-minute P0 radar is NOT available through that policy: any faster
 * change checks require a separately reviewed original scheduler extension.
 *
 * This module only reads source metadata in the ONE mother database.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsExistingJreiApprovedSources(PDO $pdo,int $limit=200): array {
    if ($limit<1||$limit>500)
        throw new InvalidArgumentException('news_sources_limit_invalid');
    $q=$pdo->prepare(
        "SELECT n.monitor_id,n.jrei_source_reference,n.category_code,
                n.priority_code,n.interval_minutes,n.policy_revision,
                n.source_url_sha256,
                s.source_id,s.source_title,s.source_locator_uri,
                s.review_state,s.rights_state,s.reviewer_account_id,
                s.verified_at,s.is_revoked,s.is_superseded,
                p.revision,p.refresh_interval_seconds,p.scheduling_state,
                p.rights_reviewed,p.robots_terms_reviewed,p.transport_reviewed,
                p.priority_tier
         FROM jrei_news_monitors n
         JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         WHERE n.enabled=1 AND n.policy_revision=p.revision
           AND p.scheduling_state='APPROVED'
           AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
           AND p.transport_reviewed=1
           AND s.review_state='AUTHORITATIVE_REVIEWED'
           AND s.is_revoked=0 AND s.is_superseded=0
           AND s.verified_at IS NOT NULL
           AND s.reviewer_account_id IS NOT NULL
           AND s.source_locator_uri LIKE 'https://%'
         ORDER BY n.priority_code ASC,s.source_id ASC LIMIT ?"
    );
    $q->bindValue(1,$limit,PDO::PARAM_INT);
    $q->execute();
    $eligible=[];$skipped=0;
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $uri=$row['source_locator_uri'];
        // The monitor is scoped to the exact ORIGINAL source URL and
        // independently reviewed source-policy revision. A later registry
        // URL change must not inherit permission to crawl its new host.
        if(!is_string($uri)||!hash_equals(
            (string)$row['source_url_sha256'],hash('sha256',$uri))){
            $skipped++;continue;
        }
        $parts=parse_url($uri);
        if(!is_array($parts)||($parts['scheme']??null)!=='https'||
           empty($parts['host'])||isset($parts['user'])||
           isset($parts['pass'])||isset($parts['fragment'])||
           (isset($parts['port'])&&(int)$parts['port']!==443)||
           filter_var((string)$parts['host'],FILTER_VALIDATE_IP)!==false) {
            $skipped++;continue;
        }
        $rights=(string)$row['rights_state'];
        // The ORIGINAL JREI-KA private acquisition worker can fetch
        // only these two permissions. PUBLIC_DISPLAY by itself permits
        // presentation of already held material, not a new download.
        if(!in_array($rights,[
            'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'
        ],true)){$skipped++;continue;}
        $minutes=max(
            (int)ceil((int)$row['refresh_interval_seconds']/60),
            (int)$row['interval_minutes']
        );
        if($minutes<60||$minutes>1440){
            $skipped++;continue;
        }
        $title=(string)$row['source_title'];
        if(trim($title)===''||strlen($title)>600||
            preg_match('//u',$title)!==1||
            preg_match_all('/./us',$title)>160) {
            $skipped++;continue;
        }
        $eligible[]=[
            'sourceId'=>$row['source_id'],
            'sourceName'=>$title,
            'canonicalUrl'=>$uri,
            'trustClass'=>'INSTITUTIONAL',
            'usageRights'=>$rights==='PERMITTED_REPRODUCTION'?
                'PUBLIC_REUSE_APPROVED':'METADATA_ONLY',
            'language'=>'mixed',
            'reviewStatus'=>'APPROVED',
            'reviewedBy'=>$row['reviewer_account_id'],
            'robotsPermission'=>'ALLOWED',
            'termsPermission'=>'ALLOWED',
            'pollIntervalMinutes'=>$minutes,
            'originalJreiPolicyRevision'=>(int)$row['revision'],
            'jreiSourceReference'=>$row['source_id'],
            'jreiMonitorId'=>$row['monitor_id'],
            'requestedNewsPriority'=>$row['priority_code'],
            'effectiveJreiPolicyMinMinutes'=>$minutes,
            'fastP0MonitoringActuallyEnabled'=>false,
            'metadataOnlyNeverAuthorizesRawRepublication'=>true
        ];
    }
    return [
        'schema'=>'jr.jrei.news-original-source-adapter.v1',
        'sources'=>$eligible,
        'eligibleCount'=>count($eligible),
        'skippedUnsafeOrIncompatible'=>$skipped,
        'underlyingApprovedScheduler'=>'ORIGINAL_JREI_KA',
        'sourcePermissionsInheritedNotDuplicated'=>true,
        'maxSourceCheckRateConstrainedByOriginalPolicy'=>true,
        'downloadsPerformed'=>0,'publicNewsPublished'=>false
    ];
}
