<?php
declare(strict_types=1);
/**
 * JR Master Scheduler v1 — the ONE planned host Cron entrypoint.
 * CLI only, allowlisted workers, mother-DB opt-in, PHP subprocess without a
 * shell, bounded single instance and no default activation. Never expose as
 * HTTP, invoke on a visitor request, or use an untrusted DB command as PHP.
 *
 * HOST PRECONDITIONS: Bertina support confirmed minimum five-minute\n * schedule (2026-10-23); verified PHP 8.3 CLI, proc_open permission,
 * private bounded log retention, deployed source, migrations and an
 * explicitly owner-authorized master flag AND per-worker settings.
 * No host schedule, email permission or database mutation is implied here.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-cron-dispatcher.php';

function jrMasterWorker(string $script,int $limitSeconds): array {
    if(!function_exists('proc_open'))
        return ['state'=>'blocked','exit'=>null];
    $command=[PHP_BINARY,$script]; // array => no shell interpolation
    $descriptors=[['pipe','r'],['pipe','w'],['pipe','w']];
    $pipes=[];
    try{
        $proc=@proc_open($command,$descriptors,$pipes,dirname(__DIR__),null,
            ['bypass_shell'=>true]);
    }catch(Throwable $e){return ['state'=>'blocked','exit'=>null];}
    if(!is_resource($proc))return ['state'=>'blocked','exit'=>null];
    if(isset($pipes[0]))fclose($pipes[0]);
    foreach([1,2] as $fd)if(isset($pipes[$fd]))
        stream_set_blocking($pipes[$fd],false);
    $deadline=microtime(true)+max(1,min(20,$limitSeconds));
    $exit=null;$timedOut=false;
    while(true){
        foreach([1,2] as $fd)if(isset($pipes[$fd]))
            @fread($pipes[$fd],8192); // drain/discard; no PII in logs
        $status=proc_get_status($proc);
        if(!$status['running']){
            $code=(int)$status['exitcode'];
            if($code>=0)$exit=$code;
            break;
        }
        if(microtime(true)>=$deadline){$timedOut=true;break;}
        usleep(100000);
    }
    if($timedOut){
        @proc_terminate($proc);
        usleep(200000);
        $status=proc_get_status($proc);
        if($status['running'])@proc_terminate($proc,9);
    }
    foreach([1,2] as $fd)if(isset($pipes[$fd])){
        @stream_get_contents($pipes[$fd]);
        fclose($pipes[$fd]);
    }
    $closed=@proc_close($proc);
    if($timedOut)return ['state'=>'unknown','exit'=>null];
    if($exit===null&&is_int($closed)&&$closed>=0)$exit=$closed;
    return $exit===0?['state'=>'completed','exit'=>0]:
        ($exit===null?['state'=>'unknown','exit'=>null]:
            ['state'=>'failed','exit'=>$exit]);
}
/**
 * Recover abandoned claims even when the job was disabled after start or
 * next_due_at has not arrived. Runs ONLY while this dispatcher exclusively
 * owns the global MySQL advisory lock. An orphaned child may have already
 * sent mail, so the source must halt that job for manual reconciliation.
 */
