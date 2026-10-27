<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * JREI APEX V2 — original SUPER_ADMIN/MFA owner mission registry.
 *
 * This is a durable metadata-only planning journal, not a queue executor.
 * Caller MUST already enforce existing operationsRoute role/MFA/CSRF/rate gates.
 * There is no executable command text, model output, SQL, server tool, or
 * worker dispatcher in this module. No new database or owner identity system.
 * Every write is guarded by the original drjavad1_store transaction.
 */
const JR_APEX_MISSION_INTENTS = [
    'SEO_ROBOTS_DIAGNOSTIC',
    'NEWS_INGESTION_DIAGNOSTIC',
    'JREI_NODE_HEALTH_REVIEW',
    'EDUCATION_SOURCE_GAP_REVIEW',
    'MOTHER_DB_METADATA_REVIEW',
    'LEARNING_EVIDENCE_REVIEW',
    // JREI central-site intelligence missions reuse the existing owner
    // ledger and can only create bounded proposals, never self-deploy.
    'WEBSITE_CODE_REVIEW',
    'WEBSITE_SEO_GEO_REVIEW',
    'WEBSITE_DESIGN_ACCESSIBILITY_REVIEW',
    'WEBSITE_DATABASE_SCHEMA_REVIEW',
    'WEBSITE_OPERATIONS_ENGINES_REVIEW'
];
const JR_APEX_MISSION_ZEROS = '0000000000000000000000000000000000000000000000000000000000000000';

