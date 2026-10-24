<?php
declare(strict_types=1);
/**
 * Owner-controlled JREI-KA source monitor configuration.
 * Uses the ORIGINAL source registry, policy revision, audited owner MFA and
 * ONE mother DB. No second crawler, Cron, or source-rights registrar.
 *
 * Staging a monitor leaves it OFF. Enabling additionally needs final owner
 * deployment authorization and an actively approved original source policy.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/candidate-intake.php';

function jrNewsOwnerStageSourceMonitor(
    PDO $pdo,array $session,string $sourceId,string $category,
    string $priority,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($session);
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$sourceId)||
        !in_array($category,[
            'school','examinations','universities','employment',
            'language','international','research'
        ],true)||
        !in_array($priority,['P0','P1','P2'],true)||
        $nowEpoch<=0) {
        throw new InvalidArgumentException('news_source_monitor_invalid');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT s.source_id,s.source_locator_uri,s.review_state,
                    s.rights_state,s.is_revoked,s.is_superseded,
                    s.reviewer_account_id,s.verified_at,
                    p.scheduling_state,p.rights_reviewed,
                    p.robots_terms_reviewed,p.transport_reviewed,
                    p.refresh_interval_seconds,p.revision
             FROM jrei_exam_sources s
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE s.source_id=? FOR UPDATE'
        );
        $q->execute([$sourceId]);
        $s=$q->fetch(PDO::FETCH_ASSOC);
        if (!$s||$s['review_state']!=='AUTHORITATIVE_REVIEWED'||
            (int)$s['is_revoked']!==0||
            (int)$s['is_superseded']!==0||
            !$s['reviewer_account_id']||!$s['verified_at']||
            !in_array($s['rights_state'],[
                'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'
            ],true)||
            $s['scheduling_state']!=='APPROVED'||
            (int)$s['rights_reviewed']!==1||
            (int)$s['robots_terms_reviewed']!==1||
            (int)$s['transport_reviewed']!==1||
            (int)$s['revision']<1 ||
            (int)$s['refresh_interval_seconds']<3600) {
            throw new RuntimeException('news_original_source_policy_not_approved');
        }
        $parts=parse_url((string)$s['source_locator_uri']);
        if (!is_array($parts)||($parts['scheme']??null)!=='https'||
            !isset($parts['host'])||isset($parts['user'])||
            isset($parts['pass'])||isset($parts['fragment'])||
            (isset($parts['port'])&&(int)$parts['port']!==443)||
            preg_match('/[\\x00-\\x20\\x7F]/',
                (string)$s['source_locator_uri'])===1||
            filter_var((string)$parts['host'],FILTER_VALIDATE_IP)!==false) {
            throw new RuntimeException('news_original_source_uri_not_public_https');
        }
        $monitorId=jrNewsPrivateUuid();
        $sourceHash=hash('sha256',(string)$s['source_locator_uri']);
        $interval=(int)ceil((int)$s['refresh_interval_seconds']/60);
        if ($interval>1440)
            throw new RuntimeException('news_source_interval_over_daily_limit');
        $q=$pdo->prepare(
            'SELECT monitor_id,enabled FROM jrei_news_monitors
             WHERE jrei_source_reference=? AND source_url_sha256=?
             FOR UPDATE'
        );
        $q->execute([$sourceId,$sourceHash]);
        $existing=$q->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            $id=$existing['monitor_id'];
            if ((int)$existing['enabled']!==0)
                throw new RuntimeException('news_monitor_active_requires_revision_review');
            $pdo->prepare(
                'UPDATE jrei_news_monitors
                 SET category_code=?,priority_code=?,interval_minutes=?,
                     policy_revision=?
                 WHERE monitor_id=? AND enabled=0'
            )->execute([$category,$priority,$interval,$s['revision'],$id]);
        } else {
            $id=$monitorId;
            $pdo->prepare(
                'INSERT INTO jrei_news_monitors
                 (monitor_id,jrei_source_reference,source_url_sha256,
                  category_code,priority_code,interval_minutes,
                  policy_revision,enabled,created_at)
                 VALUES(?,?,?,?,?,?,?,0,?)'
            )->execute([$id,$sourceId,$sourceHash,$category,$priority,
                $interval,$s['revision'],$nowEpoch]);
        }
        if(function_exists('operationsAudit')) {
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_source_monitor_staged',hash('sha256',$id));
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-source-monitor-stage.v1',
            'monitorId'=>$id,'sourceId'=>$sourceId,
            'category'=>$category,'priority'=>$priority,
            'sourcePolicyRevision'=>(int)$s['revision'],
            'effectiveIntervalMinutes'=>$interval,
            'monitorEnabled'=>false,
            'crawlStarted'=>false,
            'publicationAuthorized'=>false
        ];
    }catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrNewsOwnerEnableSourceMonitor(
    PDO $pdo,array $session,string $monitorId,
    array $privateReleasePolicy,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($session);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$monitorId)||
        $nowEpoch<=0||
        ($privateReleasePolicy['source']??null)!==
            'ORIGINAL_OWNER_APPROVED_JREI_RELEASE'||
        ($privateReleasePolicy['finalIntegratedAcceptanceVerified']??null)!==true||
        ($privateReleasePolicy['newsMonitoringActivatedByOwner']??null)!==true) {
        throw new RuntimeException('news_monitor_final_activation_not_authorized');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT n.monitor_id,n.jrei_source_reference,n.policy_revision,
                    n.enabled,n.source_url_sha256,p.revision,p.scheduling_state,
                    p.rights_reviewed,p.robots_terms_reviewed,p.transport_reviewed,
                    s.source_locator_uri,s.rights_state,s.review_state,
                    s.verified_at,s.reviewer_account_id,
                    s.is_revoked,s.is_superseded
             FROM jrei_news_monitors n
             JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE n.monitor_id=? FOR UPDATE'
        );
        $q->execute([$monitorId]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(!$r||(int)$r['policy_revision']!==(int)$r['revision']||
            $r['scheduling_state']!=='APPROVED'||
            (int)$r['rights_reviewed']!==1||
            (int)$r['robots_terms_reviewed']!==1||
            (int)$r['transport_reviewed']!==1||
            $r['review_state']!=='AUTHORITATIVE_REVIEWED'||
            !in_array($r['rights_state'],[
                'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'
            ],true)||
            $r['verified_at']===null||
            $r['reviewer_account_id']===null||
            !is_string($r['source_locator_uri'])||
            !hash_equals((string)$r['source_url_sha256'],
                hash('sha256',$r['source_locator_uri']))||
            (int)$r['is_revoked']!==0||
            (int)$r['is_superseded']!==0) {
            throw new RuntimeException('news_original_source_permission_changed');
        }
        if ((int)$r['enabled']!==1) {
            $pdo->prepare(
                'UPDATE jrei_news_monitors SET enabled=1 WHERE monitor_id=?'
            )->execute([$monitorId]);
            if(function_exists('operationsAudit')) {
                operationsAudit($pdo,$owner['actor'],
                    'jrei_news_monitor_enabled',hash('sha256',$monitorId));
            }
        }
        $pdo->commit();
        return ['monitorId'=>$monitorId,'enabled'=>true,
            'originalSchedulerStillRequired'=>true,
            'requestDispatched'=>false,
            'sourceRightsCurrentAtApproval'=>true];
    }catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
