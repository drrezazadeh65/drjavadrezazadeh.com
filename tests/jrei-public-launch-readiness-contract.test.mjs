/* SOURCE STAGED: no live credentials, public writes, shell or databases.
 * Static / behavioral release-path QA remains explicitly unexecuted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('public decision is read-only and cannot promote a private pilot',()=>{
 const code=read('api/jrei-local-public-launch.php');
 for(const k of ['publicAiEnabledByThisRead','publicChatEligibleOnServer',
    'ownerPrivatePilotAutomaticallyPromoted','independentLiveConversationAcceptanceRecorded'])
   assert.ok(code.includes(k),k);
 for(const forbidden of ['UPDATE jrei_local_model_registry',
  'INSERT INTO jrei_local_chat_node_authorizations','putenv(',
  'Start-ScheduledTask','set_local_chat_node'])
   assert.ok(!code.includes(forbidden),forbidden);
});

test('all twelve original hard launch gates must still be represented',()=>{
 const src=read('api/jrei-local-public-launch.php');
 const expected=[
  'mother_db_schema','hybrid_private_switch','local_chat_private_switch',
  'owner_public_release','private_queue_encryption',
  'approved_public_evidence_index','privacy_retention_worker',
  'registered_local_model','rights_reviewed_model',
  'independently_accepted_model','authorized_generative_node',
  'recent_signed_generative_poll'
 ];
 for(const term of expected)assert.ok(src.includes("'"+term+"'"),term);
 assert.ok(src.includes("$state=$known[$id]??'UNKNOWN'"));
 assert.ok(src.includes('$staged=empty($effectivePending)&&empty($unknown)'));
});

test('public live PHP endpoint remains independently fail-closed',()=>{
 const chat=read('api/jrei-local-chat.php');
 const ready=chat.slice(chat.indexOf('function jrLocalChatReady'),
  chat.indexOf('/** Fresh server-owned public summaries'));
 for(const k of ['jrei_local_chat_enabled','jrei_local_public_release_accepted',
   'jrei_hybrid_enabled','jrLocalChatRetentionReady',
   'independent_quality_accepted=1','last_signed_chat_seen_at','time()-45'])
   assert.ok(ready.includes(k),k);
 const index=read('api/index.php');
 assert.ok(index.includes('jrLocalChatReady($aiDb,$aiCfg)'));
 assert.match(index,/OFFLINE_GUIDE/);
});

test('launch decision is owner-only and not public capability output',()=>{
 const chat=read('api/jrei-local-chat.php');
 assert.match(chat,/function jrJreiLocalLaunchReadinessAttach/);
 assert.match(chat,/publicLaunchDecision/);
 const start=chat.indexOf('function jrLocalChatOwnerSnapshot');
 const segment=chat.slice(start);
 assert.match(segment,/jrJreiLocalLaunchReadinessAttach/);
 const pub=read('api/index.php');
 const cap=pub.slice(pub.indexOf("if($path==='/assistant/v1/capabilities')"),
   pub.indexOf("if($verb!=='POST')fail('assistant_method_invalid',405)",pub.indexOf("if($path==='/assistant/v1/capabilities')")));
 assert.ok(!cap.includes('publicLaunchDecision'));
});

test('explicit owner public mode never impersonates independent model certification',()=>{
 const php=read('api/jrei-local-chat.php');
 const router=read('api/index.php');
 const worker=read('platform/jrei-v5/windows-worker/jrei-local-chat-worker.mjs');
 const runner=read('platform/jrei-v5/windows-worker/jrei-local-model-start.ps1');
 const launch=read('api/jrei-local-public-launch.php');
 assert.ok(router.includes('JR_JREI_LOCAL_PUBLIC_UNVALIDATED_OWNER_APPROVED'));
 assert.ok(php.includes('function jrLocalChatUnvalidatedPublicOwnerApproval'));
 assert.ok(php.includes('m.independent_quality_accepted=1 OR ?=1'));
 assert.ok(php.includes('jrLocalChatRetentionReady'));
 assert.ok(php.includes('jrLocalChatNodeApproved($pdo,$cfg,'));
 assert.ok(worker.includes('publicUnvalidatedOwnerApproved!==true'));
 assert.ok(runner.includes('$c.publicUnvalidatedOwnerApproved -ne $true'));
 assert.ok(launch.includes('scientificModelValidationEstablished'));
 assert.ok(launch.includes('OWNER_APPROVED_PUBLIC_GENERAL_UNVALIDATED'));
 assert.ok(read('assets/js/assistant.js').includes('اعتبار علمی مستقل آن‌ها تأیید نشده است'));
});

test('Windows preflight is read-only, localhost only, does not turn on chat',()=>{
 const src=read('platform/jrei-v5/windows-worker/jrei-public-launch-preflight.ps1');
 assert.match(src,/READ ONLY/);
 assert.ok(src.includes('127.0.0.1'));
 assert.match(src,/Get-ScheduledTask/);
 assert.match(src,/SERVER_VERIFICATION_REQUIRED/);
 for(const forbidden of ['Start-ScheduledTask','Register-ScheduledTask',
   'Set-Content','Set-Item','Invoke-Expression','modelRuntimeVerified = $true',
   'independentQualityAccepted = $true'])
   assert.ok(!src.includes(forbidden),forbidden);
});
