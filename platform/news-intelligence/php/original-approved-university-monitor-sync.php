<?php
declare(strict_types=1);
/**
 * First-party reconciliation: any ALREADY VERIFIED original JREI-KA
 * university/examination news source may receive ONE original news monitor.
 * Owner approval is a standing source-class policy, not per-university and
 * never per-article. New sources with unreviewed rights stay PENDING_REVIEW.
 *
 * A disabled existing monitor is a deliberate owner decision: NEVER resume
 * it in Cron. No new acquisition stack, no scraping, no source policy writes.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/admin-source-management.php';

function jrNewsOriginalSyncReviewedUniversityMonitors(
    PDO $pdo,array $config,array $context,int $now,int $limit=50
):array {
    if(($context['source']??null)!=='ORIGINAL_JREI_PRIVATE_NEWS_WORKER'||
       ($context['originalCronLeaseVerified']??null)!==true||
       ($config['jrei_news_integrated_release_accepted']??null)!==true||
       ($config['operations_cron_master_enabled']??null)!==true||
       ($config['jrei_news_source_activation_accepted']??null)!==true||
       ($config['jrei_news_automatic_official_monitor_enabled']??null)!==true||
       $now<=0||$limit<1||$limit>100)
        throw new RuntimeException('news_original_verified_university_sync_not_authorized');

    $summary=[
        'schema'=>'jr.jrei.news-reviewed-university-monitor-sync.v1',
        'reviewedSourcesExamined'=>0,'monitorsStaged'=>0,
        'monitorsActivated'=>0,'alreadyExisting'=>0,
        'existingOwnerDisabledRetained'=>0,'notEligible'=>0,
        'technicalHolds'=>0,'rightsGranted'=>0,
        'extraCronJobsStarted'=>0,'articlesPublished'=>0,
        'dailyNewsQuota'=>null
    ];
    $lockName='jrei-news-reviewed-university-sync';
    $lease=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $lease->execute([$lockName]);
    if((int)$lease->fetchColumn()!==1)
        return [...$summary,'leaseUnavailable'=>true];

    try{
        $q=$pdo->prepare(
            "SELECT s.source_id,s.source_title,s.source_locator_uri,
                    s.source_kind,s.exam_category,s.review_state,
                    s.rights_state,s.reviewer_account_id,s.verified_at,
                    s.is_revoked,s.is_superseded,
                    p.revision,p.scheduling_state,p.priority_tier,
                    p.refresh_interval_seconds,p.rights_reviewed,
                    p.robots_terms_reviewed,p.transport_reviewed,
                    p.rights_evidence_sha256,
                    p.robots_terms_evidence_sha256,p.transport_evidence_sha256
             FROM jrei_exam_sources s
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             LEFT JOIN jrei_news_monitors existing
               ON existing.jrei_source_reference=s.source_id
              AND BINARY existing.source_url_sha256=
                  BINARY SHA2(s.source_locator_uri,256)
             WHERE s.review_state='AUTHORITATIVE_REVIEWED'
               AND s.rights_state IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND s.is_revoked=0 AND s.is_superseded=0
               AND s.source_kind IN
                   ('OFFICIAL_UNIVERSITY_NEWS','OFFICIAL_EXAM_NOTICE',
                    'OFFICIAL_EDUCATION_NEWS')
               AND s.reviewer_account_id IS NOT NULL
               AND s.verified_at IS NOT NULL
               AND p.scheduling_state='APPROVED'
               AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
               AND p.transport_reviewed=1
             -- Unmonitored official universities ALWAYS lead the next
             -- bounded Cron batch. Without this order, the first 50 old
             -- monitored universities would starve every subsequent source.
             ORDER BY (existing.monitor_id IS NULL) DESC,
                      s.verified_at,s.source_id LIMIT ?"
        );
        $q->bindValue(1,$limit,PDO::PARAM_INT);
        $q->execute();
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $source){
            $summary['reviewedSourcesExamined']++;
            $url=(string)$source['source_locator_uri'];
            $interval=(int)$source['refresh_interval_seconds'];
            $valid=($source['review_state']==='AUTHORITATIVE_REVIEWED')&&
                (int)$source['revision']>0&&$interval>=3600&&
                $interval<=86400&&
                in_array($source['rights_state'],
                    ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true);
            if($valid)foreach([
                'rights_evidence_sha256','robots_terms_evidence_sha256',
                'transport_evidence_sha256'
            ] as $field){
                if(preg_match('/^[a-f0-9]{64}$/D',
                    (string)($source[$field]??''))!==1){$valid=false;break;}
            }
            if($valid){
                try{$valid=jrNewsAdminCanonicalSourceUrl($url)===$url;}
                catch(Throwable $e){$valid=false;}
            }
            if(!$valid){$summary['notEligible']++;continue;}
            $priority=in_array($source['priority_tier'],
                ['P0','P1','P2'],true)?$source['priority_tier']:'P2';
            $category=$source['source_kind']==='OFFICIAL_EXAM_NOTICE'?
                'examinations':'universities';
            $hash=hash('sha256',$url);
            try{
                $pdo->beginTransaction();
                $monitor=$pdo->prepare(
                    'SELECT monitor_id,enabled FROM jrei_news_monitors
                     WHERE jrei_source_reference=?
                       AND BINARY source_url_sha256=BINARY ?
                     LIMIT 1 FOR UPDATE'
                );
                $monitor->execute([$source['source_id'],$hash]);
                $found=$monitor->fetch(PDO::FETCH_ASSOC);
                if(is_array($found)){
                    $summary['alreadyExisting']++;
                    if((int)$found['enabled']!==1)
                        $summary['existingOwnerDisabledRetained']++;
                    $pdo->commit();
                    continue;
                }
                $id=jrNewsPrivateUuid();
                $insert=$pdo->prepare(
                    "INSERT INTO jrei_news_monitors
                     (monitor_id,jrei_source_reference,source_url_sha256,
                      category_code,priority_code,interval_minutes,
                      policy_revision,enabled,created_at)
                     VALUES(?,?,?,?,?,?,?,?,?)"
                );
                $insert->execute([
                    $id,$source['source_id'],$hash,$category,$priority,
                    (int)ceil($interval/60),(int)$source['revision'],1,$now
                ]);
                $pdo->commit();
                $summary['monitorsStaged']++;
                $summary['monitorsActivated']++;
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                // A single invalid university does not starve the queue.
                $summary['technicalHolds']++;
            }
        }
    }finally{
        $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
    return $summary;
}
