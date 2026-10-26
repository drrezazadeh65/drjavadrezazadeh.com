/* SOURCE-STAGED ONLY — no tests executed during coding-only work.
 * Guard the first successful private Qwen pilot without implying public AI.
 * This file does not contain any private key, prompt transcript or DB copy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('owner pilot read-only snapshot remains behind original MFA and role',()=>{
 const ops=read('api/operations.php');
 const mfa=ops.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const route=ops.indexOf("'/admin/operations/jrei-owner-pilot'");
 assert.ok(mfa>=0&&route>mfa);
 const code=ops.slice(route,route+1750);
 for(const term of ['SUPER_ADMIN','GET','POST','rateAllowed',
   'jrOwnerPilotOwnerSnapshot','operationsMutationAllowed','csrf_forbidden'])
   assert.ok(code.includes(term),term);
 assert.ok(code.indexOf('jrOwnerPilotOwnerSnapshot') <
           code.indexOf('operationsMutationAllowed'));
});

test('owner snapshot returns only aggregate status, never prompt or secret',()=>{
 const php=read('api/jrei-owner-private-pilot.php');
 const a=php.indexOf('function jrOwnerPilotOwnerSnapshot');
 const b=php.indexOf('/** Opportunistic short-retention cleanup',a);
 assert.ok(a>=0&&b>a);
 const body=php.slice(a,b);
 for(const token of ['jrLocalChatSchemaReady','jrLocalChatKey',
    'COUNT(*)','PILOT_QUEUED','PILOT_LEASED','PILOT_COMPLETED','PILOT_BLOCKED',
    'CURRENT_MOTHER_DB_METADATA_NOT_PROOF_OF_INFERENCE',
    "liveLocalModelHealth","NOT_OBSERVABLE_FROM_BERTINA_DB",
    'scientificQualityAccepted'])
   assert.ok(body.includes(token),token);
 for(const leak of ['SELECT *','request_ciphertext,','response_ciphertext,',
    'retrievalToken','leaseToken','rawAnswer','password','OPENAI_API_KEY',
    "echo $"])
   assert.ok(!body.includes(leak),leak);
 assert.match(body,/durableConversationTranscript'=>false/);
 assert.match(body,/publicAiActivated'=>false/);
});

test('missing schema or aggregate errors never fabricate node/pilot availability',()=>{
 const php=read('api/jrei-owner-private-pilot.php');
 const a=php.indexOf('function jrOwnerPilotOwnerSnapshot');
 const b=php.indexOf('/** Opportunistic short-retention cleanup',a);
 const body=php.slice(a,b);
 assert.match(body,/if\(!\$schemaReady\)return \$snapshot/);
 assert.match(body,/catch\(Throwable \$e\)/);
 assert.match(body,/AGGREGATE_QUERY_UNAVAILABLE/);
 assert.match(body,/registeredEnabledOwnerNodes'\]=null/);
 assert.match(body,/activeQueueCounts'\]=null/);
});

test('bilingual owner UI uses read-only authenticated GET and no automatic job',()=>{
 const code=read('assets/js/operations-jrei-owner-pilot-v1.js');
 assert.match(code,/readPrivateReadiness/);
 assert.match(code,/method:'GET'/);
 assert.match(code,/credentials:'same-origin'/);
 assert.match(code,/OWNER_PRIVATE_SNAPSHOT_CONTRACT_INVALID/);
 assert.match(code,/readPrivateReadiness\)/);
 assert.match(code,/const reviewCases=en\?/);
 assert.match(code,/nothing is sent automatically/);
 assert.match(code,/input\.value=probe\.question/);
 assert.match(code,/benchmarkSelect\.addEventListener\('change'/);
 const begin=code.indexOf('async function readPrivateReadiness()');
 const end=code.indexOf("diagnosticRefresh.addEventListener('click'",begin);
 assert.ok(begin>=0&&end>begin);
 assert.doesNotMatch(code.slice(begin,end),/localStorage|sessionStorage/);
});

test('model private system prompt does not claim its own deployment proof',()=>{
 const code=read('api/jrei-owner-private-pilot.php');
 assert.match(code,/شواهد مستقل سامانه/);
 assert.match(code,/independent system evidence is required/);
 assert.match(code,/status='PILOT_QUEUED'/);
 assert.match(code,/DELETE FROM jrei_local_chat_jobs WHERE job_id=\?/);
});
