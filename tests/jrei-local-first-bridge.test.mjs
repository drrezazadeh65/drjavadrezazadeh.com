import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('api/index.php');
const queue=read('api/jrei-local-chat.php');
const sql=read('docs/migrations/20261024_jrei_local_inference_queue_mother_mysql.sql');
const js=read('assets/js/assistant.js');
const windows=read('platform/jrei-v5/windows-worker/jrei-worker.mjs');
const model=read('platform/jrei-v5/windows-worker/jrei-loopback-model-adapter.mjs');
const consoleJs=read('assets/js/operations-jrei-hybrid-nodes-v1.js');
const cron=read('api/operations-cron-dispatcher.php');
const worker=read('api/internal/jrei-local-chat-retention-worker.php');
const startup=read('platform/jrei-v5/windows-worker/jrei-managed-startup.ps1');
const config=JSON.parse(read('platform/jrei-v5/windows-worker/jrei-worker-config.example.json'));
test('JREI-LM browser and Windows worker syntax parse independently',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.doesNotThrow(()=>new vm.Script(consoleJs));
});
test('local-first router cannot silently use OpenAI instead',()=>{
  const start=server.indexOf("if(in_array($path,['/assistant/v1/chat'");
  assert.ok(start>0);
  const area=server.slice(start,server.indexOf("if($path==='/assistant/v1/leads'",start));
  assert.ok(area.indexOf("if($local)respond(jrLocalChatEnqueue")<
            area.indexOf("if($optionalCloud)respond(jrAiPublicChat"));
  assert.match(area,/jrei_allow_optional_cloud_public_fallback/);
  assert.match(area,/JREI_LM_LOCAL_WINDOWS/);
  assert.match(server,/JR_JREI_LOCAL_PUBLIC_RELEASE_ACCEPTED/);
  assert.match(server,/JR_JREI_LOCAL_CHAT_KEY_B64/);
});
test('private queue always uses original mother DB and message encryption',()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS jrei_local_chat_jobs/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS jrei_local_chat_node_authorizations/);
  assert.doesNotMatch(sql,/CREATE DATABASE|DROP TABLE|TRUNCATE TABLE|ALTER TABLE|FOREIGN_KEY_CHECKS\s*=/i);
  assert.match(queue,/sodium_crypto_secretbox\(/);
  assert.match(queue,/sodium_crypto_secretbox_open\(/);
  assert.match(queue,/retrieval_secret_sha256/);
  assert.match(queue,/lease_secret_sha256/);
  assert.match(queue,/jrLocalChatNodeApproved/);
  assert.match(queue,/jrAiPublicAnswerGate/);
  assert.match(queue,/jrAiPublicUncitedAnswerGate/);
  assert.match(queue,/jrLocalChatOwnerSetNode/);
  assert.doesNotMatch(queue,/jrAiOpenAiResponses\(/);
  assert.doesNotMatch(queue,/api\.openai\.com/);
});
test('signed Windows node only executes approved local GGUF backend',()=>{
  for(const text of ['start-chat','JREI_LOCAL_MODEL_REAL_INFERENCE_OBSERVED','LOCAL_MODEL_WEIGHT_DIGEST_MISMATCH','LOCAL_CHAT_JOB_INVALID','LOCAL_CHAT_EXPIRED_DRAFT_DISCARDED']) {
    assert.ok(windows.includes(text),text);
  }
  assert.match(windows,/createReadStream\(c\.modelFile/);
  assert.match(windows,/createLocalLlamaAdapter\(/);
  assert.match(windows,/adapter\.complete\(/);
  assert.match(model,/127\.0\.0\.1/);
  assert.doesNotMatch(windows,/api\.openai\.com/);
  assert.doesNotMatch(windows,/createServer\(/);
  assert.equal(config.localChat.enabled,false);
  assert.equal(config.localChat.ownerApproved,false);
});
test('visitor polls owned JREI model queue and can cancel securely',()=>{
  for(const text of ['awaitLocalResult','/api/assistant/v1/local/result',
        '/api/assistant/v1/local/cancel','cancelLocalJob','JREI_LM_LOCAL_WINDOWS']) {
    assert.ok(js.includes(text),text);
  }
  assert.match(js,/pendingLocalJob=\{jobId:data\.jobId,retrievalToken:data\.retrievalToken\}/);
  assert.match(js,/providerMode==='JREI_LM_LOCAL_WINDOWS'/);
  assert.match(server,/jrei_local_result/);
  assert.match(server,/jrei_local_cancel/);
});
test('expired chat text has bounded default-off Cron deletion',()=>{
  assert.match(cron,/jrei_local_chat_retention/);
  assert.match(worker,/PHP_SAPI!=='cli'/);
  assert.match(worker,/JR_JREI_LOCAL_CHAT_RETENTION|jrei_local_chat_retention_enabled/);
  assert.match(worker,/DELETE FROM jrei_local_chat_jobs/);
  assert.doesNotMatch(worker,/DELETE FROM customer_accounts|DELETE FROM commerce_orders/);
  assert.match(startup,/start-chat/);
  assert.match(consoleJs,/jreiLocalGenerative/);
  assert.match(consoleJs,/set_local_chat_node/);
});
