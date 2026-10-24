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
                    p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                    p.transport_evidence_sha256,
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
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$s['rights_evidence_sha256'])||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$s['robots_terms_evidence_sha256'])||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$s['transport_evidence_sha256'])||
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
                    p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                    p.transport_evidence_sha256,
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
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$r['rights_evidence_sha256'])||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$r['robots_terms_evidence_sha256'])||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)$r['transport_evidence_sha256'])||
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

/**
 * Owner emergency pause of this NEWS monitor projection only. Unlike
 * activation, stopping further NEWS dispatch does not require successful
 * public-release acceptance. Already leased jobs on the ORIGINAL JREI-KA
 * scheduler must be reconciled there; this is not a cancellation receipt.
 */
function jrNewsOwnerDisableSourceMonitor(
    PDO $pdo,array $session,string $monitorId,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($session);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$monitorId)||$nowEpoch<=0)
        throw new InvalidArgumentException('news_monitor_disable_request_invalid');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT monitor_id,enabled FROM jrei_news_monitors
             WHERE monitor_id=? FOR UPDATE'
        );
        $q->execute([$monitorId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))
            throw new RuntimeException('news_monitor_disable_missing');
        $changed=(int)$row['enabled']===1;
        if($changed){
            $pdo->prepare(
                'UPDATE jrei_news_monitors SET enabled=0
                 WHERE monitor_id=? AND enabled=1'
            )->execute([$monitorId]);
            if(function_exists('operationsAudit')){
                operationsAudit($pdo,$owner['actor'],
                    'jrei_news_monitor_disabled',hash('sha256',$monitorId));
            }
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-owner-monitor-disabled.v1',
            'monitorId'=>$monitorId,'enabled'=>false,
            'changed'=>$changed,'futureNewsDispatchDisabled'=>true,
            'alreadyQueuedOriginalJreiJobsNotCancelledByThisAction'=>true,
            'requiresOriginalSchedulerReconciliation'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Private owner inventory, including disabled and stale-policy monitors.
 * This is a READ model, not an acquisition permission grant.
 */
function jrNewsOwnerMonitorInventory(
    PDO $pdo,array $session,int $limit=100
): array {
    jrNewsOwnerAuthority($session);
    if($limit<1||$limit>200)
        throw new InvalidArgumentException('news_monitor_inventory_limit_invalid');
    $q=$pdo->prepare(
        "SELECT n.monitor_id,n.jrei_source_reference,n.category_code,
                n.priority_code,n.enabled,n.interval_minutes,n.policy_revision,
                n.source_url_sha256,s.source_title,s.source_locator_uri,
                s.review_state,s.rights_state,s.is_revoked,s.is_superseded,
                s.verified_at,s.reviewer_account_id,
                p.revision,p.scheduling_state,p.rights_reviewed,
                p.robots_terms_reviewed,p.transport_reviewed,
                p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                p.transport_evidence_sha256
         FROM jrei_news_monitors n
         LEFT JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
         LEFT JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         ORDER BY n.created_at DESC,n.monitor_id ASC LIMIT ?"
    );
    $q->bindValue(1,$limit,PDO::PARAM_INT);
    $q->execute();
    $items=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $evidence=true;
        foreach(['rights_evidence_sha256','robots_terms_evidence_sha256',
                 'transport_evidence_sha256'] as $field){
            if(preg_match('/^[a-f0-9]{64}$/D',
                (string)($row[$field]??''))!==1)$evidence=false;
        }
        $uri=$row['source_locator_uri']??null;
        $approved=is_string($uri) &&
            hash_equals((string)$row['source_url_sha256'],hash('sha256',$uri)) &&
            $row['review_state']==='AUTHORITATIVE_REVIEWED' &&
            in_array($row['rights_state'],[
                'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'
            ],true) &&
            (int)$row['is_revoked']===0 && (int)$row['is_superseded']===0 &&
            $row['verified_at']!==null && $row['reviewer_account_id']!==null &&
            (int)$row['policy_revision']===(int)$row['revision'] &&
            $row['scheduling_state']==='APPROVED' &&
            (int)$row['rights_reviewed']===1 &&
            (int)$row['robots_terms_reviewed']===1 &&
            (int)$row['transport_reviewed']===1 && $evidence;
        $items[]=[
            'monitorId'=>$row['monitor_id'],
            'sourceReference'=>$row['jrei_source_reference'],
            'sourceTitle'=>(string)($row['source_title']??''),
            'category'=>$row['category_code'],
            'priority'=>$row['priority_code'],
            'intervalMinutes'=>(int)$row['interval_minutes'],
            'enabled'=>(int)$row['enabled']===1,
            'originalPolicyCurrent'=>$approved,
            'activationRequiresOriginalOwnerRelease'=>true
        ];
    }
    return [
        'schema'=>'jr.jrei.news-owner-monitor-inventory.v1',
        'items'=>$items,'returnedCount'=>count($items),
        'ownerApprovalCannotBeInferredFromReadOnlyProjection'=>true
    ];
}

/**
 * An MFA-owner-only, read-only shortlist of ORIGINAL JREI-KA sources that
 * have not yet been staged as News monitors. Discovery is not a rights
 * approval and never creates a crawler job, source, or additional database.
 */
function jrNewsOwnerStageableOriginalSources(
    PDO $pdo,array $session,int $limit=80
): array {
    jrNewsOwnerAuthority($session);
    if($limit<1||$limit>100)
        throw new InvalidArgumentException('news_source_shortlist_limit_invalid');
    $stmt=$pdo->prepare(
        "SELECT s.source_id,s.source_title,s.source_locator_uri,s.rights_state,
                p.refresh_interval_seconds
         FROM jrei_exam_sources s
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         LEFT JOIN jrei_news_monitors n
           ON n.jrei_source_reference=s.source_id
          AND n.source_url_sha256=SHA2(s.source_locator_uri,256)
         WHERE n.monitor_id IS NULL
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
           AND p.refresh_interval_seconds BETWEEN 3600 AND 86400
           AND s.source_locator_uri LIKE 'https://%'
         ORDER BY s.source_id ASC LIMIT ?"
    );
    $stmt->bindValue(1,$limit,PDO::PARAM_INT);
    $stmt->execute();
    $items=[];
    foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row){
        $id=$row['source_id'];
        $title=$row['source_title'];
        $uri=$row['source_locator_uri'];
        if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}$/iD',$id)||
           !is_string($title)||trim($title)===''||
           strlen($title)>600||preg_match('//u',$title)!==1||
           preg_match_all('/./us',$title)>160||
           !is_string($uri)||strlen($uri)>1000||
           preg_match('/[\\x00-\\x20\\x7f]/',$uri)===1)
            continue;
        $parts=parse_url($uri);
        if(!is_array($parts)||($parts['scheme']??null)!=='https'||
           empty($parts['host'])||isset($parts['user'])||
           isset($parts['pass'])||isset($parts['fragment'])||
           (isset($parts['port'])&&(int)$parts['port']!==443)||
           filter_var((string)$parts['host'],FILTER_VALIDATE_IP)!==false)
            continue;
        $items[]=[
            'sourceId'=>$id,'title'=>$title,
            'rights'=>$row['rights_state'],
            'originalPolicyMinMinutes'=>(int)ceil(
                (int)$row['refresh_interval_seconds']/60),
            'ownerMustChooseCategoryAndPriority'=>true
        ];
    }
    return [
        'schema'=>'jr.jrei.news-owner-stageable-original-sources.v1',
        'items'=>$items,'returnedCount'=>count($items),
        'monitorStaged'=>false,'acquisitionStarted'=>false
    ];
}
