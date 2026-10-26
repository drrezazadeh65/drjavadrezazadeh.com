import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('public Qwen reuses only existing authenticated owner-pilot worker',()=>{
 const bridge=read('api/jrei-owner-pilot-public-bridge.php');
 const route=read('api/index.php');
 assert.match(route,/jrHybridAuthenticate\(\$pp,'POST',\$path/);
 assert.match(route,/jrOwnerPilotModel\(\$pp,\$node,\$body\)/);
 assert.match(route,/jrOwnerPilotWorkerPoll\(\$pp,\$pc,\$node,\$body\)/);
 assert.match(route,/jrPilotBridgeRecordSignedPoll\(\$pp,\$pc,\$node,\$body\)/);
 assert.match(route,/jrPilotBridgeLive\(\$aiDb,\$aiCfg\)/);
 assert.match(route,/jrPilotBridgeAsk\(\$aiDb,\$aiCfg,\$body\)/);
 assert.match(route,/jrPilotBridgeCollect\(\$aiDb,\$aiCfg,\$body\)/);
 assert.match(bridge,/jrOwnerPilotModel\(\$pdo,\$node,\$model\)/);
 assert.match(bridge,/jrOwnerPilotModel\(\$pdo,\(string\)\$r\['leased_to_node'\],\$v\)/);
});

test('signed freshness is short-lived, scoped and encrypted, not a forged public chat grant',()=>{
 const s=read('api/jrei-owner-pilot-public-bridge.php');
 assert.match(s,/PILOT_BRIDGE_ALIVE/);
 assert.match(s,/\$now\+65/);
 assert.match(s,/p\.expires_at>\?/);
 assert.match(s,/jrLocalChatSeal\(\$raw/);
 assert.match(s,/jrLocalChatOpen\(\$r\['request_ciphertext'\]/);
 assert.match(s,/n\.status='ENABLED'/);
 assert.match(s,/n\.revoked_at IS NULL/);
 assert.doesNotMatch(s,/UPDATE jrei_local_model_registry/);
 assert.doesNotMatch(s,/SET independent_quality_accepted=1/);
 assert.doesNotMatch(s,/INSERT INTO jrei_local_chat_node_authorizations/);
});

test('public queue is bounded, encrypted, one-time and does not store transcripts for training',()=>{
 const s=read('api/jrei-owner-pilot-public-bridge.php');
 for(const needle of ['jrAiPublicTextSensitive($question)',
   'strlen($question)>650','public_bridge_queue_full',
   'jr-owner-pilot-capacity-v1',"$now+95",'PILOT_QUEUED',
   'PILOT_LEASED','PILOT_COMPLETED','PILOT_BLOCKED',
   'jrLocalChatSeal','jrLocalChatOpen','hash(\'sha256\',$token)',
   'DELETE FROM jrei_local_chat_jobs WHERE job_id=?'])
    assert.ok(s.includes(needle),needle);
 assert.match(s,/conversationStoredByJrei'=>false/);
 assert.match(s,/cloudModelInvoked'=>false/);
 assert.match(s,/scientificValidationEstablished'=>false/);
});

test('visitors can submit directly without checkbox, but see local processing notice',()=>{
 const js=read('assets/js/assistant.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/const chatEndpoint=providerMode==='JREI_LM_LOCAL_WINDOWS'/);
 assert.match(js,/providerConsent\.hidden=mode==='JREI_LM_LOCAL_WINDOWS'/);
 assert.match(js,/providerConsent\.checked\?approvedLiveEndpoint/);
 assert.match(js,/Submitting your question sends it to a dedicated JREI computer/);
 assert.match(js,/با ارسال سؤال، متن آن روی رایانهٔ پردازشی اختصاصی JREI/);
 assert.match(js,/consent popup/);
 const server=read('api/jrei-local-chat.php');
 assert.doesNotMatch(server.slice(server.indexOf('function jrLocalChatEnqueue'),
   server.indexOf('function jrLocalChatCollect')),/providerConsent/);
 assert.match(read('api/jrei-ai-assistant-runtime.php'),/\$consent!==true/);
});

test('no third database, shared model key, open socket or synthetic science claim',()=>{
 const bridge=read('api/jrei-owner-pilot-public-bridge.php');
 const route=read('api/index.php');
 for(const disallowed of ['CREATE TABLE','CREATE DATABASE','ALTER TABLE',
   'curl_exec','shell_exec','proc_open','file_put_contents','api.openai.com',
   'localhost:8081','0.0.0.0','fake_response','private_key'])
    assert.ok(!bridge.includes(disallowed),disallowed);
 assert.match(route,/scientificValidationEstablished'=>false/);
 assert.match(route,/jrPilotBridgeIsJob\(\$aiDb,\$body\)/);
});
