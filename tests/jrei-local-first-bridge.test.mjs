import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('api/index.php');
const queue=read('api/jrei-local-chat.php');
const sql=read('docs/migrations/20261024_jrei_local_inference_queue_mother_mysql.sql');
const caretaker=read('api/jrei-local-schema-caretaker.php');
const registrySql=read('docs/migrations/20261023_jrei_model_registry_mother_mysql.sql');
const backupSource=read('api/jrei-local-private-backup.php');
const bootstrapCli=read('api/internal/jrei-mother-bootstrap-cli.php');
const builder=read('scripts/build-public-site.mjs');
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
test('signed Windows node checks GGUF digest and starts the separately approved chat worker',()=>{
  for(const term of [
    'start-chat','verifyLocalModelArtifact','LOCAL_MODEL_GGUF_SHA256_MISMATCH',
    'LOCAL_MODEL_GGUF_SHA256_MATCHED_NOT_INFERENCE',
    'runLocalChatWorker','validateLocalChatConfig'
  ])assert.ok(windows.includes(term),term);
  assert.match(windows,/createReadStream\(c\.modelFile/);
  assert.match(windows,/await verifyLocalModelArtifact\(config\.localChat\)/);
  assert.match(windows,/await runLocalChatWorker\(config,key/);
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

test('source-approved schema caretaker includes registry before queue and requires a verified private backup',()=>{
  assert.match(registrySql,/CREATE TABLE IF NOT EXISTS jrei_local_model_registry/);
  assert.match(caretaker,/jrei_local_model_registry/);
  assert.match(caretaker,/20261023_jrei_model_registry_mother_mysql\.sql/);
  assert.match(caretaker,/20261024_jrei_local_inference_queue_mother_mysql\.sql/);
  assert.match(caretaker,/if\(count\(\$statements\)!==3\)/);
  assert.match(caretaker,/'expectedTables'=>3/);
  assert.match(caretaker,/jrei_schema_wrong_database/);
  assert.match(caretaker,/jrJreiLocalSchemaBackupReady\(\$cfg\)/);
  assert.match(caretaker,/GET_LOCK\(\?,0\)/);
  assert.match(caretaker,/jrei_schema_unsafe_ddl/);
  assert.doesNotMatch(caretaker,/CREATE DATABASE\s+drjavad/);
});
test('JREI-LM owner console reports missing schema caretaker switch and configured backup reference without exposing private paths',()=>{
  const snapshot=read('api/jrei-local-chat.php');
  assert.match(snapshot,/'schemaCaretakerEnabled'/);
  assert.match(snapshot,/'schemaCaretakerBackupReferenceConfigured'/);
  assert.match(snapshot,/'schemaCaretakerBackupVerified'=>false/);
  assert.match(consoleJs,/lm\.schemaCaretakerEnabled===true/);
  assert.match(consoleJs,/lm\.schemaCaretakerBackupReferenceConfigured===true/);
  assert.doesNotThrow(()=>new vm.Script(consoleJs));
});

test('JREI CLI owner bootstrap is exactly three additive tables and requires a host-private verified dump',()=>{
  assert.match(bootstrapCli,/--jrei-lm-three-tables/);
  assert.match(bootstrapCli,/PHP_SAPI!=='cli'/);
  assert.match(bootstrapCli,/jrei_local_schema_caretaker_enabled'\]=true/);
  assert.match(bootstrapCli,/jrJreiLocalSchemaApply\(\$pdo,\$config\)/);
  assert.match(bootstrapCli,/jrLocalChatSchemaReady\(\$pdo\)/);
  assert.match(bootstrapCli,/PUBLIC_CHAT_STILL_OFF/);
  assert.match(backupSource,/jrei-private-mother-backups/);
  assert.match(backupSource,/--single-transaction/);
  assert.match(backupSource,/--defaults-extra-file/);
  assert.match(backupSource,/GET_LOCK|JREI|jrei_backup/);
  assert.match(caretaker,/jrJreiPrivateBackupCreate\(\$pdo,\$cfg\)/);
  assert.match(caretaker,/jrJreiLocalSchemaBackupReady\(\$cfg\)/);
  assert.match(caretaker,/!empty\(\$cfg\['jrei_local_schema_backup_file'\]\)/);
  assert.doesNotMatch(bootstrapCli,/DROP TABLE|TRUNCATE TABLE|ALTER TABLE/);
});
test('Bertina release excludes public source SQL but packages fixed vetted SQL as private denied JSON',()=>{
  assert.match(builder,/jrei-reviewed-ddl-v1\.json/);
  assert.match(builder,/jreiSqlMigrations/);
  assert.match(builder,/jreiSqlEntries/);
  assert.match(builder,/jreiSqlDeny/);
  assert.match(builder,/Require\\s\+all\\s\+denied/);
  assert.match(caretaker,/jrei-reviewed-ddl-v1\.json/);
  assert.match(caretaker,/jrei_schema_unsafe_ddl/);
  assert.doesNotMatch(builder,/copy\(.*docs.migrations/);
});

test('Bertina JREI bootstrap builds a local-only verified dump and three reviewed tables',()=>{
  const builder=read('scripts/build-public-site.mjs');
  const bootstrap=read('api/internal/jrei-owner-one-shot-bootstrap.php');
  const caretaker=read('api/jrei-local-schema-caretaker.php');
  assert.match(builder,/jrei-reviewed-ddl-v1\.json/);
  assert.match(builder,/Require\\s\+all\\s\+denied/);
  assert.match(caretaker,/jrei-reviewed-ddl-v1\.json/);
  assert.match(caretaker,/hash_equals\(\$entry\['sha256'\],hash\('sha256',\$entry\['sql'\]\)\)/);
  assert.match(bootstrap,/\-\-owner-approved/);
  assert.match(bootstrap,/PHP_SAPI!=='cli'/);
  assert.match(bootstrap,/proc_open\(\$args,/);
  assert.match(bootstrap,/hash_file\('sha256',\$backup\)/);
  assert.match(bootstrap,/jrJreiLocalSchemaApply\(\$pdo,\$oneShot\)/);
  assert.match(bootstrap,/DB_DUMP_FAILED/);
  assert.match(bootstrap,/BACKUP_RESTORE_NOT_INDEPENDENTLY_TESTED/);
  assert.doesNotMatch(bootstrap,/shell_exec\(|system\(|passthru\(|eval\(/);
  assert.doesNotMatch(bootstrap,/CREATE\s+DATABASE/);
});
