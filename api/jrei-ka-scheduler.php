<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI-KA scheduling: durable, bounded, repeatable source-authorization gate.
 * NO HTTP fetch, document parsing, student records, external task execution,
 * automatic source approval, mail or model invocation occurs in this module.
 */
function jrKaSchemaReady(PDO $pdo): bool {
    try{
        foreach([
          'SELECT singleton_id,scheduling_enabled,policy_revision FROM jrei_ka_controls LIMIT 0',
          'SELECT source_id,scheduling_state,next_due_at,rights_evidence_sha256,robots_terms_evidence_sha256,transport_evidence_sha256 FROM jrei_ka_source_policies LIMIT 0',
          'SELECT job_id,job_state,next_attempt_at FROM jrei_ka_jobs LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
function jrKaUuid(): string {
    $bytes=random_bytes(16);
    $bytes[6]=chr((ord($bytes[6])&0x0f)|0x40);
    $bytes[8]=chr((ord($bytes[8])&0x3f)|0x80);
    $hex=bin2hex($bytes);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.
      substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20,12);
}
function jrKaScheduleApprovedSources(PDO $pdo,array $cfg,int $at): array {
    $summary=['schema'=>'jr.jrei.ka-scheduler.v1',
      'scheduled'=>0,'status'=>'OFF','sourceDataDownloaded'=>false,
      'workAutomaticallyDispatched'=>false,'ownerRightsBypassed'=>false];
    if(($cfg['jrei_ka_schedule_enabled']??false)!==true)
        return $summary;
    if(!jrKaSchemaReady($pdo))
        throw new DomainException('jrei_ka_migration_not_installed');
    $pdo->beginTransaction();
    try{
        $q=$pdo->query('SELECT scheduling_enabled,acquisition_enabled,
          max_new_tasks_per_cycle,max_queue_depth,max_daily_download_bytes,
          max_storage_bytes,policy_revision
          FROM jrei_ka_controls WHERE singleton_id=1 FOR UPDATE');
        $controls=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($controls)||
          (int)$controls['scheduling_enabled']!==1||
          (int)$controls['acquisition_enabled']!==1){
            $pdo->commit();return $summary;
        }
        $maxNew=min(10,max(0,(int)$controls['max_new_tasks_per_cycle']));
        $maxQueue=min(200,max(0,(int)$controls['max_queue_depth']));
        if($maxNew===0||$maxQueue===0)
            throw new DomainException('jrei_ka_queue_policy_invalid');
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_ka_jobs
            WHERE job_state IN ('QUEUED','LEASED','RETRY_WAIT')");
        $active=(int)$q->fetchColumn();
        $available=min($maxNew,max(0,$maxQueue-$active));
        if($available===0){
            $pdo->commit();
            return $summary+['queueFull'=>true];
        }
        $q=$pdo->prepare("SELECT
             p.source_id,p.priority_tier,p.revision,p.next_due_at,
             p.refresh_interval_seconds,p.max_document_bytes
          FROM jrei_ka_source_policies p
          INNER JOIN jrei_exam_sources s ON s.source_id=p.source_id
          WHERE p.scheduling_state='APPROVED'
            AND p.rights_reviewed=1
            AND p.robots_terms_reviewed=1
            AND p.transport_reviewed=1
            AND p.approved_by_account_id IS NOT NULL
            AND p.next_due_at<=?
            AND p.refresh_interval_seconds BETWEEN 3600 AND 2592000
            AND p.max_document_bytes BETWEEN 1024 AND 8388608
            AND p.priority_tier IN ('P0','P1','P2','P3','P4')
            AND s.review_state='AUTHORITATIVE_REVIEWED'
            AND s.is_revoked=0 AND s.is_superseded=0
            AND s.reviewer_account_id IS NOT NULL
            AND s.verified_at IS NOT NULL
            AND s.source_locator_uri LIKE 'https://%'
            AND s.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS',
              'PERMITTED_PUBLIC_DISPLAY','PERMITTED_REPRODUCTION')
          ORDER BY p.priority_tier ASC,p.next_due_at ASC,p.source_id ASC
          LIMIT 10 FOR UPDATE");
        $q->execute([$at]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $new=$pdo->prepare("INSERT IGNORE INTO jrei_ka_jobs
          (job_id,source_id,due_slot,job_kind,priority_tier,
            source_policy_revision,job_state,next_attempt_at,
            created_at,updated_at)
          VALUES (?,?,?,'VERIFY_PUBLIC_SOURCE',?,?,'QUEUED',?,?,?)");
        $advance=$pdo->prepare('UPDATE jrei_ka_source_policies
          SET last_scheduled_at=?,next_due_at=?,updated_at=?
          WHERE source_id=? AND revision=?');
        foreach($rows as $row){
            if($summary['scheduled']>=$available)break;
            $source=(string)$row['source_id'];
            $due=(int)$row['next_due_at'];
            $revision=(int)$row['revision'];
            $interval=(int)$row['refresh_interval_seconds'];
            if($due<=0||$revision<1)continue;
            $new->execute([jrKaUuid(),$source,$due,
              (string)$row['priority_tier'],$revision,$at,$at,$at]);
            // Unique due-slot prevents duplicate dispatch even when a
            // scheduler retries after its previous transaction committed.
            if($new->rowCount()===1)$summary['scheduled']++;
            $advance->execute([$at,$at+$interval,$at,$source,$revision]);
        }
        $pdo->commit();
        $summary['status']='QUEUED_METADATA_ONLY';
        return $summary;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrKaOwnerSnapshot(PDO $pdo,array $cfg): array {
    $ready=jrKaSchemaReady($pdo);
    $out=[
      'schema'=>'jr.jrei.ka-owner.v1',
      'schemaReady'=>$ready,
      'privateScheduleOptIn'=>($cfg['jrei_ka_schedule_enabled']??false)===true,
      'controls'=>null,'jobStates'=>null,'approvedSources'=>null,
      'sourcePolicies'=>null,
      'nextDueAt'=>null,'realCrawlerVerified'=>false,
      'retrievedOfficialAnswerKeysVerified'=>false,
      'workerDispatchVerified'=>false,'storageConsumptionVerified'=>false
    ];
    if(!$ready)return $out;
    $q=$pdo->query('SELECT scheduling_enabled,acquisition_enabled,
      max_new_tasks_per_cycle,max_queue_depth,max_daily_download_bytes,
      max_storage_bytes,policy_revision FROM jrei_ka_controls WHERE singleton_id=1');
    $c=$q->fetch(PDO::FETCH_ASSOC);
    if(is_array($c))$out['controls']=[
      'schedulingEnabled'=>(int)$c['scheduling_enabled']===1,
      'acquisitionEnabled'=>(int)$c['acquisition_enabled']===1,
      'maxNewTasksPerCycle'=>(int)$c['max_new_tasks_per_cycle'],
      'maxQueueDepth'=>(int)$c['max_queue_depth'],
      'maxDailyBytes'=>(int)$c['max_daily_download_bytes'],
      'maxStorageBytes'=>(int)$c['max_storage_bytes'],
      'policyRevision'=>(int)$c['policy_revision']
    ];
    $q=$pdo->query("SELECT p.source_id,s.source_title,p.priority_tier,
        p.scheduling_state,p.refresh_interval_seconds,
        p.max_document_bytes,p.min_request_spacing_seconds,
        p.rights_reviewed,p.robots_terms_reviewed,p.transport_reviewed,
        p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
        p.transport_evidence_sha256,p.revision,p.next_due_at
        FROM jrei_ka_source_policies p
        JOIN jrei_exam_sources s ON s.source_id=p.source_id
        ORDER BY p.next_due_at,p.source_id LIMIT 40");
    $out['sourcePolicies']=[];
    foreach($q as $policy)$out['sourcePolicies'][]=[
      'sourceId'=>$policy['source_id'],
      'sourceTitle'=>$policy['source_title'],
      'priorityTier'=>$policy['priority_tier'],
      'state'=>$policy['scheduling_state'],
      'refreshIntervalSeconds'=>(int)$policy['refresh_interval_seconds'],
      'maxDocumentBytes'=>(int)$policy['max_document_bytes'],
      'minRequestSpacingSeconds'=>(int)$policy['min_request_spacing_seconds'],
      'rightsReviewed'=>(int)$policy['rights_reviewed']===1,
      'robotsTermsReviewed'=>(int)$policy['robots_terms_reviewed']===1,
      'transportReviewed'=>(int)$policy['transport_reviewed']===1,
      'rightsEvidenceSha256'=>$policy['rights_evidence_sha256'],
      'robotsEvidenceSha256'=>$policy['robots_terms_evidence_sha256'],
      'transportEvidenceSha256'=>$policy['transport_evidence_sha256'],
      'revision'=>(int)$policy['revision'],
      'nextDueAt'=>(int)$policy['next_due_at']
    ];
    $q=$pdo->query("SELECT job_state,COUNT(*) AS n
      FROM jrei_ka_jobs GROUP BY job_state LIMIT 20");
    $out['jobStates']=[];
    foreach($q as $r)$out['jobStates'][]=[
      'state'=>(string)$r['job_state'],'count'=>(int)$r['n']
    ];
    $q=$pdo->query("SELECT COUNT(*) AS n,MIN(next_due_at) AS due
      FROM jrei_ka_source_policies WHERE scheduling_state='APPROVED'");
    $r=$q->fetch(PDO::FETCH_ASSOC);
    $out['approvedSources']=(int)($r['n']??0);
    $out['nextDueAt']=$r['due']===null?null:(int)$r['due'];
    return $out;
}
