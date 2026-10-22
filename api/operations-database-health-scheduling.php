<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-governed database health scheduling, with no automatic host activation.
 * Needs an explicit owner-enabled preference AND a separately owner-approved
 * Bertina CLI Cron registration. No repairs, SQL DDL, mail, customer data,
 * external API requests, automatic log deletion or background browser work.
 */
function operationsDbHealthNextDue(string $cadence,int $clock,int $after): ?int {
    if(!in_array($cadence,['hourly','daily'],true)||$clock<0||$clock>1439)return null;
    $tz=new DateTimeZone('Asia/Tehran');
    $base=(new DateTimeImmutable('@'.$after))->setTimezone($tz);
    if($cadence==='hourly'){
        // The minute of the entered Tehran clock is applied each hour.
        $candidate=$base->setTime((int)$base->format('G'),$clock%60,0);
        if($candidate->getTimestamp()<=$after)$candidate=$candidate->modify('+1 hour');
    }else{
        $candidate=$base->setTime(intdiv($clock,60),$clock%60,0);
        if($candidate->getTimestamp()<=$after)$candidate=$candidate->modify('+1 day');
    }
    return $candidate->getTimestamp();
}
function operationsDbHealthHistory(PDO $pdo,array $settings,int $at): array {
    $lastScheduled=null;$rows=[];
    try {
        $q=$pdo->query('SELECT origin,slot_due_at,observed_at,result,checks_observed,
             checks_attention,checks_unavailable,tables_observed
             FROM operations_database_health_runs
             ORDER BY observed_at DESC,sequence_id DESC LIMIT 25');
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r){
            $record=[
                'origin'=>(string)$r['origin'],
                'dueAt'=>$r['slot_due_at']===null?null:(int)$r['slot_due_at'],
                'observedAt'=>(int)$r['observed_at'],
                'result'=>(string)$r['result'],
                'checksObserved'=>(int)$r['checks_observed'],
                'checksAttention'=>(int)$r['checks_attention'],
                'checksUnavailable'=>(int)$r['checks_unavailable'],
                'tablesObserved'=>$r['tables_observed']===null?null:(int)$r['tables_observed']
            ];
            if($record['origin']==='scheduled'&&$lastScheduled===null)
                $lastScheduled=$record['observedAt'];
            $rows[]=$record;
        }
        $state='available';
    }catch(Throwable $e){$state='unavailable';}
    $enabled=$settings['available']===true
        &&$settings['monitoringEnabled']===true
        &&in_array($settings['cadence'],['hourly','daily'],true);
    // Changing the owner's policy resets future due slots, never replays
    // potentially years of missed server Cron executions.
    $baseline=max((int)($settings['updatedAt']??0),(int)($lastScheduled??0));
    $next=($enabled&&$baseline>0)
        ?operationsDbHealthNextDue((string)$settings['cadence'],(int)$settings['clockMinutes'],$baseline)
        :null;
    return [
        'status'=>$state,'rows'=>$rows,
        'ownerPolicyEnabled'=>$enabled,
        'nextDueAt'=>$state==='available'?$next:null,
        'dueButCronUnverified'=>$state==='available'&&$enabled&&$next!==null&&$next<=$at,
        'hostCronVerified'=>null,
        'policy'=>'owner_opt_in_no_automatic_host_registration',
        'windowTimezone'=>'Asia/Tehran',
        'limit'=>25
    ];
}
function operationsDbHealthRecordRun(PDO $pdo,array $report,string $origin,?int $due,int $at): void {
    if(!in_array($origin,['manual','scheduled'],true))throw new InvalidArgumentException('invalid_db_health_origin');
    $checks=isset($report['checks'])&&is_array($report['checks'])?$report['checks']:[];
    $observed=0;$attention=0;$unavailable=0;
    foreach($checks as $item){
        if(($item['state']??null)==='observed')$observed++;
        elseif(($item['state']??null)==='attention')$attention++;
        else $unavailable++;
    }
    $result=$unavailable>0?'unavailable':($attention>0?'attention':'observed');
    $tables=isset($report['inventory']['tableCount'])&&
        is_int($report['inventory']['tableCount'])
        ?$report['inventory']['tableCount']:null;
    $pdo->prepare('INSERT INTO operations_database_health_runs
        (origin,slot_due_at,observed_at,result,
         checks_observed,checks_attention,checks_unavailable,tables_observed)
         VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$origin,$due,$at,$result,$observed,$attention,$unavailable,$tables]);
}
function operationsDbHealthManualRun(PDO $pdo,string $actor,int $at): array {
    $report=operationsDbHealthReport($pdo,$at);
    $pdo->beginTransaction();
    try {
        operationsDbHealthRecordRun($pdo,$report,'manual',null,$at);
        $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at)
              VALUES(?,?,?,?)')->execute([$actor,'database_health_manual_scan',
               'metadata_only_no_automatic_repair',$at]);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    $report['mode']='manual_recorded';
    $report['observationHistory']=operationsDbHealthHistory($pdo,operationsDbHealthSettings($pdo),$at);
    return $report;
}
/** CLI-only entrypoint calls this after loading private config. */
function operationsDbHealthScheduleTick(PDO $pdo,int $at): array {
    $settings=operationsDbHealthSettings($pdo);
    // Fail closed even if an unknown host Cron has been installed.
    if(!$settings['available']||!$settings['monitoringEnabled']
        ||!in_array($settings['cadence'],['hourly','daily'],true))
        return ['status'=>'paused_by_owner','recorded'=>false];
    $lock=(int)$pdo->query("SELECT GET_LOCK('drjr_ops_db_health_v1',0)")->fetchColumn();
    if($lock!==1)return ['status'=>'busy','recorded'=>false];
    try {
        $settings=operationsDbHealthSettings($pdo);
        if(!$settings['available']||!$settings['monitoringEnabled']
            ||!in_array($settings['cadence'],['hourly','daily'],true))
            return ['status'=>'paused_by_owner','recorded'=>false];
        $history=operationsDbHealthHistory($pdo,$settings,$at);
        if($history['status']!=='available')
            return ['status'=>'health_history_unavailable','recorded'=>false];
        $due=$history['nextDueAt'];
        if($due===null||$due>$at)return ['status'=>'not_due','recorded'=>false];
        $report=operationsDbHealthReport($pdo,$at);
        operationsDbHealthRecordRun($pdo,$report,'scheduled',$due,$at);
        return ['status'=>'recorded','recorded'=>true,
            'needsAttention'=>count(array_filter($report['checks']??[],
                static fn(array $r):bool=>($r['state']??'')==='attention'))>0];
    }finally{
        $pdo->query("SELECT RELEASE_LOCK('drjr_ops_db_health_v1')");
    }
}
