<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')) {http_response_code(404);exit;}

/**
 * Original drjavad1_store + signed Windows-Worker job OBSERVATION bridge.
 *
 * Does NOT create / lease / execute / complete / approve any hybrid job.
 * Binds only an already owner-queued, existing, approved-type public-retrieval
 * evaluation job to an owner's PLANNED learning-evidence mission.
 * PHP operationsRoute MUST enforce same SUPER_ADMIN, fresh TOTP, origin CSRF
 * and rate limiter for all writes. No new public execution endpoint.
 */
const JR_APEX_WORKER_TASK = 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION';
const JR_APEX_WORKER_ZERO = '0000000000000000000000000000000000000000000000000000000000000000';

function jrApexWorkerBridgeReady(PDO $pdo): bool
{
    if(!jrApexMissionReady($pdo)||!jrHybridSchemaReady($pdo))return false;
    try {
        $pdo->query('SELECT mission_id,job_id,owner_account_id,task_type,job_request_sha256,dataset_sha256,evidence_sha256,linked_at,last_checkpoint_seq,last_checkpoint_sha256,last_job_revision,last_job_status,last_observation_code,last_observed_at FROM jrei_apex_worker_links LIMIT 0');
        $pdo->query('SELECT mission_id,seq,job_revision,job_status,observation_code,leased_node_id,lease_fingerprint_sha256,result_digest,previous_sha256,checkpoint_sha256,observed_at FROM jrei_apex_worker_checkpoints LIMIT 0');
        return true;
    } catch(Throwable $e){return false;}
}
function jrApexWorkerReadJob(PDO $pdo,string $jobId,string $owner,bool $lock=false): ?array
{
    $q=$pdo->prepare('SELECT job_id,task_type,status,request_digest,dataset_sha256,evidence_sha256,revision,queued_at,expires_at,lease_id,leased_to_node,lease_started_at,lease_expires_at,result_digest,completed_at FROM jrei_hybrid_jobs WHERE job_id=? AND created_by_account_id=? LIMIT 1'.($lock?' FOR UPDATE':''));
    $q->execute([$jobId,$owner]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($row)?$row:null;
}
function jrApexWorkerStatus(array $job,int $at): string
{
    return match((string)$job['status']){
        'QUEUED'=>'QUEUED_NO_EXECUTION_RECEIPT',
        'LEASED'=>(
            $job['lease_expires_at']===null||
            $job['lease_started_at']===null||
            (int)$job['lease_expires_at']<$at||
            (int)$job['lease_started_at']+900<$at
        )?'LEASE_OVERDUE_RESULT_UNKNOWN':'SIGNED_NODE_LEASE_NOT_COMPLETION',
        'REVIEW_REQUIRED'=>'WORKER_REPORTED_REVIEW_REQUIRED',
        'NEEDS_REVIEW'=>'WORKER_RESULT_UNKNOWN_REVIEW_REQUIRED',
        'EXPIRED'=>'QUEUE_EXPIRED_NOT_EXECUTED',
        'CANCELLED'=>'CANCEL_REQUESTED_EFFECTS_NOT_PROVEN',
        'REVIEWED'=>'OWNER_ACKNOWLEDGED_NOT_SCIENTIFICALLY_VERIFIED',
        'REJECTED'=>'OWNER_REJECTED_RESULT',
        'CLOSED_UNKNOWN'=>'OWNER_CLOSED_UNKNOWN_RESULT',
        default=>'UNRECOGNISED_WORKER_STATE'
    };
}
function jrApexWorkerLinkRead(PDO $pdo,string $missionId,string $owner,bool $lock=false): ?array
{
    $q=$pdo->prepare('SELECT mission_id,job_id,owner_account_id,task_type,job_request_sha256,dataset_sha256,evidence_sha256,linked_at,last_checkpoint_seq,last_checkpoint_sha256,last_job_revision,last_job_status,last_observation_code,last_observed_at FROM jrei_apex_worker_links WHERE mission_id=? AND owner_account_id=? LIMIT 1'.($lock?' FOR UPDATE':''));
    $q->execute([$missionId,$owner]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($row)?$row:null;
}
/**
 * Record a single new job revision/classification; no remote result trust.
 * LOCK ORDER: existing APEX control -> owner mission -> worker link -> hybrid job.
 * Hybrid workers do not acquire APEX locks, avoiding a reverse dependency.
 * Called ONLY inside an existing owner transaction, holding the link+job locks.
 */
function jrApexWorkerAppendCheckpoint(PDO $pdo,array $link,array $job,int $at): bool
{
    if((string)$job['task_type']!==JR_APEX_WORKER_TASK||
       !hash_equals((string)$link['job_request_sha256'],(string)$job['request_digest'])||
       !hash_equals((string)$link['dataset_sha256'],(string)$job['dataset_sha256'])||
       !hash_equals((string)$link['evidence_sha256'],(string)$job['evidence_sha256']))
       throw new DomainException('original_worker_job_provenance_mismatch');
    $state=(string)$job['status'];
    $reason=jrApexWorkerStatus($job,$at);
    $revision=(int)$job['revision'];
    if($revision<1)throw new DomainException('invalid_worker_job_revision');
    if((int)$link['last_checkpoint_seq']>0){
        if($revision<(int)$link['last_job_revision'])
            throw new DomainException('worker_job_revision_regressed');
        if($revision===(int)$link['last_job_revision'] &&
           $state===(string)$link['last_job_status'] &&
           $reason===(string)$link['last_observation_code'])return false;
    }
    $seq=(int)$link['last_checkpoint_seq']+1;
    if($seq>1000000)throw new DomainException('worker_checkpoint_limit');
    $previous=(string)$link['last_checkpoint_sha256'];
    if(!preg_match('/^[a-f0-9]{64}$/D',$previous))
        throw new DomainException('worker_checkpoint_chain_invalid');
    $lease=$job['lease_id']===null?null:hash('sha256','jr.apex-worker-lease.v1|'.$job['lease_id']);
    $result=$job['result_digest'];
    if($result!==null&&!preg_match('/^[a-f0-9]{64}$/D',(string)$result))
        throw new DomainException('worker_result_digest_invalid');
    $node=$job['leased_to_node'];
    if($node!==null&&!jrHybridUuid($node))
        throw new DomainException('worker_node_id_invalid');
    $hash=hash('sha256',json_encode([
        'jr.jrei.apex-worker-checkpoint.v1',(string)$link['mission_id'],
        (string)$link['job_id'],$seq,$revision,$state,$reason,$node,
        $lease,$result,$previous,$at
    ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE));
    $pdo->prepare('INSERT INTO jrei_apex_worker_checkpoints
        (mission_id,seq,job_revision,job_status,observation_code,
         leased_node_id,lease_fingerprint_sha256,result_digest,
         previous_sha256,checkpoint_sha256,observed_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute([
          $link['mission_id'],$seq,$revision,$state,$reason,
          $node,$lease,$result,$previous,$hash,$at
        ]);
    $q=$pdo->prepare('UPDATE jrei_apex_worker_links SET
       last_checkpoint_seq=?,last_checkpoint_sha256=?,last_job_revision=?,
       last_job_status=?,last_observation_code=?,last_observed_at=?
       WHERE mission_id=? AND owner_account_id=? AND last_checkpoint_seq=?
       AND last_checkpoint_sha256=?');
    $q->execute([$seq,$hash,$revision,$state,$reason,$at,$link['mission_id'],
        $link['owner_account_id'],$seq-1,$previous]);
    if($q->rowCount()!==1)throw new DomainException('worker_checkpoint_cas_conflict');
    return true;
}
function jrApexWorkerSnapshot(PDO $pdo,array $cfg,string $owner): array
{
    $ready=jrApexWorkerBridgeReady($pdo);
    $view=[
        'ok'=>true,'schema'=>'jr.jrei.apex-worker-observations.v1',
        'motherDbLinkTablesReady'=>$ready,
        'privateOwnerLinkEnabled'=>($cfg['jrei_apex_worker_link_enabled']??false)===true,
        'hybridSourceFlagEnabled'=>($cfg['jrei_hybrid_enabled']??false)===true,
        'workerPollingModified'=>false,'workerDispatchImplemented'=>false,
        'modelImprovementVerified'=>false,'linkedJobs'=>[],'availableOwnedJobs'=>[],'checkpoints'=>[],
        'checkedAt'=>time(),
        'caution'=>'Existing signed worker DB state and owner-entered link; neither job result nor scientific improvement independently accepted. Original hybrid owner handles cancellation.'
    ];
    if(!$ready)return $view;
    // Discovery is strictly owner-scoped and confined to the PRE-EXISTING
    // reviewed-public retrieval queue. Never creates, queues or leases a job.
    $candidate=$pdo->prepare("SELECT j.job_id,j.status,j.revision,j.queued_at
       FROM jrei_hybrid_jobs j WHERE j.created_by_account_id=?
       AND j.task_type=? AND NOT EXISTS(
         SELECT 1 FROM jrei_apex_worker_links l WHERE l.job_id=j.job_id
       ) ORDER BY j.queued_at DESC,j.job_id DESC LIMIT 25");
    $candidate->execute([$owner,JR_APEX_WORKER_TASK]);
    foreach($candidate as $r)$view['availableOwnedJobs'][]=[
        'jobId'=>(string)$r['job_id'],
        'state'=>(string)$r['status'],
        'revision'=>(int)$r['revision'],
        'queuedAt'=>(int)$r['queued_at'],
        'eligibleForLinkOnlyAfterMissionCreated'=>true,
        'alreadyOwnerApprovedForExecutionByThisScreen'=>false,
    ];
    $q=$pdo->prepare('SELECT l.mission_id,l.job_id,l.linked_at,
       l.last_checkpoint_seq,l.last_checkpoint_sha256,l.last_job_revision,
       l.last_job_status,l.last_observation_code,l.last_observed_at,
       m.intent_code,m.status AS mission_state,
       j.status AS live_job_status,j.revision AS live_job_revision,
       j.lease_expires_at,j.lease_started_at,j.result_digest,j.leased_to_node
       FROM jrei_apex_worker_links l
       JOIN jrei_apex_owner_missions m ON m.mission_id=l.mission_id
       JOIN jrei_hybrid_jobs j ON j.job_id=l.job_id
       WHERE l.owner_account_id=? AND m.owner_account_id=?
       ORDER BY l.linked_at DESC,l.mission_id DESC LIMIT 40');
    $q->execute([$owner,$owner]);
    $ids=[];
    foreach($q as $row){
        $view['linkedJobs'][]=[
            'missionId'=>(string)$row['mission_id'],'jobId'=>(string)$row['job_id'],
            'missionState'=>(string)$row['mission_state'],
            'intent'=>(string)$row['intent_code'],
            'jobStatus'=>(string)$row['live_job_status'],
            'observationCode'=>jrApexWorkerStatus(['status'=>$row['live_job_status'],
                'lease_expires_at'=>$row['lease_expires_at'],
                'lease_started_at'=>$row['lease_started_at']],time()),
            'lastRecordedObservation'=>(string)$row['last_observation_code'],
            'lastJobRevision'=>(int)$row['live_job_revision'],
            'lastCheckpointSequence'=>(int)$row['last_checkpoint_seq'],
            'lastCheckpointSha256'=>(string)$row['last_checkpoint_sha256'],
            'linkedAt'=>(int)$row['linked_at'],
            'lastRecordedAt'=>$row['last_observed_at']===null?null:(int)$row['last_observed_at'],
            'workerNodeId'=>$row['leased_to_node'],
            'workerReportedResultSha256'=>$row['result_digest'],
            'executionVerified'=>false,'scienceAccepted'=>false,
            'canCancelOnlyViaExistingHybridOwner'=>true
        ];
        $ids[]=(string)$row['mission_id'];
    }
    if($ids){
        $slots=implode(',',array_fill(0,count($ids),'?'));
        $q=$pdo->prepare('SELECT mission_id,seq,job_revision,job_status,
          observation_code,previous_sha256,checkpoint_sha256,observed_at
          FROM jrei_apex_worker_checkpoints WHERE mission_id IN ('.$slots.')
          ORDER BY observed_at DESC,mission_id DESC,seq DESC LIMIT 100');
        $q->execute($ids);
        foreach($q as $row)$view['checkpoints'][]=[
            'missionId'=>(string)$row['mission_id'],'sequence'=>(int)$row['seq'],
            'jobRevision'=>(int)$row['job_revision'],
            'jobStatus'=>(string)$row['job_status'],
            'observationCode'=>(string)$row['observation_code'],
            'previousSha256'=>(string)$row['previous_sha256'],
            'checkpointSha256'=>(string)$row['checkpoint_sha256'],
            'observedAt'=>(int)$row['observed_at']
        ];
    }
    return $view;
}
function jrApexWorkerOwnerChange(PDO $pdo,array $cfg,string $owner,array $body): array
{
    if(!jrApexWorkerBridgeReady($pdo)||!jrApexMissionAccountId($owner))
        throw new RuntimeException('worker_observation_schema_unavailable');
    $action=$body['action']??null;
    if(!is_string($action)||!in_array($action,['link','checkpoint'],true))
        throw new InvalidArgumentException('worker_observation_action_invalid');
    if(($cfg['jrei_apex_worker_link_enabled']??false)!==true)
        throw new DomainException('worker_observation_private_flag_off');
    $keys=array_keys($body);sort($keys);
    $expected=$action==='link'
        ?['action','confirmation','expectedJobRevision','jobId','missionId']
        :['action','missionId'];
    sort($expected);
    if($keys!==$expected)throw new InvalidArgumentException('worker_observation_shape_invalid');
    $missionId=$body['missionId']??null;
    if(!jrHybridUuid($missionId))throw new InvalidArgumentException('mission_id_invalid');
    if($action==='link' && (
        !jrHybridUuid($body['jobId']) ||
        !is_int($body['expectedJobRevision']) ||
        $body['expectedJobRevision']<1 ||
        $body['confirmation']!=='LINK_EXISTING_OWNED_RETRIEVAL_JOB_ONLY'
    ))throw new InvalidArgumentException('worker_link_confirmation_invalid');
    $at=nowTs();
    $pdo->beginTransaction();
    try{
        // The original APEX control is the root of the lock ordering.
        $control=jrApexMissionControl($pdo,true);
        if(!$control)throw new RuntimeException('apex_owner_control_unavailable');
        $mission=jrApexMissionOwnerRead($pdo,$owner,$missionId,true);
        if(!$mission)throw new DomainException('mission_not_owned');
        if((string)$mission['intent_code']!=='LEARNING_EVIDENCE_REVIEW')
            throw new DomainException('intent_cannot_link_worker_job');
        $link=jrApexWorkerLinkRead($pdo,$missionId,$owner,true);
        if($action==='link'){
            if((int)$control['emergency_stop']!==0 ||
               (int)$control['planning_enabled']!==1 ||
               (int)$control['execution_enabled']!==0 ||
               ($cfg['jrei_apex_missions_owner_write_enabled']??false)!==true)
                throw new DomainException('owner_link_planning_stopped');
            if($mission['status']!=='PLANNED'||(int)$mission['expires_at']<$at)
                throw new DomainException('mission_no_longer_linkable');
            if($link && (string)$link['job_id']!==(string)$body['jobId'])
                throw new DomainException('mission_already_linked_to_another_job');
            $job=jrApexWorkerReadJob($pdo,$body['jobId'],$owner,true);
            if(!$job||$job['task_type']!==JR_APEX_WORKER_TASK ||
               (int)$job['queued_at']<(int)$mission['created_at'])
                throw new DomainException('worker_job_scope_or_causality_invalid');
            if(!preg_match('/^[a-f0-9]{64}$/D',(string)$job['request_digest'])||
               !preg_match('/^[a-f0-9]{64}$/D',(string)$job['dataset_sha256'])||
               !preg_match('/^[a-f0-9]{64}$/D',(string)$job['evidence_sha256']))
                throw new DomainException('worker_job_fingerprints_invalid');
            if(!$link){
                if((int)$job['revision']!==$body['expectedJobRevision'])
                    throw new DomainException('worker_job_revision_changed');
                $q=$pdo->prepare('INSERT INTO jrei_apex_worker_links
                   (mission_id,job_id,owner_account_id,task_type,job_request_sha256,
                    dataset_sha256,evidence_sha256,linked_at,last_checkpoint_sha256)
                   VALUES(?,?,?,?,?,?,?,?,?)');
                $q->execute([$missionId,$body['jobId'],$owner,JR_APEX_WORKER_TASK,
                    $job['request_digest'],$job['dataset_sha256'],
                    $job['evidence_sha256'],$at,JR_APEX_WORKER_ZERO]);
                $link=jrApexWorkerLinkRead($pdo,$missionId,$owner,true);
                if(!$link)throw new RuntimeException('worker_link_insert_not_visible');
                jrApexWorkerAppendCheckpoint($pdo,$link,$job,$at);
                operationsAudit($pdo,$owner,'jrei_apex_existing_worker_job_linked',$missionId);
            }
        } else {
            if(!$link)throw new DomainException('worker_job_link_missing');
            // Continue recording safety observations even after emergency stop,
            // but NEVER launch or extend a lease. A cancelled mission is a
            // historical observation, not proof remote work was cancelled.
            $job=jrApexWorkerReadJob($pdo,(string)$link['job_id'],$owner,true);
            if(!$job)throw new DomainException('original_worker_job_missing');
            if(jrApexWorkerAppendCheckpoint($pdo,$link,$job,$at))
                operationsAudit($pdo,$owner,'jrei_apex_worker_checkpoint',$missionId);
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return jrApexWorkerSnapshot($pdo,$cfg,$owner);
}
