<?php
declare(strict_types=1);
// Synthetic disposable MariaDB queue test. NO Bertina DB, real model,
// public node, real licence attestation or paid provider is contacted.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-local-chat.php';
function must(bool $x,string $why): void {
 if(!$x){fwrite(STDERR,"FAIL: $why\n");exit(1);}
}
$db=new PDO('mysql:host=127.0.0.1;port=3306;dbname=drjavad1_store;charset=utf8mb4',
  'root',getenv('JREI_FIXTURE_DB_PASSWORD')?:'',
  [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
   PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
must(jrLocalChatSchemaReady($db),'schema');
$model='ci-fake-local-model';$v='ci-v1';$sha=str_repeat('a',64);
$node='11111111-1111-4111-8111-111111111111';$now=time();
$c=['jrei_local_chat_enabled'=>true,'jrei_local_public_release_accepted'=>true,
 'jrei_hybrid_enabled'=>true,'jrei_local_chat_retention_enabled'=>true,
 'operations_cron_master_enabled'=>true,
 'jrei_local_chat_key_b64'=>base64_encode(random_bytes(32)),
 'jrei_ai_approved_passage_retrieval_enabled'=>false];
must(!jrLocalChatReady($db,$c),'not ready without worker and retention');
$db->prepare('INSERT INTO jrei_local_model_registry
 (model_id,model_version,model_artifact_sha256,source_url,licence_code,
 licence_url,quantization,required_ram_mb,status,proposed_at,updated_at,
 weights_installed_verified,runtime_verified,independent_quality_accepted)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
 $model,$v,$sha,'https://example.org/ci-only','Apache-2.0',
 'https://example.org/ci-only-license','Q4_K_M',8192,
 'RIGHTS_REVIEWED',$now,$now,1,1,1]);
$db->prepare('INSERT INTO jrei_hybrid_nodes
 (node_id,provider_type,public_key_b64,display_label,status,permitted_task,
 model_id,model_version,last_seen_at,last_reported_state,created_at,updated_at)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
 $node,'LOCAL_WINDOWS_WORKER',base64_encode(random_bytes(32)),
 'CI FAKE WORKER','ENABLED','REVIEWED_PUBLIC_RETRIEVAL_EVALUATION',
 $model,$v,$now,'ONLINE',$now,$now]);
$db->prepare('INSERT INTO jrei_local_chat_node_authorizations
 (node_id,model_id,model_version,model_artifact_sha256,enabled,updated_at)
 VALUES (?,?,?,?,?,?)')->execute([$node,$model,$v,$sha,1,$now]);
$db->prepare("INSERT INTO operations_cron_jobs
 (job_id,enabled,cadence_seconds,next_due_at,last_state,last_finished_at,updated_at)
 VALUES ('jrei_local_chat_retention',1,300,0,'completed',?,?)")
 ->execute([$now,$now]);
must(jrLocalChatReady($db,$c),'synthetic ready for fixture only');
$work=jrLocalChatEnqueue($db,$c,['message'=>'I need help with a reviewer response for my paper',
 'page'=>['lang'=>'en'],'history'=>[],'providerConsent'=>true]);
must($work['pending']===true&&$work['notCloudApi']===true,'first-party encrypted queue');
$q=$db->prepare('SELECT request_ciphertext FROM jrei_local_chat_jobs WHERE job_id=?');
$q->execute([$work['jobId']]);
$stored=(string)$q->fetchColumn();
must(!str_contains($stored,'reviewer response'),'plaintext never stored');
$claim=['modelId'=>$model,'modelVersion'=>$v,'modelSha256'=>$sha];
$job=jrLocalChatWorkerPoll($db,$c,$node,$claim)['job']??null;
must(is_array($job)&&$job['jobId']===$work['jobId'],'leased to correct fake node');
must(jrLocalChatWorkerPoll($db,$c,$node,$claim)['job']===null,'one lease per node');
$done=jrLocalChatWorkerComplete($db,$c,$node,[...$claim,
 'jobId'=>$job['jobId'],'leaseToken'=>$job['leaseToken'],
 'answer'=>'The published reviewer-response support is available as an optional service [S1].']);
must($done['accepted']===true,'structural source gate accepted synthetic draft');
$reply=jrLocalChatCollect($db,$c,
 ['jobId'=>$work['jobId'],'retrievalToken'=>$work['retrievalToken']]);
must($reply['runtime']==='JREI_LM_LOCAL_WINDOWS'&&$reply['cloudModelInvoked']===false,
 'no cloud provider masquerading as first-party JREI-LM');
must(($reply['links'][0]['url']??'')==='/en/services/reviewer_response/',
 'real bilingual service link survives cited answer');
$q->execute([$work['jobId']]);
must($q->fetchColumn()===false,'one-time result collection deletes queued ciphertext');
must(!jrLocalChatReady($db,[...$c,'operations_cron_master_enabled'=>false]),
 'privacy janitor off blocks new public inference');
echo "JREI-LM disposable MariaDB encrypted chat roundtrip passed\n";