function jrApexMissionReady(PDO $pdo): bool
{
    try {
        $pdo->query('SELECT singleton_id,planning_enabled,emergency_stop,execution_enabled,revision FROM jrei_apex_mission_controls LIMIT 0');
        $pdo->query('SELECT mission_id,owner_account_id,request_key,intent_code,request_digest,policy_digest,status,revision,last_event_seq,last_event_hash,created_at,updated_at,expires_at,cancellation_requested_at,completed_at FROM jrei_apex_owner_missions LIMIT 0');
        $pdo->query('SELECT mission_id,seq,event_code,from_status,to_status,actor_account_id,previous_sha256,event_sha256,evidence_sha256,occurred_at FROM jrei_apex_mission_events LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}
function jrApexMissionUuid(): string
{
    $bytes=random_bytes(16);
    $bytes[6]=chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8]=chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex=bin2hex($bytes);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).
      '-'.substr($hex,16,4).'-'.substr($hex,20);
}
function jrApexMissionAccountId(string $account): bool
{
    return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/Di',$account)===1;
}
function jrApexMissionControl(PDO $pdo, bool $lock=false): ?array
{
    $q=$pdo->query('SELECT singleton_id,planning_enabled,emergency_stop,execution_enabled,revision,updated_at FROM jrei_apex_mission_controls WHERE singleton_id=1'.
        ($lock?' FOR UPDATE':''));
    $row=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($row)?$row:null;
}
function jrApexMissionRecord(array $row): array
{
    return [
        'missionId'=>(string)$row['mission_id'],
        'intent'=>(string)$row['intent_code'],
        'status'=>(string)$row['status'],
        'revision'=>(int)$row['revision'],
        'lastEventSequence'=>(int)$row['last_event_seq'],
        'eventChainHead'=>(string)$row['last_event_hash'],
        'createdAt'=>(int)$row['created_at'],
        'updatedAt'=>(int)$row['updated_at'],
        'expiresAt'=>(int)$row['expires_at'],
        'cancellationRequestedAt'=>$row['cancellation_requested_at']===null?null:(int)$row['cancellation_requested_at'],
        // "PLANNED" never means work started, skill invoked or completed.
        'taskExecutionStatus'=>'NOT_INDEPENDENTLY_VERIFIED',
        'modelInferenceVerified'=>false,
        'scienceAccepted'=>false
    ];
}
function jrApexMissionOwnerRead(PDO $pdo, string $accountId, string $missionId, bool $lock=false): ?array
{
    $q=$pdo->prepare('SELECT mission_id,owner_account_id,request_key,intent_code,request_digest,policy_digest,status,revision,last_event_seq,last_event_hash,created_at,updated_at,expires_at,cancellation_requested_at,completed_at FROM jrei_apex_owner_missions WHERE mission_id=? AND owner_account_id=? LIMIT 1'.
      ($lock?' FOR UPDATE':''));
    $q->execute([$missionId,$accountId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($row)?$row:null;
}
/** Called INSIDE the same locked transaction as each state change. */
function jrApexMissionAppend(PDO $pdo, array $mission, string $to,
    string $code, string $accountId, int $at): void
{
    $from=(string)$mission['status'];
    $permitted=[
        'PLANNED'=>['CANCELLED'],
        'AUTHORIZED'=>['CANCELLED'],
        'RUNNING'=>['UNKNOWN_RESULT'],
        'EXECUTED'=>['REQUIRES_REVIEW']
    ];
    if ($code!=='MISSION_PLANNED' &&
        !in_array($to,$permitted[$from]??[],true))
        throw new DomainException('mission_transition_denied');
    if ($code==='MISSION_PLANNED' &&
        ($from!=='PLANNED'||$to!=='PLANNED'||(int)$mission['last_event_seq']!==0))
        throw new DomainException('mission_initial_event_invalid');
    $id=(string)$mission['mission_id'];
    $seq=(int)$mission['last_event_seq']+1;
    if ($seq>1000000)throw new DomainException('mission_event_limit_reached');
    $prev=(string)$mission['last_event_hash'];
    if(!preg_match('/^[a-f0-9]{64}$/D',$prev))
        throw new DomainException('mission_event_chain_invalid');
    $eventHash=hash('sha256',json_encode([
        'jr.jrei.apex-mission-event.v1',$id,$seq,$code,
        $code==='MISSION_PLANNED'?null:$from,$to,$accountId,$prev,$at
    ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
    $pdo->prepare('INSERT INTO jrei_apex_mission_events
      (mission_id,seq,event_code,from_status,to_status,actor_account_id,
       previous_sha256,event_sha256,evidence_sha256,occurred_at)
      VALUES(?,?,?,?,?,?,?,?,NULL,?)')->execute([
        $id,$seq,$code,$code==='MISSION_PLANNED'?null:$from,$to,
        $accountId,$prev,$eventHash,$at
    ]);
    $cancel=($to==='CANCELLED'||$to==='UNKNOWN_RESULT'||$to==='REQUIRES_REVIEW')
        ?$at:null;
    $updated=$pdo->prepare('UPDATE jrei_apex_owner_missions SET status=?,
      revision=revision+1,last_event_seq=?,last_event_hash=?,updated_at=?,
      cancellation_requested_at=COALESCE(cancellation_requested_at,?)
      WHERE mission_id=? AND owner_account_id=? AND last_event_seq=? AND last_event_hash=?');
    $updated->execute([$to,$seq,$eventHash,$at,$cancel,$id,$accountId,$seq-1,$prev]);
    if($updated->rowCount()!==1)
        throw new DomainException('mission_event_atomic_update_conflict');
    // No separate "successful action" event: this is metadata-only journaling.
}
/**
 * Link a previously COMPLETED existing low-risk observation to an owner
 * mission. This NEVER executes the task, advances mission status, authorizes
 * a worker, or trusts model-supplied action ids and evidence.
 *
 * evidence_sha256 stores the already opaque SHA-256-shaped operations run id,
 * permitting the owner to locate the exact run in the existing run journal.
 * The immutable event hash commits to that run's release, state and response.
 */
function jrApexMissionLinkObservation(PDO $pdo, string $accountId,
    string $missionId, string $runId, int $at): void
{
    if(!jrApexMissionAccountId($accountId) ||
       !jrApexMissionAccountId($missionId) ||
       preg_match('/^[a-f0-9]{64}$/D',$runId)!==1)
        throw new InvalidArgumentException('mission_observation_reference_invalid');
    $allowed=[
        'WEBSITE_SEO_GEO_REVIEW'=>'ENG-01.ACT-011',
        'WEBSITE_OPERATIONS_ENGINES_REVIEW'=>'ENG-11.ACT-009'
    ];
    $pdo->beginTransaction();
    try {
        $row=jrApexMissionOwnerRead($pdo,$accountId,$missionId,true);
        if(!$row || (string)$row['status']!=='PLANNED' ||
           (int)$row['expires_at']<=$at)
            throw new DomainException('mission_not_open_for_observation');
        $action=$allowed[(string)$row['intent_code']]??null;
        if($action===null)throw new DomainException('mission_observation_not_allowlisted');
        $run=$pdo->prepare('SELECT action_id,release_sha,status,created_at,finished_at,result_json
            FROM operations_action_runs WHERE run_id=? AND account_id=? LIMIT 1');
        $run->execute([$runId,$accountId]);
        $observed=$run->fetch(PDO::FETCH_ASSOC);
        if(!is_array($observed) ||
           $observed['action_id']!==$action ||
           !in_array($observed['status'],['succeeded','blocked'],true) ||
           $observed['finished_at']===null ||
           (int)$observed['created_at']<(int)$row['created_at'] ||
           (int)$observed['created_at']>(int)$observed['finished_at'] ||
           (int)$observed['finished_at']>$at+5 ||
           !preg_match('/^[a-f0-9]{40}$/D',(string)$observed['release_sha']) ||
           !is_string($observed['result_json']) ||
           strlen($observed['result_json'])>10000)
            throw new DomainException('observation_run_not_final_or_allowed');
        // Replaying a link does not create a second event or confuse the
        // original Action execution with completion of the JREI mission.
        $prior=$pdo->prepare('SELECT seq FROM jrei_apex_mission_events
            WHERE mission_id=? AND event_code=? AND evidence_sha256=? LIMIT 1');
        $prior->execute([$missionId,'OWNER_READONLY_OBSERVATION_LINKED',$runId]);
        if($prior->fetchColumn()!==false){$pdo->commit();return;}
        $seq=(int)$row['last_event_seq']+1;
        if($seq>1000000)throw new DomainException('mission_event_limit_reached');
        $previous=(string)$row['last_event_hash'];
        if(!preg_match('/^[a-f0-9]{64}$/D',$previous))
            throw new DomainException('mission_event_chain_invalid');
        $code='OWNER_READONLY_OBSERVATION_LINKED';
        $state='PLANNED';
        $evidenceDigest=hash('sha256',json_encode([
            'jr.jrei.original-readonly-observation.v1',
            $missionId,$runId,$action,$observed['release_sha'],
            $observed['status'],(int)$observed['created_at'],
            (int)$observed['finished_at'],hash('sha256',$observed['result_json'])
        ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
        $eventDigest=hash('sha256',json_encode([
            'jr.jrei.apex-mission-observation-event.v1',
            $missionId,$seq,$code,$state,$state,$accountId,
            $previous,$at,$runId,$evidenceDigest
        ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
        $pdo->prepare('INSERT INTO jrei_apex_mission_events
            (mission_id,seq,event_code,from_status,to_status,actor_account_id,
            previous_sha256,event_sha256,evidence_sha256,occurred_at)
            VALUES(?,?,?,?,?,?,?,?,?,?)')->execute([
                $missionId,$seq,$code,$state,$state,$accountId,
                $previous,$eventDigest,$runId,$at
            ]);
        $updated=$pdo->prepare('UPDATE jrei_apex_owner_missions
            SET revision=revision+1,last_event_seq=?,last_event_hash=?,updated_at=?
            WHERE mission_id=? AND owner_account_id=?
              AND last_event_seq=? AND last_event_hash=? AND status=?');
        $updated->execute([$seq,$eventDigest,$at,$missionId,$accountId,
            $seq-1,$previous,$state]);
        if($updated->rowCount()!==1)
            throw new DomainException('mission_observation_atomic_conflict');
        operationsAudit($pdo,$accountId,'jrei_apex_readonly_observation_linked',$missionId);
        $pdo->commit();
    }catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrApexMissionSnapshot(PDO $pdo, array $cfg, string $accountId): array
{
    $ready=jrApexMissionReady($pdo);
    $base=[
        'ok'=>true,'schema'=>'jr.jrei.apex-owner-missions.v1',
        'dataState'=>$ready?'MOTHER_DB_SOURCE_METADATA':'MOTHER_DB_MIGRATION_REQUIRED',
        'motherDbSchemaReady'=>$ready,
        'ownerWritePrivateFlagEnabled'=>($cfg['jrei_apex_missions_owner_write_enabled']??false)===true,
        'planningEnabled'=>false,
        'emergencyStop'=>true,
        'executionEnabled'=>false,
        'durableMissionCapability'=>'NOT_ACCEPTED_IN_PRODUCTION',
        'workerDispatchImplemented'=>false,
        'pythonPlanningSourceEnabled'=>(
            ($cfg['jrei_apex_mission_python_plan_enabled']??false)===true &&
            ($cfg['jrei_python_internal_enabled']??false)===true &&
            ($cfg['jrei_apex_missions_owner_write_enabled']??false)===true &&
            function_exists('jrApexPythonPlanSchemaReady') &&
            jrApexPythonPlanSchemaReady($pdo)
        ),
        'modelInferenceVerified'=>false,
        'checkedAt'=>time(),
        'intents'=>JR_APEX_MISSION_INTENTS,
        'missions'=>[],
        'events'=>[],
        'note'=>'Only server-stored metadata appears here. Planning never proves an agent ran; source commits never prove migration or production activation.'
    ];
    if(!$ready)return $base;
    $control=jrApexMissionControl($pdo);
    if(!$control)return $base;
    $base['planningEnabled']=(int)$control['planning_enabled']===1;
    $base['emergencyStop']=(int)$control['emergency_stop']!==0;
    $base['executionEnabled']=(int)$control['execution_enabled']===1;
    $base['controlRevision']=(int)$control['revision'];
    $q=$pdo->prepare('SELECT mission_id,owner_account_id,request_key,intent_code,request_digest,policy_digest,status,revision,last_event_seq,last_event_hash,created_at,updated_at,expires_at,cancellation_requested_at,completed_at FROM jrei_apex_owner_missions WHERE owner_account_id=? ORDER BY created_at DESC,mission_id DESC LIMIT 40');
    $q->execute([$accountId]);
    $ids=[];
    foreach($q as $row) {
        $base['missions'][]=jrApexMissionRecord($row);
        $ids[]=(string)$row['mission_id'];
    }
    if($ids){
        $slots=implode(',',array_fill(0,count($ids),'?'));
        $ev=$pdo->prepare('SELECT mission_id,seq,event_code,from_status,to_status,previous_sha256,event_sha256,evidence_sha256,occurred_at FROM jrei_apex_mission_events WHERE mission_id IN ('.$slots.') ORDER BY occurred_at DESC,mission_id DESC,seq DESC LIMIT 100');
        $ev->execute($ids);
        foreach($ev as $row){
            $base['events'][]=[
                'missionId'=>(string)$row['mission_id'],'sequence'=>(int)$row['seq'],
                'event'=>(string)$row['event_code'],'from'=>$row['from_status'],
                'to'=>(string)$row['to_status'],'recordedAt'=>(int)$row['occurred_at'],
                'eventDigest'=>(string)$row['event_sha256'],
                'previousDigest'=>(string)$row['previous_sha256'],
                'sourceObservationRunId'=>$row['event_code']==='OWNER_READONLY_OBSERVATION_LINKED'
                    ?(string)$row['evidence_sha256']:null,
                'missionExecutionVerified'=>false
            ];
        }
    }
    jrApexPythonAttachSnapshot($pdo,$base,$ids);
    return $base;
}
function jrApexMissionOwnerChange(PDO $pdo,array $cfg,string $accountId,array $body): array
{
    if(!jrApexMissionReady($pdo)||!jrApexMissionAccountId($accountId))
        throw new RuntimeException('mission_db_unavailable');
    $action=$body['action']??null;
    if(!is_string($action)||!in_array($action,
        ['plan','plan-python','cancel','link-observation','emergency-stop','resume-planning'],true))
        throw new InvalidArgumentException('mission_action_invalid');
    $readOnlySwitch=($cfg['jrei_apex_missions_owner_write_enabled']??false)!==true;
    // Emergency stop and cancellation remain accessible when the new-write
    // feature flag is OFF. They still demand original owner MFA+CSRF+role.
    if($readOnlySwitch && !in_array($action,['cancel','emergency-stop','link-observation'],true))
        throw new DomainException('mission_planning_source_only');
    $expectedKeys=match($action) {
        'plan','plan-python'=>['action','intent','requestKey'],
        'cancel'=>['action','missionId'],
        'link-observation'=>['action','missionId','runId'],
        default=>['action']
    };
    $keys=array_keys($body);sort($keys);sort($expectedKeys);
    if($keys!==$expectedKeys)throw new InvalidArgumentException('mission_body_invalid');
    // Python preflight runs BEFORE mother-DB locks. It cannot mutate state.
    // Recheck the control revision after lock, before recording the receipt.
    $prepared=$action==='plan-python'
        ? jrApexPythonPrepare($pdo,$cfg,$accountId,$body) : null;
    $at=nowTs();
    if($action==='link-observation') {
        if(!is_string($body['missionId']) || !is_string($body['runId']))
            throw new InvalidArgumentException('mission_observation_reference_invalid');
        jrApexMissionLinkObservation($pdo,$accountId,$body['missionId'],$body['runId'],$at);
        return jrApexMissionSnapshot($pdo,$cfg,$accountId);
    }
    $pdo->beginTransaction();
    try {
        $control=jrApexMissionControl($pdo,true);
        if(!$control)throw new RuntimeException('mission_control_row_missing');
        if($action==='emergency-stop') {
            if((int)$control['emergency_stop']!==1||
               (int)$control['planning_enabled']!==0||
               (int)$control['execution_enabled']!==0) {
                $pdo->prepare('UPDATE jrei_apex_mission_controls
                  SET planning_enabled=0,emergency_stop=1,execution_enabled=0,
                      revision=revision+1,
                      updated_at=?,updated_by_account_id=? WHERE singleton_id=1')
                  ->execute([$at,$accountId]);
                operationsAudit($pdo,$accountId,'jrei_apex_emergency_stop','owner_missions');
            }
        } elseif($action==='resume-planning') {
            // Explicitly resumes PLAN creation only. NEVER a worker executor.
            $pdo->prepare('UPDATE jrei_apex_mission_controls
              SET planning_enabled=1,emergency_stop=0,execution_enabled=0,
                  revision=revision+1,updated_at=?,updated_by_account_id=?
              WHERE singleton_id=1')->execute([$at,$accountId]);
            operationsAudit($pdo,$accountId,'jrei_apex_planning_only_resume','owner_missions');
        } elseif($action==='plan'||$action==='plan-python') {
            $intent=$body['intent'];
            $requestKey=$body['requestKey'];
            if(!is_string($intent)||!in_array($intent,JR_APEX_MISSION_INTENTS,true)||
               !is_string($requestKey)||
               !preg_match('/^[a-f0-9]{32}$/D',$requestKey))
                throw new InvalidArgumentException('mission_intent_or_key_invalid');
            $digest=hash('sha256','jr.jrei.apex-mission-request.v1|'.$intent);
            $prior=$pdo->prepare('SELECT mission_id,request_digest FROM jrei_apex_owner_missions WHERE owner_account_id=? AND request_key=? LIMIT 1 FOR UPDATE');
            $prior->execute([$accountId,$requestKey]);
            $existing=$prior->fetch(PDO::FETCH_ASSOC);
            if($existing){
                if(!hash_equals((string)$existing['request_digest'],$digest))
                    throw new DomainException('mission_request_key_conflict');
                // The same key cannot silently change between original PHP
                // planning and HMAC/Python planning. The legacy request digest
                // does not encode mode, so the immutable Python plan row does.
                $pythonModeRecorded=false;
                if(jrApexPythonPlanSchemaReady($pdo)) {
                    $mode=$pdo->prepare('SELECT 1 FROM jrei_apex_mission_python_plans WHERE mission_id=? LIMIT 1');
                    $mode->execute([(string)$existing['mission_id']]);
                    $pythonModeRecorded=$mode->fetchColumn()!==false;
                } elseif($action==='plan-python') {
                    throw new DomainException('mission_python_plan_schema_missing');
                }
                if(($action==='plan-python')!==$pythonModeRecorded)
                    throw new DomainException('mission_request_key_mode_conflict');
                // The same idempotent request never creates a second event.
            } else {
                // A duplicate can be read after an emergency stop, but no
                // NEW mission may be created while planning is halted.
            if((int)$control['emergency_stop']!==0 ||
               (int)$control['planning_enabled']!==1 ||
               (int)$control['execution_enabled']!==0)
                throw new DomainException('mission_planning_stopped');
                $id=$prepared['missionId']??jrApexMissionUuid();
                // Policy digest ties the plan to the recorded control revision,
                // not to a model, user text, unverifiable external source or URL.
                $policyHash=hash('sha256','jr.apex.planning.v1|'.$control['revision']);
                if($action==='plan-python' && (!$prepared ||
                   $prepared['policyDigest']!==$policyHash ||
                   $prepared['controlRevision']!==(int)$control['revision']))
                    throw new DomainException('mission_python_control_changed');
                $pdo->prepare('INSERT INTO jrei_apex_owner_missions
                  (mission_id,owner_account_id,request_key,intent_code,
                  request_digest,policy_digest,status,revision,last_event_seq,
                  last_event_hash,created_at,updated_at,expires_at)
                  VALUES(?,?,?,?,?,?,DEFAULT,1,0,?,?,?,?)')
                    ->execute([$id,$accountId,$requestKey,$intent,$digest,$policyHash,
                        JR_APEX_MISSION_ZEROS,$at,$at,$at+604800]);
                $row=jrApexMissionOwnerRead($pdo,$accountId,$id,true);
                if(!$row)throw new RuntimeException('mission_insert_unavailable');
                jrApexMissionAppend($pdo,$row,'PLANNED','MISSION_PLANNED',$accountId,$at);
                if($action==='plan-python') jrApexPythonStore($pdo,$id,$prepared,$at);
                operationsAudit($pdo,$accountId,$action==='plan-python'
                    ?'jrei_apex_python_plan_stored':'jrei_apex_owner_plan',$id);
            }
        } elseif($action==='cancel') {
            $id=$body['missionId'];
            if(!is_string($id)||!jrApexMissionAccountId($id))
                throw new InvalidArgumentException('mission_id_invalid');
            $row=jrApexMissionOwnerRead($pdo,$accountId,$id,true);
            if(!$row)throw new DomainException('mission_not_owned_or_found');
            $status=(string)$row['status'];
            $next=match($status) {
                'PLANNED','AUTHORIZED'=>'CANCELLED',
                'RUNNING'=>'UNKNOWN_RESULT',
                'EXECUTED'=>'REQUIRES_REVIEW',
                default=>null
            };
            if($next!==null) {
                $event=match($next) {
                    'CANCELLED'=>'OWNER_CANCELLED',
                    'UNKNOWN_RESULT'=>'CANCEL_RESULT_UNKNOWN',
                    default=>'OWNER_REVIEW_REQUESTED'
                };
                jrApexMissionAppend($pdo,$row,$next,$event,$accountId,$at);
                operationsAudit($pdo,$accountId,'jrei_apex_owner_cancel',$id);
            }
            // Terminal states are idempotent, never overwritten as success.
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return jrApexMissionSnapshot($pdo,$cfg,$accountId);
}
