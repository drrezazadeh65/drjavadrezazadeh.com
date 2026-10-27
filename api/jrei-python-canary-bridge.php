<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
/**
 * First REAL, narrowly-scoped signed Windows -> LOCAL Python -> mother DB job.
 * Fixed computation 12*7, no model/provider access, public data, SQL tools,
 * crawl, learner data, shell, arbitrary Python code or site deployment.
 * Uses ORIGINAL SUPER_ADMIN MFA/CSRF (owner route), ORIGINAL Ed25519 nonce
 * registry (worker route), SAME drjavad1_store, and a separately gated table.
 */
const JR_PY_CANARY_SCHEMA = 'jr.jrei.python-canary.v1';
/** Exact JSON object contract, independent of harmless property ordering. */
function jrPythonCanaryExactFields(array $body,array $allowed): bool {
    $keys=array_keys($body);
    sort($keys,SORT_STRING);
    sort($allowed,SORT_STRING);
    return $keys===$allowed;
}
function jrPythonCanaryReady(PDO $db): bool {
    try {
        $db->query('SELECT job_id,owner_account_id,request_key,state,assigned_node,lease_id,lease_expires_at,created_at,expires_at,completed_at,numerator,denominator,result_sha256 FROM jrei_python_canary_jobs LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}
function jrPythonCanaryUuid(): string {
    $b=random_bytes(16);$b[6]=chr((ord($b[6])&15)|64);$b[8]=chr((ord($b[8])&63)|128);
    $h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
}
/**
 * Operational owner preflight: no writes, secrets, inferred learning or
 * fabricated site↔Windows completion. Only facts read from the mother DB.
 * A fresh signed Python report alone does not establish actual canary execution.
 */
function jrPythonCanaryPreflight(PDO $db,array $cfg,int $now): array {
    $table=jrPythonCanaryReady($db);
    $health=jrPythonNodeSchemaReady($db);
    $enabled=($cfg['jrei_python_canary_enabled']??false)===true;
    $reporting=($cfg['jrei_python_node_heartbeat_enabled']??false)===true;
    $available=false;$nodeCount=0;$lastSeen=null;
    if($health){
        $q=$db->prepare("SELECT COUNT(*) AS fresh_nodes,
            MAX(h.server_received_at) AS last_seen
            FROM jrei_python_node_health h
            JOIN jrei_hybrid_nodes n ON n.node_id=h.node_id
            WHERE h.python_process='RESPONDING'
              AND h.server_received_at BETWEEN ? AND ?
              AND n.status='ENABLED' AND n.revoked_at IS NULL");
        $q->execute([max(0,$now-90),$now+5]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($r)){
            $nodeCount=(int)($r['fresh_nodes']??0);
            $lastSeen=$r['last_seen']===null?null:(int)$r['last_seen'];
            $available=$nodeCount>0;
        }
    }
    $counts=['queued'=>null,'leased'=>null,'completed'=>null,'expired'=>null];
    if($table){
        $q=$db->query("SELECT state,COUNT(*) AS n
            FROM jrei_python_canary_jobs GROUP BY state");
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r){
            $state=strtolower((string)($r['state']??''));
            if(array_key_exists($state,$counts))$counts[$state]=(int)$r['n'];
        }
        foreach($counts as $key=>$value)if($value===null)$counts[$key]=0;
    }
    return [
       'ok'=>true,'schema'=>'jr.jrei.python-canary-preflight.v1',
       'ownerScope'=>'ORIGINAL_MFA_SUPER_ADMIN',
       'motherTableReady'=>$table,'signedPythonHealthTableReady'=>$health,
       'canaryFeatureEnabled'=>$enabled,'signedPythonReportingEnabled'=>$reporting,
       'freshEnabledNodeReports'=>$nodeCount,'lastSignedNodeReceivedAt'=>$lastSeen,
       'operationallyPollable'=>$table&&$health&&$enabled&&$reporting&&$available,
       'jobsByState'=>$counts,'checkedAt'=>$now,
       'pythonWorkerProcessIndependentlyAttested'=>false,
       'pythonCoreDirectMotherDbConnected'=>false,
       'modelInferenceProven'=>false,'autonomousLearningProven'=>false,
       'newsCrawlingOrPublicationActive'=>false,
       'note'=>'SIGNED_EXISTING_NODE_REPORT_NOT_ACTUAL_CANARY_COMPLETION'
    ];
}

function jrPythonCanaryOwner(PDO $db,string $account,array $body,int $now): array {
    if(!jrPythonCanaryExactFields($body,['action','requestKey']) ||
       $body['action']!=='run-fixed-arithmetic' ||
       !is_string($body['requestKey']) ||
       preg_match('/^[a-f0-9]{32}$/D',$body['requestKey'])!==1)
        throw new InvalidArgumentException('python_canary_owner_contract');
    if(!jrPythonCanaryReady($db))throw new RuntimeException('python_canary_schema_missing');
    $id=jrPythonCanaryUuid();
    $q=$db->prepare("INSERT INTO jrei_python_canary_jobs
      (job_id,owner_account_id,request_key,state,created_at,expires_at)
      VALUES(?,?,?,'QUEUED',?,?)
      ON DUPLICATE KEY UPDATE job_id=job_id");
    $q->execute([$id,$account,$body['requestKey'],$now,$now+600]);
    $q=$db->prepare('SELECT job_id,state,created_at,expires_at FROM jrei_python_canary_jobs WHERE owner_account_id=? AND request_key=? LIMIT 1');
    $q->execute([$account,$body['requestKey']]);
    $record=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($record))throw new RuntimeException('python_canary_owner_receipt_missing');
    return ['ok'=>true,'schema'=>'jr.jrei.python-canary-owner-receipt.v1',
      'jobId'=>$record['job_id'],'state'=>$record['state'],
      'createdAt'=>(int)$record['created_at'],'expiresAt'=>(int)$record['expires_at'],
      'expectedExpression'=>'12*7','executed'=>($record['state']==='COMPLETED')];
}
function jrPythonCanaryOwnerSnapshot(PDO $db,string $owner): array {
    if(!jrPythonCanaryReady($db))throw new RuntimeException('python_canary_schema_missing');
    $q=$db->prepare('SELECT job_id,state,created_at,expires_at,lease_expires_at,completed_at,numerator,denominator,
         result_sha256 FROM jrei_python_canary_jobs WHERE owner_account_id=? ORDER BY created_at DESC,job_id DESC LIMIT 10');
    $q->execute([$owner]);$rows=[];$now=time();
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r){
        // A worker may be offline indefinitely. The stored state then stays
        // QUEUED/LEASED until its next poll. Expose the clock-expired truth
        // without performing an implicit write from this read-only route.
        $expiredByClock=in_array($r['state'],['QUEUED','LEASED'],true) && (
            (int)$r['expires_at']<=$now ||
            ($r['state']==='LEASED' && $r['lease_expires_at']!==null &&
             (int)$r['lease_expires_at']<=$now)
        );
        $rows[]=['jobId'=>$r['job_id'],'state'=>$r['state'],
          'effectiveState'=>$expiredByClock?'EXPIRED_BY_CLOCK':$r['state'],
          'createdAt'=>(int)$r['created_at'],'expiresAt'=>(int)$r['expires_at'],
          'completedAt'=>$r['completed_at']===null?null:(int)$r['completed_at'],
          'numerator'=>$r['numerator']===null?null:(int)$r['numerator'],
          'denominator'=>$r['denominator']===null?null:(int)$r['denominator'],
          'resultSha256'=>$r['result_sha256'],
          'pythonSkillId'=>'jrei.math.exact_arithmetic.v1',
          'modelInferenceVerified'=>false,'autonomousLearningVerified'=>false];
    }
    return ['ok'=>true,'schema'=>'jr.jrei.python-canary-owner-snapshot.v1',
      'scope'=>'ONE_FIXED_ARITHMETIC_JOB_NOT_GENERAL_AI',
      'newsOrCrawlingEnabled'=>false,'jobs'=>$rows];
}
function jrPythonCanaryPoll(PDO $db,string $node,array $body,int $now): array {
    if(!jrPythonCanaryExactFields($body,['schema'])||$body['schema']!==JR_PY_CANARY_SCHEMA)
        throw new InvalidArgumentException('python_canary_poll_contract');
    // The original signed node must have recently reported Python 8091
    // RESPONDING into the verified mother DB before it can lease a job.
    // This prevents a healthy Qwen-only secondary node stealing the work.
    $ready=$db->prepare('SELECT server_received_at FROM jrei_python_node_health
      WHERE node_id=? AND python_process=? LIMIT 1');
    $ready->execute([$node,'RESPONDING']);
    $received=$ready->fetchColumn();
    if($received===false || (int)$received>$now+5 ||
       (int)$received<$now-90)
        throw new DomainException('python_canary_worker_has_no_fresh_health');
    $db->beginTransaction();
    try {
        // No retries after lease expiry in this first canary. Operator can
        // re-submit with fresh idempotency key after reviewing failure.
        $db->prepare("UPDATE jrei_python_canary_jobs SET state='EXPIRED'
          WHERE state IN ('QUEUED','LEASED') AND
          (expires_at<=? OR (state='LEASED' AND lease_expires_at<=?))")
          ->execute([$now,$now]);
        $q=$db->prepare("SELECT job_id,expires_at FROM jrei_python_canary_jobs
          WHERE state='QUEUED' AND expires_at>? ORDER BY created_at,job_id
          LIMIT 1 FOR UPDATE");
        $q->execute([$now]);$job=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($job)){$db->commit();return ['ok'=>true,'schema'=>'jr.jrei.python-canary-poll.v1','job'=>null,'productionReady'=>false];}
        // The worker must never receive a deadline later than the mother's
        // immutable job expiry. An almost-expired job gets a short lease.
        $deadline=min($now+60,(int)$job['expires_at']);
        if($deadline<=$now)throw new DomainException('python_canary_job_expired');
        $lease=jrPythonCanaryUuid();
        $update=$db->prepare("UPDATE jrei_python_canary_jobs
          SET state='LEASED',assigned_node=?,lease_id=?,lease_expires_at=?
          WHERE job_id=? AND state='QUEUED' AND expires_at>?");
        $update->execute([$node,$lease,$deadline,$job['job_id'],$now]);
        if($update->rowCount()!==1)throw new DomainException('python_canary_lease_not_acquired');
        $db->commit();
        return ['ok'=>true,'schema'=>'jr.jrei.python-canary-poll.v1',
          'job'=>['jobId'=>$job['job_id'],'leaseId'=>$lease,'expression'=>'12*7',
            'taskType'=>'EXACT_ARITHMETIC_CANARY',
            'expiresAt'=>$deadline],
          'productionReady'=>false];
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
function jrPythonCanaryComplete(PDO $db,string $node,array $body,int $now): array {
    if(!jrPythonCanaryExactFields($body,['schema','jobId','leaseId','numerator','denominator',
          'exactFraction','skillId','performedWithoutModel']) ||
       $body['schema']!==JR_PY_CANARY_SCHEMA ||
       !jrHybridUuid($body['jobId'])||!jrHybridUuid($body['leaseId']) ||
       $body['numerator']!==84||$body['denominator']!==1||
       $body['exactFraction']!=='84'||
       $body['skillId']!=='jrei.math.exact_arithmetic.v1' ||
       $body['performedWithoutModel']!==true)
        throw new InvalidArgumentException('python_canary_complete_contract');
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT state,assigned_node,lease_id,lease_expires_at,expires_at FROM jrei_python_canary_jobs WHERE job_id=? FOR UPDATE');
        $q->execute([$body['jobId']]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||$row['state']!=='LEASED' ||
           !hash_equals((string)$row['assigned_node'],$node) ||
           !hash_equals((string)$row['lease_id'],$body['leaseId']) ||
           (int)$row['lease_expires_at']<=$now ||
           (int)$row['expires_at']<=$now)
            throw new DomainException('python_canary_lease_invalid');
        $digest=hash('sha256',JR_PY_CANARY_SCHEMA.'|'.$body['jobId'].'|'.$body['leaseId'].'|84/1');
        $db->prepare("UPDATE jrei_python_canary_jobs
          SET state='COMPLETED',completed_at=?,numerator=84,denominator=1,result_sha256=?
          WHERE job_id=? AND state='LEASED'")->execute([$now,$digest,$body['jobId']]);
        $db->commit();
        return ['ok'=>true,'schema'=>'jr.jrei.python-canary-completion.v1',
          'accepted'=>true,'resultSha256'=>$digest,'exactFraction'=>'84',
          'productionReady'=>false,'modelTrainingStarted'=>false];
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
