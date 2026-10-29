<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-hybrid-worker.php';
require_once __DIR__.'/jrei-hybrid-review-ledger.php';
require_once __DIR__.'/jrei-hybrid-owner-corpus.php';
require_once __DIR__.'/jrei-hybrid-owner-sources.php';
require_once __DIR__.'/jrei-hybrid-owner-models.php';
require_once __DIR__.'/jrei-hybrid-diagnostics.php';
require_once __DIR__.'/jrei-hybrid-incident-status.php';
require_once __DIR__.'/jrei-hybrid-queue-health.php';
require_once __DIR__.'/jrei-hybrid-readiness.php';
require_once __DIR__.'/jrei-local-chat.php';

/**
 * Owner-authorized fleet capacity, not an activation count. A registered
 * worker remains DISABLED until its individual signed key is approved.
 * Scales to 50+ nodes; resource utilization and evidence rights remain
 * enforced by the original signed lease worker.
 */
function jrHybridFleetLimits(array $cfg): array {
    $value=$cfg['jrei_hybrid_node_capacity_limit']??64;
    $nodes=is_int($value)&&$value>=1&&$value<=128?$value:64;
    $queue=min(256,max(20,$nodes*2));
    return ['activeNodes'=>$nodes,'maxQueue'=>$queue,
      'leaseSeconds'=>JR_HYBRID_LEASE_SECONDS,
      'maxLeaseAgeSeconds'=>JR_HYBRID_MAX_LEASE_AGE];
}

/**
 * MFA SUPER_ADMIN-only projection and control of the OUTBOUND JREI worker.
 * All operations work inside the original Bertina mother database and the
 * original operationsAudit; neither calls the Windows machine nor runs a model.
 */
