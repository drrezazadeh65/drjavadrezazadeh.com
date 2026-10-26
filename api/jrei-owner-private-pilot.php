<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-local-chat.php';

/**
 * OWNER-ONLY experimental Qwen bridge.
 * This is a separate non-public queue state, not an AI quality approval:
 * MFA SUPER_ADMIN makes every request; an owner-registered Ed25519 Windows node collects outbound;
 * encrypted, ephemeral, no self-learning, no cloud, no learner data.
 * Both original owner Windows node roles are eligible for the PRIVATE pilot,
 * only when their pre-existing signed identity, enabled node, reviewed model
 * version and exact GGUF hash pass. No public generative grant is implied.
 * No site-wide public release/environment flag is changed or inferred.
 */
function jrOwnerPilotModel(PDO $pdo,string $node,array $body): bool {
    $model=$body['modelId']??null;
    $version=$body['modelVersion']??null;
    $sha=$body['modelSha256']??null;
    if(!jrHybridUuid($node)||!jrHybridIdentifier($model)||
       !jrHybridIdentifier($version)||!jrHybridSha($sha))return false;
    $q=$pdo->prepare("SELECT n.node_id FROM jrei_hybrid_nodes n
       JOIN jrei_local_model_registry m
         ON m.model_id=? AND m.model_version=?
       WHERE n.node_id=? AND n.provider_type IN ('LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER')
         AND n.status='ENABLED' AND n.revoked_at IS NULL
         AND n.permitted_task='REVIEWED_PUBLIC_RETRIEVAL_EVALUATION'
         AND m.model_artifact_sha256=?
         AND m.status='RIGHTS_REVIEWED' AND m.suspended_at IS NULL LIMIT 1");
    $q->execute([$model,$version,$node,$sha]);
    return $q->fetchColumn()!==false;
}
function jrOwnerPilotReady(PDO $pdo,array $cfg): bool {
    return jrLocalChatKey($cfg)!==null && jrLocalChatSchemaReady($pdo);
}
/**
 * Minimal server-side owner diagnostic, not a chat/prompt archive.
 * Never return keys, retrieval tokens, ciphertext, raw model outputs or
 * individual job identifiers. Existing owner MFA/role gate lives in
 * operationsRoute(). Live Qwen process is NOT attested by this SQL snapshot.
 */
function jrOwnerPilotOwnerSnapshot(PDO $pdo,array $cfg): array {
    $schemaReady=jrLocalChatSchemaReady($pdo);
    $encryptionReady=jrLocalChatKey($cfg)!==null;
    $snapshot=[
        'ok'=>true,
        'schema'=>'jr.jrei.owner-pilot-readiness.v1',
        'privateOnly'=>true,
        'publicAiActivated'=>false,
        'scientificQualityAccepted'=>false,
        'motherDatabaseQueueReady'=>$schemaReady,
        'queueEncryptionConfigured'=>$encryptionReady,
        'acceptingPrivateOwnerRequests'=>$schemaReady && $encryptionReady,
        'registeredEnabledOwnerNodes'=>null,
        'rightsReviewedModelCandidates'=>null,
        'activeQueueCounts'=>null,
        'queueRetentionSeconds'=>95,
        'liveLocalModelHealth'=>'NOT_OBSERVABLE_FROM_BERTINA_DB',
        'signedOwnerPilotPollFreshness'=>'NOT_PERSISTED_BY_PILOT',
        'durableConversationTranscript'=>false,
        'checkedAt'=>time(),
        'observationScope'=>'CURRENT_MOTHER_DB_METADATA_NOT_PROOF_OF_INFERENCE',
    ];
    if(!$schemaReady)return $snapshot;
    try{
        // Aggregate inventory, not proof of a working local llama-server.
        $n=$pdo->query("SELECT COUNT(*) FROM jrei_hybrid_nodes
          WHERE provider_type IN ('LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER')
            AND status='ENABLED' AND revoked_at IS NULL");
        $snapshot['registeredEnabledOwnerNodes']=(int)$n->fetchColumn();
        $m=$pdo->query("SELECT COUNT(*) FROM jrei_local_model_registry
          WHERE status='RIGHTS_REVIEWED' AND suspended_at IS NULL");
        $snapshot['rightsReviewedModelCandidates']=(int)$m->fetchColumn();
        $counts=[
            'PILOT_QUEUED'=>0,'PILOT_LEASED'=>0,
            'PILOT_COMPLETED'=>0,'PILOT_BLOCKED'=>0
        ];
        $q=$pdo->prepare("SELECT status,COUNT(*) AS aggregate_count
          FROM jrei_local_chat_jobs
          WHERE status IN ('PILOT_QUEUED','PILOT_LEASED',
                           'PILOT_COMPLETED','PILOT_BLOCKED')
            AND expires_at>?
          GROUP BY status");
        $q->execute([time()]);
        foreach($q as $row) {
            $state=(string)$row['status'];
            if(array_key_exists($state,$counts))
                $counts[$state]=(int)$row['aggregate_count'];
        }
        $snapshot['activeQueueCounts']=$counts;
    }catch(Throwable $e){
        // Unknown is more accurate than a fictional empty queue or node.
        $snapshot['registeredEnabledOwnerNodes']=null;
        $snapshot['rightsReviewedModelCandidates']=null;
        $snapshot['activeQueueCounts']=null;
        $snapshot['observationScope']='AGGREGATE_QUERY_UNAVAILABLE';
    }
    return $snapshot;
}
/** Opportunistic short-retention cleanup, also called by the real Cron. */
function jrOwnerPilotReap(PDO $pdo): int {
    $q=$pdo->prepare("DELETE FROM jrei_local_chat_jobs
      WHERE status IN ('PILOT_QUEUED','PILOT_LEASED',
        'PILOT_COMPLETED','PILOT_BLOCKED')
        AND expires_at<? LIMIT 100");
    $q->execute([time()]);
    return $q->rowCount();
}
function jrOwnerPilotOwnerAsk(PDO $pdo,array $cfg,array $body): array {
    if(!jrOwnerPilotReady($pdo,$cfg))
        throw new DomainException('pilot_private_queue_or_key_missing');
    $question=$body['question']??null;
    $lang=$body['language']??'fa';
    if(($body['privatePilotAcknowledged']??null)!==true||
       !in_array($lang,['fa','en'],true)||
       !is_string($question)||trim($question)===''||
       strlen($question)>650||jrAiPublicTextSensitive($question))
        throw new InvalidArgumentException('pilot_input_or_acknowledgment_invalid');
    jrOwnerPilotReap($pdo);
    $now=time();
    $lockHeld=false;
    try{
        $l=$pdo->query("SELECT GET_LOCK('jr-owner-pilot-capacity-v1',0)");
        $lockHeld=(int)$l->fetchColumn()===1;
        if(!$lockHeld)throw new DomainException('pilot_concurrency_limit');
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_local_chat_jobs
          WHERE status IN ('PILOT_QUEUED','PILOT_LEASED') AND expires_at>?");
        $q->execute([$now]);
        if((int)$q->fetchColumn()>=2)
            throw new DomainException('pilot_concurrency_limit');
        $system=$lang==='fa'
          ?'شما JREI هستید. این گفت‌وگو فقط آزمایشی و خصوصی است، نه پاسخ علمی تأییدشده. پاسخ را مختصر و به فارسی درست بنویس، از نویسه چینی پرهیز کن، اگر نمی‌دانی بگو. هیچ ابزار، دستور اجرایی، اطلاعات خصوصی، استناد ساختگی یا تضمین قبولی ارائه نکن. دربارهٔ وضعیت واقعی سرور، مرحلهٔ توسعه، اعتبار علمی یا قابلیت خودیادگیری JREI از متن خودت نتیجه‌گیری نکن؛ برای این موارد شواهد مستقل سامانه لازم است.'
          :'You are JREI in a private, unverified owner test, not approved public educational advice. Answer briefly, state uncertainty, do not invent citations or admission guarantees, and do not output code or execute instructions. Do not claim to know JREI deployment status, scientific acceptance or autonomous learning from your own generated words; independent system evidence is required.';
        $payload=[
          'schema'=>'jr.jrei.owner-pilot-work.v1',
          'language'=>$lang,
          'messages'=>[['role'=>'system','content'=>$system],
                       ['role'=>'user','content'=>$question]]
        ];
        $encrypted=jrLocalChatSeal(json_encode($payload,
           JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),
           (string)jrLocalChatKey($cfg));
        $id=jrHybridNewUuid();$secret=bin2hex(random_bytes(32));
        $q=$pdo->prepare("INSERT INTO jrei_local_chat_jobs
          (job_id,retrieval_secret_sha256,status,request_ciphertext,
           expires_at,created_at,updated_at)
          VALUES (?,?,'PILOT_QUEUED',?,?,?,?)");
        $q->execute([$id,hash('sha256',$secret),$encrypted,
            $now+95,$now,$now]);
        return ['ok'=>true,'schema'=>'jr.jrei.owner-pilot-queued.v1',
          'status'=>'PENDING','jobId'=>$id,'retrievalToken'=>$secret,
          'retryAfterMilliseconds'=>2200,'privateOnly'=>true,
          'publicAiActivated'=>false];
    }finally{
        if($lockHeld){
            try{$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');
                $q->execute(['jr-owner-pilot-capacity-v1']);}
            catch(Throwable $e){}
        }
    }
}
function jrOwnerPilotOwnerResult(PDO $pdo,array $cfg,array $body): array {
    if(!jrOwnerPilotReady($pdo,$cfg))
        throw new DomainException('pilot_private_queue_or_key_missing');
    $id=$body['jobId']??null;$token=$body['retrievalToken']??null;
    if(!jrHybridUuid($id)||!is_string($token)||
       preg_match('/^[a-f0-9]{64}$/D',$token)!==1)
        throw new InvalidArgumentException('pilot_result_token_invalid');
    jrOwnerPilotReap($pdo);
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT retrieval_secret_sha256,status,expires_at,
           response_ciphertext FROM jrei_local_chat_jobs WHERE job_id=? FOR UPDATE');
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||!hash_equals(
           (string)$row['retrieval_secret_sha256'],hash('sha256',$token)))
            throw new DomainException('pilot_result_not_found');
        $status=(string)$row['status'];
        if(!in_array($status,['PILOT_QUEUED','PILOT_LEASED',
           'PILOT_COMPLETED','PILOT_BLOCKED'],true))
            throw new DomainException('pilot_result_scope_mismatch');
        if(in_array($status,['PILOT_QUEUED','PILOT_LEASED'],true)
           &&(int)$row['expires_at']>=time()){
            $pdo->commit();
            return ['ok'=>true,'status'=>'PENDING',
              'retryAfterMilliseconds'=>2500,'privateOnly'=>true];
        }
        $out=['ok'=>true,'status'=>'UNAVAILABLE',
          'qualityApproved'=>false,'publicAiActivated'=>false];
        if($status==='PILOT_BLOCKED')
            $out['status']='BLOCKED_BY_QUALITY_REVIEW';
        if($status==='PILOT_COMPLETED'&&
           is_string($row['response_ciphertext'])){
            $raw=jrLocalChatOpen((string)$row['response_ciphertext'],
                 (string)jrLocalChatKey($cfg));
            $data=json_decode($raw,true,8,JSON_THROW_ON_ERROR);
            if(!is_array($data)||($data['schema']??'')!==
               'jr.jrei.owner-pilot-answer.v1')
                throw new DomainException('pilot_result_tampered');
            $out=['ok'=>true,'status'=>'REVIEW_REQUIRED',
              'answer'=>$data['answer'],'qualityApproved'=>false,
              'privateOnly'=>true,'publicAiActivated'=>false,
              'note'=>'Provisional model output; verify educational facts.'];
        }
        $pdo->prepare("DELETE FROM jrei_local_chat_jobs WHERE job_id=?")
          ->execute([$id]);
        $pdo->commit();
        return $out;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrOwnerPilotOwnerCancel(PDO $pdo,array $body): array {
    $id=$body['jobId']??null;$token=$body['retrievalToken']??null;
    if(!jrHybridUuid($id)||!is_string($token)||
       preg_match('/^[a-f0-9]{64}$/D',$token)!==1)
        throw new InvalidArgumentException('pilot_cancel_token_invalid');
    $q=$pdo->prepare("DELETE FROM jrei_local_chat_jobs
      WHERE job_id=? AND retrieval_secret_sha256=?
        AND status IN ('PILOT_QUEUED','PILOT_LEASED',
          'PILOT_COMPLETED','PILOT_BLOCKED')");
    $q->execute([$id,hash('sha256',$token)]);
    return ['ok'=>true,'cancelled'=>$q->rowCount()===1];
}
function jrOwnerPilotWorkerPoll(PDO $pdo,array $cfg,string $node,array $body): array {
    if(!jrOwnerPilotReady($pdo,$cfg)||!jrOwnerPilotModel($pdo,$node,$body))
        throw new DomainException('pilot_model_or_queue_unavailable');
    jrOwnerPilotReap($pdo);
    $now=time();
    $pdo->beginTransaction();
    try{
        // Serializes concurrent polls from the same authenticated owner Windows node.
        $q=$pdo->prepare("SELECT node_id FROM jrei_hybrid_nodes
          WHERE node_id=? AND provider_type IN ('LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER')
            AND status='ENABLED' AND revoked_at IS NULL FOR UPDATE");
        $q->execute([$node]);
        if($q->fetchColumn()===false)
            throw new DomainException('pilot_node_revoked');
        if(!jrOwnerPilotModel($pdo,$node,$body))
            throw new DomainException('pilot_model_revoked');
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_local_chat_jobs
          WHERE leased_to_node=? AND status='PILOT_LEASED'
            AND expires_at>?");
        $q->execute([$node,$now]);
        if((int)$q->fetchColumn()>0){
            $pdo->commit();return ['ok'=>true,'job'=>null];}
        $q=$pdo->prepare("SELECT job_id,request_ciphertext,expires_at
          FROM jrei_local_chat_jobs WHERE status='PILOT_QUEUED'
            AND expires_at>? ORDER BY created_at,job_id LIMIT 1 FOR UPDATE");
        $q->execute([$now]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)){
            $pdo->commit();return ['ok'=>true,'job'=>null];}
        $payload=json_decode(jrLocalChatOpen(
          (string)$row['request_ciphertext'],(string)jrLocalChatKey($cfg)),
          true,10,JSON_THROW_ON_ERROR);
        if(!is_array($payload)||($payload['schema']??'')!==
           'jr.jrei.owner-pilot-work.v1'||
           !is_array($payload['messages']??null)||
           count($payload['messages'])!==2)
            throw new DomainException('pilot_encrypted_payload_invalid');
        $lease=bin2hex(random_bytes(32));
        $until=min($now+42,(int)$row['expires_at']);
        $q=$pdo->prepare("UPDATE jrei_local_chat_jobs SET
          status='PILOT_LEASED',leased_to_node=?,lease_secret_sha256=?,
          lease_expires_at=?,attempt_count=attempt_count+1,updated_at=?
          WHERE job_id=? AND status='PILOT_QUEUED'");
        $q->execute([$node,hash('sha256',$lease),$until,$now,$row['job_id']]);
        if($q->rowCount()!==1)
            throw new DomainException('pilot_lease_conflict');
        $pdo->commit();
        return ['ok'=>true,'job'=>['jobId'=>$row['job_id'],
          'leaseToken'=>$lease,'expiresAt'=>$until,
          'messages'=>$payload['messages'],'language'=>$payload['language']]];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();throw $e;
    }
}
function jrOwnerPilotWorkerFinish(PDO $pdo,array $cfg,string $node,
    array $body,bool $rejected): array {
    if(!jrOwnerPilotReady($pdo,$cfg)||!jrOwnerPilotModel($pdo,$node,$body))
        throw new DomainException('pilot_model_or_queue_unavailable');
    $id=$body['jobId']??null;$token=$body['leaseToken']??null;
    if(!jrHybridUuid($id)||!is_string($token)||
       preg_match('/^[a-f0-9]{64}$/D',$token)!==1)
        throw new InvalidArgumentException('pilot_lease_invalid');
    $answer=$body['answer']??null;
    if(!$rejected&&(!is_string($answer)||trim($answer)===''||
        strlen($answer)>3500))
        throw new InvalidArgumentException('pilot_draft_invalid');
    $pdo->beginTransaction();
    try{
        if(!jrOwnerPilotModel($pdo,$node,$body))
            throw new DomainException('pilot_model_revoked');
        $q=$pdo->prepare("SELECT status,leased_to_node,
           lease_secret_sha256,lease_expires_at,expires_at,request_ciphertext
           FROM jrei_local_chat_jobs WHERE job_id=? FOR UPDATE");
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||$row['status']!=='PILOT_LEASED'||
           $row['leased_to_node']!==$node||
           !hash_equals((string)$row['lease_secret_sha256'],
                hash('sha256',$token))||
           (int)$row['expires_at']<time()||
           (int)$row['lease_expires_at']<time())
            throw new DomainException('pilot_expired_or_revoked');
        $accepted=false;$sealed=null;
        if(!$rejected){
            $payload=json_decode(jrLocalChatOpen(
               (string)$row['request_ciphertext'],
               (string)jrLocalChatKey($cfg)),true,10,JSON_THROW_ON_ERROR);
            if(!is_array($payload)||($payload['schema']??'')!==
               'jr.jrei.owner-pilot-work.v1')
                throw new DomainException('pilot_payload_invalid');
            $user=$payload['messages'][1]['content']??'';
            $language=$payload['language']??'fa';
            $accepted=is_string($user)&&
                jrJreiLocalDraftIntegrityFailure($user,$answer,$language)===null;
            if($accepted){
                $response=json_encode(['schema'=>'jr.jrei.owner-pilot-answer.v1',
                  'answer'=>$answer],
                  JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
                $sealed=jrLocalChatSeal($response,(string)jrLocalChatKey($cfg));
                if(strlen($sealed)>8192)
                    throw new DomainException('pilot_answer_size_invalid');
            }
        }
        $q=$pdo->prepare("UPDATE jrei_local_chat_jobs
          SET status=?,request_ciphertext=NULL,response_ciphertext=?,
          lease_secret_sha256=NULL,lease_expires_at=NULL,updated_at=?
          WHERE job_id=? AND status='PILOT_LEASED'");
        $q->execute([$accepted?'PILOT_COMPLETED':'PILOT_BLOCKED',
          $sealed,time(),$id]);
        if($q->rowCount()!==1)throw new DomainException('pilot_completion_conflict');
        $pdo->commit();
        return ['ok'=>true,'accepted'=>$accepted,'privateOnly'=>true,
          'scientificQualityAccepted'=>false,'publicAiActivated'=>false,
          'requestErased'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();throw $e;
    }
}
