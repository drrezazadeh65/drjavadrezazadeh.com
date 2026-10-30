<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-owner-private-pilot.php';

/**
 * Public visitor -> EXISTING signed owner pilot Windows worker.
 * Uses the verified owner-private transport, the SAME encrypted mother-DB
 * queue, the SAME SHA-pinned Qwen and the SAME revocable Ed25519 node.
 *
 * Owner has explicitly authorised PUBLIC GENERAL chat, not scientific
 * certification, model training, OS tools, learner data or cloud inference.
 * This bridge intentionally needs NO new Windows task, secret, model
 * registration, network listener or production DB migration.
 * Zero plaintext transcripts in the mother DB; each result is single-use.
 *
 * The signed pilot performs loopback health before EACH signed poll.
 * Signed poll evidence is represented by a short-lived ENCRYPTED heartbeat
 * row in the existing ephemeral queue (not a fabricated chat approval).
 */
function jrPilotBridgeMarkerId(string $node): string {
    $hex=hash('sha256','jr.jrei.public-pilot-marker.v1:'.$node);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.
        substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20,12);
}
function jrPilotBridgeRecordSignedPoll(PDO $pdo,array $cfg,string $node,
    array $model): void {
    if(!jrOwnerPilotReady($pdo,$cfg)||!jrOwnerPilotModel($pdo,$node,$model))
        return;
    $now=time();
    $ident=[
        'schema'=>'jr.jrei.public-pilot-signed-readiness.v1',
        'modelId'=>(string)$model['modelId'],
        'modelVersion'=>(string)$model['modelVersion'],
        'modelSha256'=>(string)$model['modelSha256']
    ];
    $raw=json_encode($ident,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
    $sealed=jrLocalChatSeal($raw,(string)jrLocalChatKey($cfg));
    // This state cannot be leased as conversation work. No public question,
    // token, private data or full model response is stored in the marker.
    $q=$pdo->prepare("INSERT INTO jrei_local_chat_jobs
       (job_id,retrieval_secret_sha256,status,request_ciphertext,
        leased_to_node,expires_at,created_at,updated_at)
       VALUES (?,?,'PILOT_BRIDGE_ALIVE',?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status='PILOT_BRIDGE_ALIVE',
         request_ciphertext=VALUES(request_ciphertext),
         leased_to_node=VALUES(leased_to_node),
         expires_at=VALUES(expires_at),updated_at=VALUES(updated_at)");
    $q->execute([jrPilotBridgeMarkerId($node),
       hash('sha256','jr-pilot-marker-secret-v1:'.$node),
       $sealed,$node,$now+65,$now,$now]);
    // Only expired marker rows, not user work or its lease, are affected.
    if(random_int(1,35)===1)
        $pdo->prepare("DELETE FROM jrei_local_chat_jobs
          WHERE status='PILOT_BRIDGE_ALIVE' AND expires_at<? LIMIT 10")
          ->execute([$now]);
}
function jrPilotBridgeLive(PDO $pdo,array $cfg): bool {
    if(!jrOwnerPilotReady($pdo,$cfg))return false;
    try {
        $q=$pdo->prepare("SELECT p.request_ciphertext,p.leased_to_node
          FROM jrei_local_chat_jobs p
          JOIN jrei_hybrid_nodes n ON n.node_id=p.leased_to_node
          WHERE p.status='PILOT_BRIDGE_ALIVE' AND p.expires_at>?
            AND n.status='ENABLED' AND n.revoked_at IS NULL
            AND n.provider_type IN
              ('LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER')
            AND n.permitted_task='REVIEWED_PUBLIC_RETRIEVAL_EVALUATION'
          LIMIT 5");
        $q->execute([time()]);
        // Materialize the bounded marker list before nested model registry
        // queries; PDO installations may use unbuffered cursors.
        $markers=$q->fetchAll(PDO::FETCH_ASSOC);
        $key=(string)jrLocalChatKey($cfg);
        foreach($markers as $r){
            if(!is_string($r['request_ciphertext']))continue;
            $raw=jrLocalChatOpen($r['request_ciphertext'],$key);
            $v=json_decode($raw,true,8,JSON_THROW_ON_ERROR);
            if(!is_array($v)||($v['schema']??null)!==
                'jr.jrei.public-pilot-signed-readiness.v1')continue;
            if(jrOwnerPilotModel($pdo,(string)$r['leased_to_node'],$v))
                return true;
        }
    }catch(Throwable $e){return false;}
    return false;
}
function jrPilotBridgeAsk(PDO $pdo,array $cfg,array $body): array {
    if(!jrPilotBridgeLive($pdo,$cfg))
        throw new DomainException('signed_owner_qwen_not_recently_available');
    $question=$body['message']??null;
    $lang=$body['page']['lang']??null;
    $history=$body['history']??[];
    // The existing owner-pilot binary supports one system + one user turn.
    // Do NOT smuggle browser history or unreviewed private records into it.
    if(!in_array($lang,['fa','en'],true)||
       !is_string($question)||trim($question)===''||
       strlen($question)>650||jrAiPublicTextSensitive($question)||
       !is_array($history)||!array_is_list($history)||count($history)>8)
        throw new InvalidArgumentException('public_bridge_question_invalid');
    jrOwnerPilotReap($pdo);
    $lock=false;$now=time();
    try {
        $q=$pdo->query("SELECT GET_LOCK('jr-owner-pilot-capacity-v1',0)");
        $lock=(int)$q->fetchColumn()===1;
        if(!$lock)throw new DomainException('public_bridge_queue_busy');
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_local_chat_jobs
          WHERE status IN ('PILOT_QUEUED','PILOT_LEASED')
            AND expires_at>?");
        $q->execute([$now]);
        if((int)$q->fetchColumn()>=2)
            throw new DomainException('public_bridge_queue_full');
        $system=$lang==='fa'?
          'شما JREI، دستیار عمومی آموزشی سایت هستید. در دو تا چهار جملهٔ کوتاه و کامل به فارسی روان پاسخ بدهید؛ برای پرسش‌های مفهومی، تعریف دقیق و یک مثال روشن بیاورید. از نقل قول یا عدد ساختگی، تضمین قبولی، اطلاعات خصوصی، نویسه چینی، ارائه دستور اجرایی و ادعای خودیادگیری بپرهیزید. اگر نمی‌دانید، صریح بگویید. این مدل هنوز اعتبارسنجی علمی مستقل نشده است.':
          'You are JREI, the public general educational assistant of this website. Reply in two to four concise, complete sentences; explain educational concepts with one concrete example when relevant. Do not invent citations, numbers, admission guarantees, or scientific validation. Avoid private data, tool instructions, and claims of autonomous training; state uncertainty clearly. The model has not been independently scientifically validated.';
        $payload=[
          'schema'=>'jr.jrei.owner-pilot-work.v1',
          'language'=>$lang,
          'scope'=>'PUBLIC_GENERAL_CHAT_NONCERTIFIED',
          'messages'=>[
            ['role'=>'system','content'=>$system],
            ['role'=>'user','content'=>$question]
          ]
        ];
        $raw=json_encode($payload,
            JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $sealed=jrLocalChatSeal($raw,(string)jrLocalChatKey($cfg));
        if(strlen($sealed)>16384)
            throw new DomainException('public_bridge_request_too_large');
        $id=jrHybridNewUuid();$token=bin2hex(random_bytes(32));
        $q=$pdo->prepare("INSERT INTO jrei_local_chat_jobs
          (job_id,retrieval_secret_sha256,status,request_ciphertext,
           expires_at,created_at,updated_at)
          VALUES (?,?,'PILOT_QUEUED',?,?,?,?)");
        $q->execute([$id,hash('sha256',$token),$sealed,
          $now+95,$now,$now]);
        return [
          'ok'=>true,'schema'=>'jr.jrei.local-chat-queued.v1',
          'pending'=>true,'jobId'=>$id,'retrievalToken'=>$token,
          'runtime'=>'JREI_LOCAL_INFERENCE_PENDING',
          'provider'=>'OWNER_WINDOWS_SIGNED_QWEN',
          'notCloudApi'=>true,'retryAfterMilliseconds'=>2200
        ];
    }finally {
        if($lock){
            try{$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');
                $q->execute(['jr-owner-pilot-capacity-v1']);}
            catch(Throwable $e){}
        }
    }
}
function jrPilotBridgeIsJob(PDO $pdo,array $body): bool {
    $id=$body['jobId']??null;$token=$body['retrievalToken']??null;
    if(!jrHybridUuid($id)||!is_string($token)||
       preg_match('/^[a-f0-9]{64}$/D',$token)!==1)return false;
    $q=$pdo->prepare("SELECT status FROM jrei_local_chat_jobs
       WHERE job_id=? AND retrieval_secret_sha256=? LIMIT 1");
    $q->execute([$id,hash('sha256',$token)]);
    return in_array($q->fetchColumn(),[
        'PILOT_QUEUED','PILOT_LEASED',
        'PILOT_COMPLETED','PILOT_BLOCKED'
    ],true);
}
function jrPilotBridgeCollect(PDO $pdo,array $cfg,array $body): array {
    if(!jrOwnerPilotReady($pdo,$cfg))
        throw new DomainException('public_bridge_key_unavailable');
    $id=$body['jobId']??null;$token=$body['retrievalToken']??null;
    if(!jrHybridUuid($id)||!is_string($token)||
       preg_match('/^[a-f0-9]{64}$/D',$token)!==1)
        throw new InvalidArgumentException('public_bridge_result_invalid');
    jrOwnerPilotReap($pdo);
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT retrieval_secret_sha256,status,
          expires_at,response_ciphertext FROM jrei_local_chat_jobs
          WHERE job_id=? FOR UPDATE");
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||
            !hash_equals((string)$row['retrieval_secret_sha256'],
                hash('sha256',$token))||
            !in_array($row['status'],[
                'PILOT_QUEUED','PILOT_LEASED','PILOT_COMPLETED',
                'PILOT_BLOCKED'
            ],true))
            throw new DomainException('public_bridge_result_not_found');
        if(in_array($row['status'],['PILOT_QUEUED','PILOT_LEASED'],true)&&
            (int)$row['expires_at']>=time()){
            $pdo->commit();
            return ['ok'=>true,'pending'=>true,
                'retryAfterMilliseconds'=>2500];
        }
        $data=null;
        if($row['status']==='PILOT_COMPLETED'&&
           is_string($row['response_ciphertext'])){
            $raw=jrLocalChatOpen((string)$row['response_ciphertext'],
               (string)jrLocalChatKey($cfg));
            $data=json_decode($raw,true,8,JSON_THROW_ON_ERROR);
            if(!is_array($data)||($data['schema']??null)!==
                 'jr.jrei.owner-pilot-answer.v1'||
                 !is_string($data['answer']??null))
                throw new DomainException('public_bridge_answer_invalid');
        }
        $pdo->prepare('DELETE FROM jrei_local_chat_jobs WHERE job_id=?')
            ->execute([$id]);
        $pdo->commit();
        if($data===null)
            return ['ok'=>false,'pending'=>false,'unavailable'=>true,
                'reviewRequired'=>$row['status']==='PILOT_BLOCKED'];
        return [
          'ok'=>true,'pending'=>false,
          'schema'=>'jr.jrei.local-chat-answer.v1',
          'answer'=>$data['answer'],'links'=>[],
          'runtime'=>'JREI_LM_LOCAL_WINDOWS',
          'provider'=>'OWNER_WINDOWS_SIGNED_QWEN',
          'scientificValidationEstablished'=>false,
          'conversationStoredByJrei'=>false,
          'cloudModelInvoked'=>false,
          'ephemeralEncryptedQueueUsed'=>true,
          'queuePayloadDeletedOnSuccessfulCollection'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