function jrHybridOwnerSnapshot(PDO $pdo,array $cfg): array {
    $ready=jrHybridSchemaReady($pdo);
    $base=[
      'ok'=>true,'schema'=>'jr.jrei.hybrid-owner.v1',
      'sourceOnly'=>true,'motherDbSchemaReady'=>$ready,
      'backendEnabled'=>($cfg['jrei_hybrid_enabled']??false)===true,
      'hostHttpsWorkerVerified'=>false,'independentWindowsWorkerVerified'=>false,
      'modelInferenceVerified'=>false,'realLatencyVerified'=>false,
      'storeOrPaymentsChanged'=>false,
      'checkedAt'=>time(),
      'nodes'=>[],'jobs'=>[],
      'counts'=>['queued'=>null,'leased'=>null,'reviewRequired'=>null,
        'completed'=>null,'rejected'=>null,'closedUnknown'=>null,
        'expired'=>null,'cancelled'=>null],
      'limits'=>jrHybridFleetLimits($cfg),
      'approvedPublicDatasetCount'=>count(is_array($cfg['jrei_hybrid_approved_datasets']??null)
        ?$cfg['jrei_hybrid_approved_datasets']:[]),
      'warning'=>'A source-level server status or worker self-report is not proof of trusted local hardware, scientific validation or real model inference.'
    ];
    if(!$ready)return $base;
    $q=$pdo->query('SELECT node_id,provider_type,display_label,status,
      permitted_task,model_id,model_version,max_concurrent,last_seen_at,
      latest_cpu_percent,latest_ram_percent,latest_gpu_percent,
      latest_latency_ms,last_reported_state,revoked_at,revision,created_at
      FROM jrei_hybrid_nodes ORDER BY created_at DESC,node_id ASC LIMIT 128');
    foreach($q as $r){
        $recent=$r['last_seen_at']!==null &&
            time()-(int)$r['last_seen_at']<=90;
        $nodeState=($r['revoked_at']!==null||$r['status']!=='ENABLED')
            ?($r['status']==='REVOKED'?'REVOKED':'MAINTENANCE')
            :(!$recent?'OFFLINE':(
                in_array($r['last_reported_state'],
                  ['ONLINE','BUSY','DEGRADED','OFFLINE','MAINTENANCE'],true)
                ?$r['last_reported_state']:'DEGRADED'));
        $base['nodes'][]=[
          'nodeId'=>$r['node_id'],'providerType'=>$r['provider_type'],
          'name'=>$r['display_label'],'ownerEnabled'=>$r['status']==='ENABLED',
          'revoked'=>$r['revoked_at']!==null,
          'state'=>$nodeState,'reportedState'=>$r['last_reported_state'],
          'lastSeenAt'=>$r['last_seen_at']===null?null:(int)$r['last_seen_at'],
          'reportedCpuPercent'=>$r['latest_cpu_percent']===null?null:(float)$r['latest_cpu_percent'],
          'reportedRamPercent'=>$r['latest_ram_percent']===null?null:(float)$r['latest_ram_percent'],
          'reportedGpuPercent'=>$r['latest_gpu_percent']===null?null:(float)$r['latest_gpu_percent'],
          'reportedLatencyMs'=>$r['latest_latency_ms']===null?null:(int)$r['latest_latency_ms'],
          'modelId'=>$r['model_id'],'modelVersion'=>$r['model_version'],
          'revision'=>(int)$r['revision']
        ];
    }
    $q=$pdo->query("SELECT status,COUNT(*) total_count
      FROM jrei_hybrid_jobs GROUP BY status");
    foreach($q as $r){
        $key=match($r['status']){
          'QUEUED'=>'queued','LEASED'=>'leased','REVIEW_REQUIRED',
          'NEEDS_REVIEW'=>'reviewRequired','EXPIRED'=>'expired',
          'CANCELLED'=>'cancelled','REJECTED'=>'rejected',
          'CLOSED_UNKNOWN'=>'closedUnknown',default=>'completed'
        };
        $base['counts'][$key]=($base['counts'][$key]??0)+(int)$r['total_count'];
    }
    foreach($base['counts'] as $key=>$count)
        if($count===null)$base['counts'][$key]=0;
    $q=$pdo->query('SELECT job_id,task_type,status,requested_dataset_id,
       evaluation_version,queued_at,expires_at,lease_expires_at,
       completed_at,leased_to_node,attempts,failure_code,revision,
       result_digest,result_json FROM jrei_hybrid_jobs ORDER BY queued_at DESC,job_id DESC LIMIT 30');
    foreach($q as $r)$base['jobs'][]=[
      'jobId'=>$r['job_id'],'taskType'=>$r['task_type'],
      'status'=>$r['status'],'datasetId'=>$r['requested_dataset_id'],
      'evaluationVersion'=>$r['evaluation_version'],
      'queuedAt'=>(int)$r['queued_at'],'expiresAt'=>(int)$r['expires_at'],
      'leaseExpiresAt'=>$r['lease_expires_at']===null?null:(int)$r['lease_expires_at'],
      'completedAt'=>$r['completed_at']===null?null:(int)$r['completed_at'],
      'leasedToNode'=>$r['leased_to_node'],'attempts'=>(int)$r['attempts'],
      'failureCode'=>$r['failure_code'],'revision'=>(int)$r['revision'],
      'resultDigest'=>$r['result_digest'],
      'unverifiedAggregate'=>$r['result_json']===null?null:
        json_decode((string)$r['result_json'],true)
    ];
    $projection=array_merge($base,jrHybridOwnerCorpusSnapshot($pdo),
        jrHybridSourceSnapshot($pdo),jrHybridModelSnapshot($pdo),
        jrHybridReviewLedgerSnapshot($pdo));
    $projection['dispatchDiagnostics']=jrHybridOwnerDispatchDiagnostics($pdo,$projection);
    $projection['incidentMonitoring']=jrHybridOwnerIncidentStatus($pdo,$cfg);
    $projection['queueHealth']=jrHybridOwnerQueueHealth($pdo,$cfg,time());
    $projection['readiness']=jrHybridOwnerReadiness($projection);
    $projection['jreiLocalGenerative']=jrLocalChatOwnerSnapshot($pdo,$cfg);
    return $projection;
}
function jrHybridOwnerChange(PDO $pdo,array $cfg,string $actor,
    array $body): array {
    if(!jrHybridSchemaReady($pdo))
        throw new DomainException('hybrid_migration_required');
    $action=$body['action']??null;
    if(!is_string($action)||!in_array($action,[
       'register_node','set_node','revoke_node','queue_reviewed_retrieval',
       'cancel_job','propose_public_dataset','approve_public_dataset',
       'suspend_public_dataset','record_job_review',
       'propose_public_source','approve_public_source',
       'suspend_public_source','propose_source_version',
       'review_source_version','propose_local_model',
       'approve_model_rights','suspend_model_version',
       'attest_local_model_runtime','attest_local_model_runtime_only',
       'set_local_chat_node'],true))
         throw new InvalidArgumentException('invalid_action');
    $now=time();
    if($action==='set_local_chat_node')
        return jrLocalChatOwnerSetNode($pdo,$cfg,$actor,$body);
    if(in_array($action,['propose_public_dataset',
       'approve_public_dataset','suspend_public_dataset'],true))
        return jrHybridOwnerCorpusChange($pdo,$actor,$body);
    if($action==='record_job_review')
        return jrHybridOwnerReviewJob($pdo,$actor,$body);
    if(in_array($action,['propose_public_source','approve_public_source',
       'suspend_public_source','propose_source_version',
       'review_source_version'],true))
        return jrHybridSourceChange($pdo,$actor,$body);
    if(in_array($action,['propose_local_model','approve_model_rights',
       'suspend_model_version','attest_local_model_runtime',
       'attest_local_model_runtime_only'],true))
        return jrHybridModelOwnerChange($pdo,$actor,$body);
    if($action==='register_node'){
        $key=$body['publicKeyB64']??null;
        $label=$body['label']??null;
        $type=$body['providerType']??null;
        if(!is_string($key)||!preg_match('/^[A-Za-z0-9+\/]{43}=$/D',$key)||
           strlen(base64_decode($key,true)?:'')!==32||
           !is_string($label)||strlen($label)<3||strlen($label)>80||
           preg_match('/[<>{}\x00-\x1f]/',$label)||
           !in_array($type,['LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER',
             'BERTINA_VPS_WORKER','BERTINA_DEDICATED_WORKER',
             'BERTINA_GPU_WORKER'],true)||
           ($body['confirmation']??null)!=='REGISTER_PUBLIC_KEY_DISABLED')
           throw new InvalidArgumentException('invalid_node_registration');
        $id=jrHybridNewUuid();
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('INSERT INTO jrei_hybrid_nodes
              (node_id,provider_type,public_key_b64,display_label,
              status,permitted_task,max_concurrent,created_at,updated_at,
              created_by_account_id)
              VALUES (?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$id,$type,$key,trim($label),'DISABLED',
              JR_HYBRID_TASK,1,$now,$now,$actor]);
            operationsAudit($pdo,$actor,'jrei_worker_registered_disabled',$id);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        // Public key is not a secret; private key NEVER comes to Bertina.
        return ['ok'=>true,'nodeId'=>$id,'enabled'=>false,
          'status'=>'REGISTERED_DISABLED'];
    }
    if($action==='set_node'||$action==='revoke_node'){
        $id=$body['nodeId']??null;
        $revision=$body['revision']??null;
        if(!jrHybridUuid($id)||!is_int($revision)||$revision<1)
            throw new InvalidArgumentException('invalid_node');
        $enabled=($action==='set_node')?($body['enabled']??null):false;
        if(!is_bool($enabled))throw new InvalidArgumentException('invalid_node_state');
        if($enabled&&(($cfg['jrei_hybrid_enabled']??false)!==true||
           !function_exists('sodium_crypto_sign_verify_detached')||
           ($body['confirmation']??null)!=='ACTIVATE_APPROVED_SIGNED_WORKER'))
            throw new DomainException('worker_activation_not_permitted');
        if($action==='revoke_node'&&
           ($body['confirmation']??null)!=='IRREVOCABLY_REVOKE_WORKER_KEY')
            throw new InvalidArgumentException('revocation_confirmation_required');
        $pdo->beginTransaction();
        try{
            $fleetActive=null;
            if($enabled){
                // Lock all eligible nodes IN IDENTICAL ID ORDER before the
                // target row. This prevents two simultaneous owner enables
                // from deadlocking on opposing target-row lock orders.
                $fleet=$pdo->query("SELECT node_id,status FROM jrei_hybrid_nodes
                  WHERE revoked_at IS NULL ORDER BY node_id FOR UPDATE");
                $fleetActive=0;
                foreach($fleet as $member)
                    if($member['status']==='ENABLED')$fleetActive++;
            }
            $q=$pdo->prepare('SELECT status,revoked_at,revision
              FROM jrei_hybrid_nodes WHERE node_id=? FOR UPDATE');
            $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($row)||(int)$row['revision']!==$revision)
                throw new DomainException('node_version_conflict');
            if($row['revoked_at']!==null)
                throw new DomainException('node_already_revoked');
            if($enabled&&$row['status']!=='ENABLED'){
                if($fleetActive===null||
                   $fleetActive>=jrHybridFleetLimits($cfg)['activeNodes'])
                    throw new DomainException('hybrid_owner_fleet_capacity_reached');
            }
            $state=$action==='revoke_node'?'REVOKED':($enabled?'ENABLED':'DISABLED');
            $q=$pdo->prepare('UPDATE jrei_hybrid_nodes
                SET status=?,revoked_at=?,revision=revision+1,updated_at=?
                WHERE node_id=? AND revision=?');
            $q->execute([$state,$action==='revoke_node'?$now:null,
                $now,$id,$revision]);
            if($q->rowCount()!==1)throw new DomainException('node_version_conflict');
            if(!$enabled){
                // A running worker may still have done irreversible local work.
                // Quarantine; never offer its old lease to a second node.
                $q=$pdo->prepare("UPDATE jrei_hybrid_jobs
                  SET status='NEEDS_REVIEW',
                    failure_code='WORKER_DISABLED_OUTCOME_UNKNOWN',
                    revision=revision+1 WHERE leased_to_node=?
                    AND status='LEASED'");
                $q->execute([$id]);
            }
            operationsAudit($pdo,$actor,
              $action==='revoke_node'?'jrei_worker_key_revoked':
                ($enabled?'jrei_worker_owner_enabled':'jrei_worker_owner_disabled'),
              $id);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'nodeId'=>$id,'status'=>$state];
    }
    if($action==='queue_reviewed_retrieval'){
        if(($cfg['jrei_hybrid_enabled']??false)!==true||
           ($body['confirmation']??null)!=='QUEUE_PUBLIC_REVIEWED_DATASET')
            throw new DomainException('hybrid_job_not_authorized');
        $id=$body['datasetId']??null;
        $version=$body['evaluationVersion']??null;
        $current=jrHybridPolicy($body['currentPolicy']??null);
        $candidate=jrHybridPolicy($body['candidatePolicy']??null);
        if(!jrHybridIdentifier($id)||!jrHybridIdentifier($version)||
           !$current||!$candidate||$current===$candidate)
            throw new InvalidArgumentException('invalid_evaluation_job');
        $record=jrHybridApprovedCorpus($pdo,$cfg,$id,$version);
        if(!is_array($record)||($record['sourceReviewed']??null)!==true||
           !jrHybridSha($record['datasetSha256']??null)||
           !jrHybridSha($record['evidenceSha256']??null)||
           !jrHybridSha($record['activePolicySha256']??null))
            throw new DomainException('independent_public_dataset_not_approved');
        // Match learning-loop's SHA256(JSON.stringify(normalized active policy)).
        $canonical=['b'=>$current['b'],'k1'=>$current['k1'],
            'maxEvidence'=>$current['maxEvidence']];
        $activeDigest=hash('sha256',json_encode($canonical,
            JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
        if(!hash_equals($record['activePolicySha256'],$activeDigest))
            throw new DomainException('current_policy_not_approved');
        $pdo->beginTransaction();
        try{
            // Re-lock the approved version in the same transaction that
            // queues work. Owner suspension cannot race with an earlier
            // nonlocking catalogue read and leave orphan queued jobs.
            $offer=['id'=>$id,'evaluationVersion'=>$version,
                'datasetSha256'=>$record['datasetSha256'],
                'evidenceSha256'=>$record['evidenceSha256']];
            if(!jrHybridLockApprovedCorpus($pdo,$cfg,$offer))
                throw new DomainException('dataset_version_no_longer_approved');
            $q=$pdo->query("SELECT COUNT(*) FROM jrei_hybrid_jobs
              WHERE status IN ('QUEUED','LEASED')");
            if((int)$q->fetchColumn()>=jrHybridFleetLimits($cfg)['maxQueue'])
                throw new DomainException('hybrid_queue_at_capacity');
            $idempotency=hash('sha256',json_encode([
              gmdate('Y-m-d',$now),$id,$record['datasetSha256'],
              $current,$candidate,$version],JSON_THROW_ON_ERROR));
            $jobId=jrHybridNewUuid();
            $q=$pdo->prepare('INSERT IGNORE INTO jrei_hybrid_jobs
                (job_id,task_type,status,request_digest,idempotency_key,
                 requested_dataset_id,dataset_sha256,evidence_sha256,
                 policy_current_json,policy_candidate_json,evaluation_version,
                 queued_at,expires_at,created_by_account_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$jobId,JR_HYBRID_TASK,'QUEUED',$idempotency,$idempotency,
                $id,$record['datasetSha256'],$record['evidenceSha256'],
                json_encode($current,JSON_THROW_ON_ERROR),
                json_encode($candidate,JSON_THROW_ON_ERROR),$version,
                $now,$now+7200,$actor]);
            $created=$q->rowCount()===1;
            if(!$created){
                $q=$pdo->prepare('SELECT job_id FROM jrei_hybrid_jobs
                  WHERE idempotency_key=?');
                $q->execute([$idempotency]);$jobId=(string)$q->fetchColumn();
            }
            if($created)operationsAudit($pdo,$actor,
              'jrei_public_retrieval_job_queued',$jobId);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'jobId'=>$jobId,
          'created'=>$created,'resultUnverified'=>true];
    }
    $jobId=$body['jobId']??null;
    $revision=$body['revision']??null;
    if(!jrHybridUuid($jobId)||!is_int($revision)||$revision<1||
       ($body['confirmation']??null)!=='CANCEL_FUTURE_JOB_PROCESSING')
        throw new InvalidArgumentException('invalid_cancel_request');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT status,revision FROM jrei_hybrid_jobs
             WHERE job_id=? FOR UPDATE');
        $q->execute([$jobId]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r)||(int)$r['revision']!==$revision)
            throw new DomainException('job_version_conflict');
        if(!in_array($r['status'],['QUEUED','LEASED'],true))
            throw new DomainException('cannot_cancel_terminal_job');
        $status=$r['status']==='LEASED'?'NEEDS_REVIEW':'CANCELLED';
        $q=$pdo->prepare('UPDATE jrei_hybrid_jobs
          SET status=?,cancelled_at=?,failure_code=?,
            revision=revision+1 WHERE job_id=? AND revision=?');
        $q->execute([$status,$now,$r['status']==='LEASED'
          ?'CANCELLED_IN_FLIGHT_OUTCOME_UNKNOWN':null,$jobId,$revision]);
        if($q->rowCount()!==1)throw new DomainException('job_version_conflict');
        operationsAudit($pdo,$actor,'jrei_job_owner_cancel_requested',$jobId);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['ok'=>true,'jobId'=>$jobId,
      'status'=>$status,'inFlightNotReversed'=>$status==='NEEDS_REVIEW'];
}