function jrMasterReconcileStale(PDO $pdo,int $at): int {
    $threshold=$at-120;
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT job_id FROM operations_cron_jobs
            WHERE last_state='running' AND last_started_at<=?
            ORDER BY last_started_at ASC,job_id ASC LIMIT 30 FOR UPDATE");
        $q->execute([$threshold]);
        $ids=$q->fetchAll(PDO::FETCH_COLUMN);
        $count=0;
        foreach($ids as $id){
            $change=$pdo->prepare("UPDATE operations_cron_jobs
              SET enabled=0,needs_owner_review=1,last_state='unknown',
                  last_finished_at=?,last_exit_code=NULL,
                  next_due_at=0,row_revision=row_revision+1,updated_at=?
              WHERE job_id=? AND last_state='running' AND last_started_at<=?");
            $change->execute([$at,$at,(string)$id,$threshold]);
            $count+=$change->rowCount();
        }
        $pdo->commit();
        return $count;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrMasterClaim(PDO $pdo,string $id,int $at): ?array {
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT enabled,cadence_seconds,next_due_at,
            needs_owner_review,last_state,last_started_at
            FROM operations_cron_jobs WHERE job_id=? FOR UPDATE');
        $q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!$r||(int)$r['enabled']!==1||
           (int)$r['needs_owner_review']!==0||(int)$r['next_due_at']>$at){
            $pdo->commit();return null;
        }
        // A scheduler crash while a child might be delivering email is an
        // UNKNOWN, never a licence to start it again automatically.
        if($r['last_state']==='running'){
            if((int)$r['last_started_at']<$at-120){
                $pdo->prepare("UPDATE operations_cron_jobs
                  SET enabled=0,needs_owner_review=1,last_state='unknown',
                      last_finished_at=?,last_exit_code=NULL,next_due_at=0,
                      row_revision=row_revision+1,updated_at=?
                  WHERE job_id=?")->execute([$at,$at,$id]);
                $pdo->commit();return null;
            }
            $pdo->commit();return null;
        }
        $seconds=(int)$r['cadence_seconds'];
        $minimum=(int)(operationsCronRegistry()[$id]['minimumCadence']??0);
        // Enforce the source-owned minimum even if a private SQL edit has
        // bypassed the MFA API. DB rows cannot accelerate risky workers.
        if($minimum<300||$seconds<$minimum||
           $seconds>86400||$seconds%300!==0){
            $pdo->prepare("UPDATE operations_cron_jobs
              SET enabled=0,needs_owner_review=1,last_state='blocked',
                  next_due_at=0,row_revision=row_revision+1,updated_at=?
              WHERE job_id=?")->execute([$at,$id]);
            $pdo->commit();return null;
        }
        // Persist claim before a potential side effect. A crash after this
        // line leaves RUNNING, which is reconciled to owner review above.
        $q=$pdo->prepare("UPDATE operations_cron_jobs
          SET last_state='running',last_started_at=?,
              last_finished_at=NULL,last_exit_code=NULL,next_due_at=?,
              row_revision=row_revision+1,updated_at=?
          WHERE job_id=? AND enabled=1 AND needs_owner_review=0");
        $q->execute([$at,$at+$seconds,$at,$id]);
        if($q->rowCount()!==1)
            throw new RuntimeException('cron_claim_conflict');
        $pdo->commit();
        return ['jobId'=>$id,'startedAt'=>$at];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrMasterFinish(PDO $pdo,array $claim,array $result): void {
    $state=(string)$result['state'];
    $review=$state!=='completed';
    $q=$pdo->prepare('UPDATE operations_cron_jobs
       SET last_state=?,last_finished_at=?,last_exit_code=?,
           needs_owner_review=IF(?,1,needs_owner_review),
           enabled=IF(?,0,enabled),row_revision=row_revision+1,updated_at=?
       WHERE job_id=? AND last_state=? AND last_started_at=?');
    $at=time();
    $q->execute([$state,$at,$result['exit'],$review?1:0,$review?1:0,
        $at,$claim['jobId'],'running',$claim['startedAt']]);
    if($q->rowCount()!==1)
        throw new RuntimeException('cron_result_conflict');
}
/**
 * Optional, measured protection for customer-facing Bertina requests.
 * Linux load average is host-level (possibly shared); it is NOT a direct
 * measurement of website latency and is intentionally not used until a
 * private owner-configured threshold has been established.
 *
 * This applies ONLY to deferrable AI acquisition/benchmark work. Never
 * defer private retention, payment-related mail, recovery or alerts here.
 * Delayed jobs keep their original next_due_at and can run on the next tick.
 */
function jrMasterDeferrableAiJob(string $id): bool {
    return str_starts_with($id,'jrei_ka_') ||
        in_array($id,[
          'jrei_news_original_feed_projection',
          'jrei_news_original_article_intake',
          'jrei_news_original_private_draft',
          'jrei_ai_private_quality_benchmark',
          'jrei_ai_benchmark_case_discovery',
          'jrei_ai_improvement_discovery',
          'jrei_daily_learning'
        ],true);
}
function jrMasterHostLoadTooHigh(array $config): bool {
    $threshold=$config['operations_cron_ai_max_load1']??null;
    if((!is_int($threshold)&&!is_float($threshold))||
       !is_finite((float)$threshold)||
       $threshold<0.5||$threshold>256||
       !function_exists('sys_getloadavg'))return false;
    $loads=@sys_getloadavg();
    return is_array($loads)&&isset($loads[0])&&
        is_numeric($loads[0])&&(float)$loads[0]>=(float)$threshold;
}

function jrMasterDispatch(): int {
    $config=cfg();
    // Both the master private flag and each mother-DB row default OFF.
    if(!operationsCronMasterEnabled($config)){
        fwrite(STDOUT,"JR master scheduler disabled by private owner policy.\n");
        return 0;
    }
    if(PHP_VERSION_ID<80300||!function_exists('proc_open')){
        fwrite(STDERR,"JR master scheduler host PHP CLI subprocess capability unavailable.\n");
        return 2;
    }
    $pdo=db();
    if(!$pdo||!operationsCronSchemaReady($pdo)){
        fwrite(STDERR,"JR master scheduler mother-database policy unavailable.\n");
        return 2;
    }
    $lockName='jr-ops-master-scheduler-v1';
    $q=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $q->execute([$lockName]);
    if((int)$q->fetchColumn()!==1){
        fwrite(STDOUT,"JR master scheduler already running; no overlap.\n");
        return 0;
    }
    $started=microtime(true);$attempts=0;$issues=0;
    try{
        $issues+=jrMasterReconcileStale($pdo,time());
        $registry=operationsCronRegistry();
        $ids=array_keys($registry);
        if(!$ids)throw new RuntimeException('cron_allowlist_empty');
        $marks=implode(',',array_fill(0,count($ids),'?'));
        // An unrecognised enabled DB row must never execute OR starve the
        // known due jobs by occupying a bounded LIMIT before allowlist checks.
        $q=$pdo->prepare('SELECT job_id FROM operations_cron_jobs
            WHERE job_id IN ('.$marks.') AND enabled=1
              AND needs_owner_review=0 AND next_due_at<=?
            ORDER BY next_due_at ASC,job_id ASC LIMIT 30');
        $q->execute([...$ids,time()]);
        // The public site's essential retention, mail and incident jobs
        // take precedence when an AI backlog is overdue. PHP 8's stable
        // sort preserves the original next_due_at order within each tier.
        // This is the ONE approved master scheduler, not a new queue.
        $due=$q->fetchAll(PDO::FETCH_COLUMN);
        $essential=[
            'jrei_local_chat_retention',
            'jrei_hybrid_lease_reconciliation',
            'jrei_hybrid_metadata_retention',
            'operations_alert_mail',
            'newsletter_outbox',
            'publishing_outbox',
            'jrei_exam_deadline_review'
        ];
        $tier=static fn(string $job): int =>
            in_array($job,$essential,true)?0:
            (jrMasterDeferrableAiJob($job)?2:1);
        usort($due,static fn($a,$b): int=>
            $tier((string)$a)<=>$tier((string)$b));
        foreach($due as $id){
            if($attempts>=4||microtime(true)-$started>35)break;
            if(!isset($registry[$id]))continue;
            // Recheck after each prior child. A busy shared host must not
            // launch more discretionary JREI AI/collection subprocesses.
            // This is a pure defer: no claim, no state change, no retry
            // ambiguity, no loss of the scheduled job.
            if(jrMasterDeferrableAiJob((string)$id)&&
               jrMasterHostLoadTooHigh($config))continue;
            $script=operationsCronSourcePath((string)$id);
            if($script===null){
                // No approved source code => never execute arbitrary DB data.
                $pdo->prepare("UPDATE operations_cron_jobs SET enabled=0,
                  needs_owner_review=1,last_state='blocked',next_due_at=0,
                  row_revision=row_revision+1,updated_at=?
                  WHERE job_id=? AND enabled=1")
                  ->execute([time(),$id]);
                $issues++;continue;
            }
            $claim=jrMasterClaim($pdo,(string)$id,time());
            if($claim===null)continue;
            $attempts++;
            $available=max(1,(int)floor(43-(microtime(true)-$started)));
            $result=jrMasterWorker($script,min(12,$available));
            jrMasterFinish($pdo,$claim,$result);
            if($result['state']!=='completed')$issues++;
            // Only bounded, nonpersonal facts. Child output/SMTP credentials
            // are deliberately neither printed nor kept in the policy table.
            fwrite(STDOUT,'JR scheduled job '.$id.': '.$result['state']."\n");
        }
    }finally{
        $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
    fwrite(STDOUT,"JR master tick completed; attempts=".$attempts.
        "; unresolved=".$issues."; host schedule not certified by source.\n");
    return $issues>0?1:0;
}
try{exit(jrMasterDispatch());}
catch(Throwable $e){
    // Never reveal DSN, private worker paths, account identities or secrets.
    fwrite(STDERR,"JR master dispatcher unavailable; owner review required.\n");
    exit(1);
}
