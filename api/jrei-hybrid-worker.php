<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Outbound-polling JREI worker API for the existing Bertina mother DB.
 * NO new customer identity, checkout, session or public remote-command API.
 * Ed25519 proof per request, 90-second clock bound, single-use nonce and
 * bounded / allowlisted *public-evidence-only* evaluation jobs.
 *
 * This source defaults OFF via private JR_JREI_HYBRID_ENABLED config; neither
 * installing source nor applying DDL grants worker or model authority.
 */
const JR_HYBRID_TASK = 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION';
const JR_HYBRID_LEASE_SECONDS = 180;
const JR_HYBRID_MAX_LEASE_AGE = 900;

function jrHybridSchemaReady(PDO $pdo): bool {
    try {
        foreach([
            'SELECT node_id,public_key_b64,status,revoked_at,last_seen_at FROM jrei_hybrid_nodes LIMIT 0',
            'SELECT job_id,status,lease_id,lease_expires_at FROM jrei_hybrid_jobs LIMIT 0',
            'SELECT node_id,nonce,accepted_at FROM jrei_hybrid_node_nonces LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
function jrHybridUuid(mixed $v): bool {
    return is_string($v)&&preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D',$v)===1;
}
function jrHybridNewUuid(): string {
    $b=random_bytes(16);
    $b[6]=chr((ord($b[6])&15)|64);
    $b[8]=chr((ord($b[8])&63)|128);
    $h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.
        substr($h,16,4).'-'.substr($h,20);
}
function jrHybridSha(mixed $v): bool {
    return is_string($v)&&preg_match('/^[a-f0-9]{64}$/D',$v)===1;
}
function jrHybridIdentifier(mixed $v): bool {
    return is_string($v)&&preg_match('/^[A-Za-z0-9._:-]{1,64}$/D',$v)===1;
}
function jrHybridPolicy(mixed $v): ?array {
    if(!is_array($v)||array_is_list($v)||count($v)!==3||
       !array_key_exists('k1',$v)||!array_key_exists('b',$v)||
       !array_key_exists('maxEvidence',$v)||
       !is_numeric($v['k1'])||!is_numeric($v['b'])||
       !is_int($v['maxEvidence']))return null;
    $k=(float)$v['k1'];$b=(float)$v['b'];
    if(!is_finite($k)||!is_finite($b)||$k<0.8||$k>2.2||
       $b<0.2||$b>0.9||$v['maxEvidence']<8||
       $v['maxEvidence']>40)return null;
    return ['k1'=>round($k,3),'b'=>round($b,3),
        'maxEvidence'=>$v['maxEvidence']];
}
function jrHybridHttps(array $server): bool {
    // Never rely on caller-provided X-Forwarded-Proto; LiteSpeed must expose
    // HTTPS=on or native TLS SERVER_PORT 443. Owner verifies on actual host.
    return strtolower((string)($server['HTTPS']??''))==='on'||
           (int)($server['SERVER_PORT']??0)===443;
}
function jrHybridReadBody(array $server): ?string {
    $type=strtolower(trim(explode(';',(string)($server['CONTENT_TYPE']??''))[0]));
    $size=$server['CONTENT_LENGTH']??null;
    if($type!=='application/json'||($size!==null&&
       (!ctype_digit((string)$size)||(int)$size>6144)))return null;
    $fp=fopen('php://input','rb');
    if($fp===false)return null;
    $raw=stream_get_contents($fp,6145);
    fclose($fp);
    return is_string($raw)&&strlen($raw)<=6144?$raw:null;
}
function jrHybridDecode(string $raw): ?array {
    try {
        $body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        return is_array($body)&&!array_is_list($body)?$body:null;
    }catch(Throwable $e){return null;}
}
/** Signed request verification occurs BEFORE the replay nonce is recorded. */
function jrHybridAuthenticate(PDO $pdo,string $verb,string $path,
    string $raw,array $server,int $now): ?array {
    if(!function_exists('sodium_crypto_sign_verify_detached'))return null;
    $node=$server['HTTP_X_JREI_NODE']??null;
    $timestamp=$server['HTTP_X_JREI_TIME']??null;
    $nonce=$server['HTTP_X_JREI_NONCE']??null;
    $signature=$server['HTTP_X_JREI_SIGNATURE']??null;
    if(!jrHybridUuid($node)||!is_string($timestamp)||
       !preg_match('/^[0-9]{10}$/D',$timestamp)||
       abs((int)$timestamp-$now)>90||
       !is_string($nonce)||!preg_match('/^[a-f0-9]{32}$/D',$nonce)||
       !is_string($signature)||!preg_match('/^[a-f0-9]{128}$/D',$signature))
        return null;
    $q=$pdo->prepare('SELECT node_id,public_key_b64,status,revoked_at,
        permitted_task,provider_type FROM jrei_hybrid_nodes WHERE node_id=?');
    $q->execute([$node]);$data=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($data)||$data['status']!=='ENABLED'||
       $data['revoked_at']!==null||
       $data['permitted_task']!==JR_HYBRID_TASK)return null;
    $public=base64_decode((string)$data['public_key_b64'],true);
    if(!is_string($public)||strlen($public)!==SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES)
        return null;
    $sig=hex2bin($signature);
    if($sig===false)return null;
    $canonical="jrei-worker-v1\n".$verb."\n".$path."\n".
        $timestamp."\n".$nonce."\n".hash('sha256',$raw);
    if(!sodium_crypto_sign_verify_detached($sig,$canonical,$public))
        return null;
    // Unique (node, nonce) enforces one-time replay rejection across every
    // route and PHP process, not merely against one in-memory worker session.
    $q=$pdo->prepare('INSERT IGNORE INTO jrei_hybrid_node_nonces
        (node_id,nonce,accepted_at) VALUES (?,?,?)');
    $q->execute([$node,$nonce,$now]);
    if($q->rowCount()!==1)return null;
    // Remove only old, already-irrelevant replay rows. A concurrent request
    // within its 90s signed timestamp window cannot be replayed.
    if(random_int(1,90)===1){
        $q=$pdo->prepare('DELETE FROM jrei_hybrid_node_nonces
            WHERE accepted_at<? LIMIT 250');
        $q->execute([$now-3600]);
    }
    return $data;
}
function jrHybridMeta(array $body): ?array {
    if(array_keys($body)!==['status','cpuPercent','ramPercent',
       'gpuPercent','latencyMs','modelId','modelVersion'])return null;
    $state=$body['status'];
    if(!is_string($state)||!in_array($state,
       ['ONLINE','BUSY','DEGRADED','OFFLINE','MAINTENANCE'],true))return null;
    foreach(['cpuPercent','ramPercent','gpuPercent'] as $k) {
        $v=$body[$k];
        if($v!==null&&(!is_numeric($v)||!is_finite((float)$v)||
           (float)$v<0||(float)$v>100))return null;
    }
    $lat=$body['latencyMs'];
    if($lat!==null&&(!is_int($lat)||$lat<0||$lat>300000))return null;
    foreach(['modelId','modelVersion'] as $key)
        if($body[$key]!==null&&!jrHybridIdentifier($body[$key]))
            return null;
    return $body;
}
function jrHybridRecordHeartbeat(PDO $pdo,string $node,array $meta,int $at): void {
    $q=$pdo->prepare('UPDATE jrei_hybrid_nodes SET
       last_seen_at=?,latest_cpu_percent=?,latest_ram_percent=?,
       latest_gpu_percent=?,latest_latency_ms=?,model_id=?,
       model_version=?,last_reported_state=?,updated_at=?
       WHERE node_id=? AND status=? AND revoked_at IS NULL');
    $q->execute([$at,$meta['cpuPercent'],$meta['ramPercent'],
       $meta['gpuPercent'],$meta['latencyMs'],$meta['modelId'],
       $meta['modelVersion'],$meta['status'],$at,$node,'ENABLED']);
    if($q->rowCount()!==1)throw new RuntimeException('node_revoked');
}
function jrHybridRecoverOrphans(PDO $pdo,int $at): void {
    // No silent replay after a possibly completed but unreported attempt.
    $q=$pdo->prepare("UPDATE jrei_hybrid_jobs SET
        status='NEEDS_REVIEW',failure_code='LEASE_OUTCOME_UNKNOWN',
        revision=revision+1
        WHERE status='LEASED' AND lease_expires_at<?");
    $q->execute([$at]);
    $q=$pdo->prepare("UPDATE jrei_hybrid_jobs SET
        status='EXPIRED',revision=revision+1
        WHERE status='QUEUED' AND expires_at<?");
    $q->execute([$at]);
}
function jrHybridLease(PDO $pdo,string $node,int $at): ?array {
    $pdo->beginTransaction();
    try {
        jrHybridRecoverOrphans($pdo,$at);
        // One active assignment per registered node; a retrying poll cannot
        // request two concurrent jobs and cannot cause duplicate inference.
        $q=$pdo->prepare("SELECT job_id FROM jrei_hybrid_jobs
            WHERE leased_to_node=? AND status='LEASED'
            AND lease_expires_at>=? LIMIT 1 FOR UPDATE");
        $q->execute([$node,$at]);
        if($q->fetchColumn()!==false){$pdo->commit();return null;}
        $q=$pdo->prepare("SELECT job_id,task_type,requested_dataset_id,
            dataset_sha256,evidence_sha256,policy_current_json,
            policy_candidate_json,evaluation_version
            FROM jrei_hybrid_jobs WHERE status='QUEUED'
              AND expires_at>=? ORDER BY queued_at ASC,job_id ASC
              LIMIT 1 FOR UPDATE");
        $q->execute([$at]);$job=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($job)){$pdo->commit();return null;}
        if($job['task_type']!==JR_HYBRID_TASK)
            throw new RuntimeException('unsupported_task_queued');
        $lease=jrHybridNewUuid();
        $q=$pdo->prepare("UPDATE jrei_hybrid_jobs SET
          status='LEASED',leased_to_node=?,lease_id=?,
          lease_started_at=?,lease_expires_at=?,attempts=attempts+1,
          revision=revision+1 WHERE job_id=? AND status='QUEUED'");
        $q->execute([$node,$lease,$at,$at+JR_HYBRID_LEASE_SECONDS,$job['job_id']]);
        if($q->rowCount()!==1)throw new RuntimeException('lease_conflict');
        $pdo->commit();
        $current=json_decode((string)$job['policy_current_json'],true);
        $candidate=json_decode((string)$job['policy_candidate_json'],true);
        if(!jrHybridPolicy($current)||!jrHybridPolicy($candidate))
            throw new RuntimeException('stored_policy_corrupted');
        return [
          'jobId'=>$job['job_id'],'leaseId'=>$lease,
          'taskType'=>JR_HYBRID_TASK,
          'datasetId'=>$job['requested_dataset_id'],
          'datasetSha256'=>$job['dataset_sha256'],
          'evidenceSha256'=>$job['evidence_sha256'],
          'currentPolicy'=>$current,'candidatePolicy'=>$candidate,
          'evaluationVersion'=>$job['evaluation_version'],
          'leaseExpiresAt'=>$at+JR_HYBRID_LEASE_SECONDS,
          'maxLeaseAgeSeconds'=>JR_HYBRID_MAX_LEASE_AGE
        ];
    }catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrHybridHeartbeat(PDO $pdo,string $node,array $body,int $at): array {
    if(array_keys($body)!==['jobId','leaseId','metrics']||
       !jrHybridUuid($body['jobId'])||!jrHybridUuid($body['leaseId'])||
       !is_array($body['metrics'])||($meta=jrHybridMeta($body['metrics']))===null)
        throw new InvalidArgumentException('invalid_heartbeat');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT lease_started_at,lease_expires_at
          FROM jrei_hybrid_jobs WHERE job_id=? AND lease_id=?
            AND leased_to_node=? AND status='LEASED' FOR UPDATE");
        $q->execute([$body['jobId'],$body['leaseId'],$node]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||$row['lease_expires_at']<$at||
           $row['lease_started_at']+JR_HYBRID_MAX_LEASE_AGE<$at)
            throw new DomainException('expired_or_revoked_lease');
        $newExpiry=min($at+JR_HYBRID_LEASE_SECONDS,
            (int)$row['lease_started_at']+JR_HYBRID_MAX_LEASE_AGE);
        $q=$pdo->prepare('UPDATE jrei_hybrid_jobs SET
          lease_expires_at=?,revision=revision+1
          WHERE job_id=? AND lease_id=? AND leased_to_node=? AND status=?');
        $q->execute([$newExpiry,$body['jobId'],$body['leaseId'],$node,'LEASED']);
        jrHybridRecordHeartbeat($pdo,$node,$meta,$at);
        $pdo->commit();
        return ['ok'=>true,'leaseExpiresAt'=>$newExpiry];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function jrHybridResult(array $result): ?array {
    // Only source-owned evaluation aggregates. Reported estimates are NOT
    // independently verified by the system of record.
    $keys=['schema','datasetSha256','evidenceSha256','caseCount',
       'baselineCorrect','candidateCorrect','baselineAbstained',
       'candidateAbstained','decision','reason','measuredWorkerLatency'];
    if(array_keys($result)!==$keys)return null;
    if($result['schema']!=='jr.jrei.retrieval-comparison.v1'||
       !jrHybridSha($result['datasetSha256'])||
       !jrHybridSha($result['evidenceSha256'])||
       !is_int($result['caseCount'])||$result['caseCount']<1||
       $result['caseCount']>10000||
       !is_int($result['baselineCorrect'])||
       !is_int($result['candidateCorrect'])||
       !is_int($result['baselineAbstained'])||
       !is_int($result['candidateAbstained'])||
       !is_string($result['decision'])||
       !in_array($result['decision'],['BLOCKED','REJECTED',
         'OWNER_REVIEW','ELIGIBLE_LOW_RISK'],true)||
       !jrHybridIdentifier($result['reason'])||
       $result['measuredWorkerLatency']!==false)return null;
    foreach(['baselineCorrect','candidateCorrect','baselineAbstained',
      'candidateAbstained'] as $key)
      if($result[$key]<0||$result[$key]>$result['caseCount'])
        return null;
    return $result;
}
function jrHybridComplete(PDO $pdo,string $node,array $body,int $at): array {
    if(array_keys($body)!==['jobId','leaseId','result']||
       !jrHybridUuid($body['jobId'])||!jrHybridUuid($body['leaseId'])||
       !is_array($body['result'])||($summary=jrHybridResult($body['result']))===null)
        throw new InvalidArgumentException('invalid_result');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT status,lease_expires_at,dataset_sha256,
          evidence_sha256 FROM jrei_hybrid_jobs
          WHERE job_id=? AND lease_id=? AND leased_to_node=? FOR UPDATE");
        $q->execute([$body['jobId'],$body['leaseId'],$node]);
        $job=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($job)||$job['status']!=='LEASED'||
           (int)$job['lease_expires_at']<$at||
           !hash_equals((string)$job['dataset_sha256'],$summary['datasetSha256'])||
           !hash_equals((string)$job['evidence_sha256'],$summary['evidenceSha256']))
            throw new DomainException('lease_or_evidence_conflict');
        // Store no private text, source excerpts, model output or secrets.
        $encoded=json_encode($summary,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if(strlen($encoded)>1900)throw new InvalidArgumentException('result_too_large');
        $q=$pdo->prepare("UPDATE jrei_hybrid_jobs SET
          status='REVIEW_REQUIRED',completed_at=?,result_digest=?,
          result_json=?,revision=revision+1 WHERE job_id=?
          AND lease_id=? AND status='LEASED'");
        $q->execute([$at,hash('sha256',$encoded),$encoded,
          $body['jobId'],$body['leaseId']]);
        if($q->rowCount()!==1)throw new DomainException('lease_conflict');
        $pdo->commit();
        return ['ok'=>true,'state'=>'REVIEW_REQUIRED',
          'independentlyVerified'=>false,'modelTrained'=>false,
          'autoPublished'=>false,'jobId'=>$body['jobId']];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function jrHybridWorkerRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, private, max-age=0');
    header('Vary: X-JREI-Node');
    if($verb!=='POST'||!in_array($path,[
      '/jrei/v1/worker/poll','/jrei/v1/worker/heartbeat',
      '/jrei/v1/worker/complete'],true))fail('worker_route_not_found',404);
    if(!jrHybridHttps($_SERVER))fail('tls_required',403);
    $config=cfg();
    if(($config['jrei_hybrid_enabled']??false)!==true)
        fail('hybrid_ai_unavailable',503);
    $raw=jrHybridReadBody($_SERVER);
    if($raw===null)fail('invalid_worker_request',422);
    $pdo=db();
    if(!$pdo||!jrHybridSchemaReady($pdo))
        fail('hybrid_ai_unavailable',503);
    try{
        $node=jrHybridAuthenticate($pdo,$verb,$path,$raw,$_SERVER,time());
        if(!$node)fail('worker_unauthorized',403);
        if(!rateAllowed($pdo,'jrei_hybrid_worker',$node['node_id'],90,300))
            fail('worker_rate_limited',429);
        $body=jrHybridDecode($raw);
        if($body===null)fail('invalid_worker_request',422);
        $now=time();
        if($path==='/jrei/v1/worker/poll'){
            if(array_keys($body)!==['metrics']||
               !is_array($body['metrics'])||
               ($meta=jrHybridMeta($body['metrics']))===null)
                fail('invalid_worker_request',422);
            jrHybridRecordHeartbeat($pdo,(string)$node['node_id'],$meta,$now);
            if(!in_array($meta['status'],['ONLINE','DEGRADED'],true))
                respond(['ok'=>true,'job'=>null,'retryAfterSeconds'=>20]);
            $job=jrHybridLease($pdo,(string)$node['node_id'],$now);
            respond(['ok'=>true,'job'=>$job,'retryAfterSeconds'=>$job?0:20]);
        }
        if($path==='/jrei/v1/worker/heartbeat')
            respond(jrHybridHeartbeat($pdo,(string)$node['node_id'],$body,$now));
        respond(jrHybridComplete($pdo,(string)$node['node_id'],$body,$now));
    }catch(InvalidArgumentException $e){fail('invalid_worker_request',422);}
    catch(DomainException $e){fail('worker_lease_conflict',409);}
    catch(Throwable $e){fail('hybrid_ai_temporarily_unavailable',503);}
}
