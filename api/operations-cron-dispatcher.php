<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * One allowlisted scheduler for the existing Bertina PHP workers and mother DB.
 * This module contains definitions/owner policy only. Merely including it
 * cannot run an engine, send mail, change published routes or grant access.
 *
 * Future jobs require an additive CODE registry entry, not a new host cron.
 * Database fields never contain arbitrary executable paths or shell commands.
 */
function operationsCronRegistry(): array {
    return [
      'github_collector'=>[
        'fa'=>'گردآوری منابع GitHub','en'=>'GitHub source collector',
        'relative'=>'internal/operations-collector-cron.php',
        'defaultCadence'=>600,'minimumCadence'=>600,'sensitive'=>false],
      'response_monitor'=>[
        'fa'=>'پایش پاسخ و هدرها','en'=>'Response and header monitor',
        'relative'=>'internal/operations-response-monitor-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>false],
      'private_http_log'=>[
        'fa'=>'مشاهده‌گر لاگ خصوصی','en'=>'Private HTTP log observer',
        'relative'=>'internal/operations-http-log-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'operations_alert_mail'=>[
        'fa'=>'صف هشدارهای مدیر','en'=>'Operations alert outbox',
        'relative'=>'internal/operations-alert-mail-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'newsletter_outbox'=>[
        'fa'=>'صف خبرنامه با رضایت معتبر','en'=>'Consented newsletter outbox',
        'relative'=>'newsletter-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'publishing_outbox'=>[
        'fa'=>'صف اعلان‌های انتشارات','en'=>'Publishing notification outbox',
        'relative'=>'internal/jr-publishing-mail-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'jrei_daily_learning'=>[
        'fa'=>'ارزیابی یادگیری روزانه JREI','en'=>'JREI daily learning evaluator',
        'relative'=>'internal/jrei-daily-learning-worker.php',
        'defaultCadence'=>86400,'minimumCadence'=>86400,'sensitive'=>true],
      'jrei_hybrid_incident_sensor'=>[
        'fa'=>'پایش اختلال دو Worker آموزشی','en'=>'JREI hybrid worker incident sensor',
        'relative'=>'internal/jrei-hybrid-incident-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'jrei_hybrid_metadata_retention'=>[
        'fa'=>'پاک‌سازی محدود فرادادهٔ موقت JREI',
        'en'=>'JREI transient metadata retention',
        'relative'=>'internal/jrei-hybrid-retention-worker.php',
        'defaultCadence'=>86400,'minimumCadence'=>86400,'sensitive'=>true],
      'jrei_hybrid_lease_reconciliation'=>[
        'fa'=>'رسیدگی ایمن به اجاره‌های منقضی‌شدهٔ JREI',
        'en'=>'JREI expired job lease reconciliation',
        'relative'=>'internal/jrei-hybrid-lease-reconciler.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true],
      'jrei_ka_schedule'=>[
        'fa'=>'زمان‌بندی منابع مجاز آموزشی JREI',
        'en'=>'JREI-KA authorised educational source scheduler',
        'relative'=>'internal/jrei-ka-schedule-worker.php',
        'defaultCadence'=>3600,'minimumCadence'=>3600,'sensitive'=>true],
      'jrei_exam_deadline_review'=>[
        'fa'=>'بررسی آزمون‌های منقضی‌شدهٔ JREI',
        'en'=>'JREI unfinished exam deadline review',
        'relative'=>'internal/jrei-exam-deadline-worker.php',
        'defaultCadence'=>300,'minimumCadence'=>300,'sensitive'=>true]
    ];
}
function operationsCronSourcePath(string $jobId): ?string {
    $job=operationsCronRegistry()[$jobId]??null;
    if(!is_array($job))return null;
    $root=realpath(__DIR__);
    $path=realpath(__DIR__.'/'.$job['relative']);
    if($root===false||$path===false||
       !str_starts_with($path,$root.DIRECTORY_SEPARATOR)||
       !is_file($path)||!is_readable($path))return null;
    return $path;
}
function operationsCronSchemaReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT job_id,enabled,cadence_seconds,next_due_at,
            last_started_at,last_finished_at,last_state,last_exit_code,
            needs_owner_review,row_revision,updated_at,updated_by_account_id
            FROM operations_cron_jobs LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function operationsCronMasterEnabled(array $config): bool {
    return ($config['operations_cron_master_enabled']??false)===true;
}
function operationsCronOwnerSnapshot(PDO $pdo,array $config): array {
    $registry=operationsCronRegistry();
    $schema=operationsCronSchemaReady($pdo);
    $byId=[];$unrecognized=null;
    if($schema){
        $ids=array_keys($registry);
        if(!$ids)throw new RuntimeException('cron_registry_unavailable');
        $marks=implode(',',array_fill(0,count($ids),'?'));
        // Project only source-approved rows; do not load or expose arbitrary
        // policy-table records as approved executable jobs.
        $q=$pdo->prepare('SELECT job_id,enabled,cadence_seconds,next_due_at,
            last_started_at,last_finished_at,last_state,last_exit_code,
            needs_owner_review,row_revision,updated_at
            FROM operations_cron_jobs WHERE job_id IN ('.$marks.')');
        $q->execute($ids);
        foreach($q as $r) $byId[(string)$r['job_id']]=$r;
        $count=$pdo->prepare('SELECT COUNT(*) FROM operations_cron_jobs
            WHERE job_id NOT IN ('.$marks.')');
        $count->execute($ids);
        $unrecognized=(int)$count->fetchColumn();
    }
    $master=operationsCronMasterEnabled($config);
    $phpReady=PHP_VERSION_ID>=80300;
    $spawnReady=function_exists('proc_open')&&
      !in_array('proc_open',array_map('trim',explode(',',(string)ini_get('disable_functions'))),true);
    $rows=[];
    foreach($registry as $id=>$job){
        $r=$byId[$id]??null;
        $fileReady=operationsCronSourcePath($id)!==null;
        $rows[]=[
            'jobId'=>$id,'nameFa'=>$job['fa'],'nameEn'=>$job['en'],
            'registered'=>$r!==null,'enabled'=>$r!==null&&(int)$r['enabled']===1,
            'cadenceSeconds'=>$r?(int)$r['cadence_seconds']:$job['defaultCadence'],
            'minimumCadenceSeconds'=>$job['minimumCadence'],
            'defaultCadenceSeconds'=>$job['defaultCadence'],
            'sourceAvailable'=>$fileReady,'sensitive'=>(bool)$job['sensitive'],
            'needsOwnerReview'=>$r!==null&&(int)$r['needs_owner_review']===1,
            'nextDueAt'=>$r?(int)$r['next_due_at']:null,
            'lastStartedAt'=>$r&&$r['last_started_at']!==null?(int)$r['last_started_at']:null,
            'lastFinishedAt'=>$r&&$r['last_finished_at']!==null?(int)$r['last_finished_at']:null,
            'lastState'=>$r?(string)$r['last_state']:'not_registered',
            'lastExitCode'=>$r&&$r['last_exit_code']!==null?(int)$r['last_exit_code']:null,
            'rowRevision'=>$r?(int)$r['row_revision']:null
        ];
    }
    return ['ok'=>true,'schema'=>'jr.operations-cron-owner.v1',
        'dataState'=>$schema?'SOURCE_POLICY_READ':'MOTHER_DB_MIGRATION_REQUIRED',
        'masterEnabled'=>$master,'webRuntimePhp83Observed'=>$phpReady,
        'webRuntimeProcOpenObserved'=>$spawnReady,
        'phpCli83SourceCompatible'=>null, 'subprocessAvailable'=>null,
        'serverCronVerified'=>false,
        'hostExecutionVerified'=>false,'emailDeliveryVerified'=>false,
        'schemaReady'=>$schema,'hostMinimumCadenceSeconds'=>300,
        'unknownRegisteredRows'=>$unrecognized,
        'checkedAt'=>time(),'jobs'=>$rows,
        'limitations'=>'Source presence and policy are not proof of host installation, real execution, SMTP receipt or safe access-log configuration.'];
}
/**
 * Owner editing is performed ONLY by the existing authenticated SUPER_ADMIN
 * + fresh TOTP + exact-origin CSRF router. Never auto-register/enroll a worker
 * during a public request or from its unauthorised user-controlled job ID.
 */
function operationsCronOwnerChange(PDO $pdo,array $config,
    string $accountId,array $body): array {
    if(!operationsCronSchemaReady($pdo))
        throw new DomainException('operations_cron_migration_required');
    $jobId=$body['jobId']??null;
    $action=$body['action']??null;
    if(!is_string($jobId)||!isset(operationsCronRegistry()[$jobId])||
       !is_string($action)||!in_array($action,['register','configure','reconcile','quarantine'],true))
        throw new InvalidArgumentException('invalid_cron_control');
    $job=operationsCronRegistry()[$jobId];
    // Missing source must prohibit registration and *enablement*, but must
    // never prevent an owner from quarantining or disabling an existing row.
    if($action==='register'&&operationsCronSourcePath($jobId)===null)
        throw new DomainException('cron_source_unavailable');
    if($action==='register'){
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('INSERT IGNORE INTO operations_cron_jobs
                (job_id,enabled,cadence_seconds,next_due_at,updated_at,updated_by_account_id)
                VALUES (?,0,?,0,?,?)');
            $q->execute([$jobId,$job['defaultCadence'],time(),$accountId]);
            if($q->rowCount()!==1)
                throw new DomainException('cron_already_registered');
            operationsAudit($pdo,$accountId,'cron_source_registered',$jobId);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return operationsCronOwnerSnapshot($pdo,$config);
    }
    // Emergency owner quarantine is a future-dispatch stop, NOT a promise
    // to cancel any child process already running or undo an accepted email.
    // It works even if the global master flag is switched OFF during a crash.
    if($action==='quarantine'){
        $revision=$body['rowRevision']??null;
        if(!is_int($revision)||$revision<1||
           ($body['confirmation']??'')!=='STOP_FUTURE_DISPATCH_REVIEW_OUTCOME')
            throw new InvalidArgumentException('invalid_cron_quarantine');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT enabled,needs_owner_review,last_state,row_revision
              FROM operations_cron_jobs WHERE job_id=? FOR UPDATE');
            $q->execute([$jobId]);$r=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($r)||(int)$r['row_revision']!==$revision)
                throw new DomainException('cron_schedule_conflict');
            $now=time();
            $change=$pdo->prepare("UPDATE operations_cron_jobs SET
               enabled=0,needs_owner_review=1,next_due_at=0,
               last_state=IF(last_state='running','unknown',last_state),
               row_revision=row_revision+1,updated_at=?,updated_by_account_id=?
               WHERE job_id=? AND row_revision=?");
            $change->execute([$now,$accountId,$jobId,$revision]);
            if($change->rowCount()!==1)
                throw new DomainException('cron_schedule_conflict');
            operationsAudit($pdo,$accountId,'cron_owner_quarantine',$jobId);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return operationsCronOwnerSnapshot($pdo,$config);
    }
    // A prior unknown/failed delivery cannot be retried by simply editing
    // its schedule. Require a separate, explicit owner reconciliation after
    // independently checking external side effects; never auto-retry SMTP.
    if($action==='reconcile'){
        $revision=$body['rowRevision']??null;
        $outcome=$body['reviewOutcome']??null;
        if(!is_int($revision)||$revision<1||
           !is_string($outcome)||
           !in_array($outcome,['confirmed_no_external_effect','manually_reconciled'],true)||
           ($body['confirmation']??'')!=='ACKNOWLEDGE_PRIOR_JOB_OUTCOME')
            throw new InvalidArgumentException('invalid_cron_reconciliation');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT enabled,needs_owner_review,last_state,row_revision
              FROM operations_cron_jobs WHERE job_id=? FOR UPDATE');
            $q->execute([$jobId]);$row=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($row)||(int)$row['row_revision']!==$revision)
                throw new DomainException('cron_schedule_conflict');
            if((int)$row['enabled']!==0||(int)$row['needs_owner_review']!==1||
               !in_array((string)$row['last_state'],['failed','unknown','blocked'],true))
                throw new DomainException('cron_manual_review_required');
            $now=time();
            $q=$pdo->prepare('UPDATE operations_cron_jobs SET
                needs_owner_review=0,next_due_at=0,row_revision=row_revision+1,
                updated_at=?,updated_by_account_id=?
                WHERE job_id=? AND row_revision=? AND enabled=0 AND needs_owner_review=1');
            $q->execute([$now,$accountId,$jobId,$revision]);
            if($q->rowCount()!==1)
                throw new DomainException('cron_schedule_conflict');
            operationsAudit($pdo,$accountId,
                $outcome==='confirmed_no_external_effect'
                    ?'cron_review_no_effect':'cron_review_reconciled',$jobId);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return operationsCronOwnerSnapshot($pdo,$config);
    }
    $enabled=$body['enabled']??null;
    $cadence=$body['cadenceSeconds']??null;
    $revision=$body['rowRevision']??null;
    if(!is_bool($enabled)||!is_int($cadence)||!is_int($revision)||
       $revision<1||$cadence<$job['minimumCadence']||
       $cadence>86400||$cadence%300!==0)
        throw new InvalidArgumentException('invalid_cron_schedule');
    if($enabled&&operationsCronSourcePath($jobId)===null)
        throw new DomainException('cron_source_unavailable');
    if($enabled&&(!operationsCronMasterEnabled($config)||
      ($body['confirmation']??'')!=='ENABLE_APPROVED_CLI_WORKER'))
        throw new DomainException('explicit_cli_enablement_required');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT enabled,row_revision,needs_owner_review,last_state
          FROM operations_cron_jobs WHERE job_id=? FOR UPDATE');
        $q->execute([$jobId]);
        $old=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($old)||(int)$old['row_revision']!==$revision)
            throw new DomainException('cron_schedule_conflict');
        if($enabled&&((int)$old['needs_owner_review']===1||
            $old['last_state']==='running'))
            throw new DomainException('cron_manual_review_required');
        $now=time();
        $q=$pdo->prepare('UPDATE operations_cron_jobs SET enabled=?,
          cadence_seconds=?,next_due_at=?,
          row_revision=row_revision+1,updated_at=?,updated_by_account_id=?
          WHERE job_id=? AND row_revision=?');
        $q->execute([$enabled?1:0,$cadence,$enabled?$now:0,$now,
            $accountId,$jobId,$revision]);
        if($q->rowCount()!==1)throw new DomainException('cron_schedule_conflict');
        operationsAudit($pdo,$accountId,$enabled?'cron_owner_enabled':'cron_owner_disabled',$jobId);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return operationsCronOwnerSnapshot($pdo,$config);
}
