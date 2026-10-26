import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base='platform/jrei-v5/windows-worker/';
const source=name=>readFileSync(base+name,'utf8');

test('owner connector preserves exact existing local Qwen and worker identity',()=>{
  const ps=source('jrei-connect-existing-node-a.ps1');
  assert.match(ps,/7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5/);
  assert.match(ps,/0dd502d324329cf7be521d8bdb68a677a94f1fa3815f7444dd342778b484f820/);
  assert.match(ps,/http:\/\/127\.0\.0\.1:8081\/v1\/chat\/completions/);
  assert.match(ps,/JREI_EXISTING_NODE_A_IDENTITY_OR_OWNER_APPROVAL_MISSING/);
  assert.match(ps,/JREI_NODE_A_32GB_HARDWARE_REQUIRED/);
  assert.doesNotMatch(ps,/\b(?:New-NetFirewallRule|Invoke-Expression|Set-Content|Add-Content|Set-ItemProperty|Register-ScheduledJob)\b/i);
  assert.doesNotMatch(ps,/jrei_local_public_release_accepted\s*=\s*true/i);
});

test('model and worker tasks are additive, require owner approval, and do not auto-approve public AI',()=>{
  const ps=source('jrei-managed-startup.ps1');
  const connect=source('jrei-connect-existing-node-a.ps1');
  const cmd=source('JREI-CONNECT-EXISTING-NODE-A.cmd');
  assert.match(ps,/\[ValidateSet\('evaluation','chat','model','pilot'\)\]/);
  assert.match(ps,/JREI-Owner-Private-Pilot-Worker/);
  assert.match(ps,/start-pilot/);
  assert.match(ps,/OWNER_PILOT_REQUIRES_REVIEWED_RIGHTS_AND_PUBLIC_CHAT_OFF/);
  assert.match(ps,/-AtLogOn/);
  assert.match(ps,/RestartCount 3/);
  assert.match(connect,/SIGN(?:ED_)?GENERATIVE_WORKER_PENDING_PRIVATE_APPROVAL/);
  assert.match(connect,/BERTINA_PRIVATE_GATES_NOT_CHANGED/);
  assert.match(connect,/EXISTING_SCHEDULED_TASK_DIFFERS_REVIEW_REQUIRED/);
  assert.match(cmd,/choice \/C YN/);
  assert.match(cmd,/jrei-connect-existing-node-a.ps1/);
});

test('pilot waits for loopback model before signed Bertina polling and reconnects',()=>{
  const worker=source('jrei-owner-pilot-worker.mjs');
  const withinLoop=worker.indexOf('while(!stopping){');
  const probe=worker.indexOf('await adapter.probe({signal});');
  const poll=worker.indexOf('await post(config,key,request,identity);');
  assert.ok(withinLoop>=0 && probe>withinLoop && poll>probe);
  assert.match(worker,/modelHealthy=false;/);
  assert.match(worker,/OWNER_PILOT_CONNECTION_UNAVAILABLE_OR_PENDING/);
  assert.match(worker,/if\(e\?\.message==='WORKER_NOT_AUTHORIZED'\)/);
  assert.match(worker,/OWNER_PILOT_PRIVATE_ONLY_NO_PUBLIC_QWEN_RELEASE/);
});

test('Node B connector never substitutes Node A identity or touches signing keys',()=>{
  const ps=source('jrei-connect-existing-node-b.ps1');
  const cmd=source('JREI-CONNECT-EXISTING-NODE-B.cmd');
  assert.match(ps,/7f742039-6c42-4cb7-9bd3-044e30b059f7/);
  assert.doesNotMatch(ps,/28b1c0d2-b833-41cb-97e2-df92c9373de0/);
  assert.match(ps,/JREI_EXISTING_NODE_B_IDENTITY_OR_OWNER_APPROVAL_MISSING/);
  assert.match(ps,/JREI_EXISTING_NODE_B_QWEN_PIN_MISMATCH/);
  assert.match(ps,/JREI_NODE_B_LOCAL_MODEL_MEMORY_BELOW_MINIMUM/);
  assert.match(ps,/JREI-Owner-Private-Pilot-Worker/);
  assert.match(ps,/SIGN(?:ED_)?EVALUATION_CONNECTION_START_REQUESTED/);
  assert.match(ps,/BERTINA_PRIVATE_GATES_NOT_CHANGED/);
  assert.match(cmd,/jrei-connect-existing-node-b.ps1/);
  assert.match(cmd,/choice \/C YN/);
  assert.doesNotMatch(ps,/\b(?:New-NetFirewallRule|Invoke-Expression|Set-Content|Add-Content|Set-ItemProperty|Register-ScheduledJob)\b/i);
});
test('Node B monitoring reads status but never changes keys, tasks or host flags',()=>{
  const status=source('jrei-node-b-stability-status.ps1');
  assert.match(status,/7f742039-6c42-4cb7-9bd3-044e30b059f7/);
  assert.match(status,/JREI_NOT_SIGNED_NODE_B/);
  assert.match(status,/BERTINA_SIGNED_ROUND_TRIP=NOT_TESTED_BY_READ_ONLY_CHECK/);
  for(const task of ['JREI-Owner-Local-Model','JREI-Owner-Outbound-Worker',
    'JREI-Owner-Private-Pilot-Worker'])assert.ok(status.includes(task));
  assert.doesNotMatch(status,/\b(?:Start-ScheduledTask|Stop-ScheduledTask|Register-ScheduledTask|Unregister-ScheduledTask|Set-Content|Add-Content|Set-ItemProperty|New-NetFirewallRule)\b/i);
});
test('pilot retries transient failures with bounded load and never pretends approval',()=>{
  const code=source('jrei-owner-pilot-worker.mjs');
  assert.match(code,/idlePollSeconds=Math\.min\(20,idlePollSeconds\*2\)/);
  assert.match(code,/backoff=Math\.min\(backoff\+1,5\)/);
  assert.match(code,/Math\.min\(60000,5000\*2\*\*\(backoff-1\)\)/);
  assert.match(code,/if\(e\?\.message==='WORKER_NOT_AUTHORIZED'\)/);
  assert.match(code,/OWNER_PILOT_PRIVATE_ONLY_NO_PUBLIC_QWEN_RELEASE/);
});


test('model-free Node A connects its own signed evaluation worker only',()=>{
  const ps=source('jrei-connect-existing-node-a-evaluation.ps1');
  const cmd=source('JREI-CONNECT-NODE-A-EVALUATION.cmd');
  assert.match(ps,/28b1c0d2-b833-41cb-97e2-df92c9373de0/);
  assert.doesNotMatch(ps,/7f742039-6c42-4cb7-9bd3-044e30b059f7/);
  assert.match(ps,/JREI_NODE_A_REGISTERED_SIGNED_IDENTITY_REQUIRED/);
  assert.match(ps,/jrei-worker-key\.dpapi/);
  assert.match(ps,/JREI-Owner-Outbound-Worker/);
  assert.match(ps,/-WorkerMode evaluation/);
  assert.match(ps,/JREI_NODE_A_EVALUATION_ONLY_NO_QWEN_MODEL_INSTALL/);
  assert.match(ps,/JREI_NODE_A_EXISTING_TASK_MISSING_LOGON_TRIGGER/);
  assert.doesNotMatch(ps,/Start-Process|backendExe|modelSha256|8081|JREI-Owner-Local-Model|start-pilot/);
  assert.doesNotMatch(ps,/\b(?:Set-Content|Add-Content|Set-ItemProperty|New-NetFirewallRule|Unregister-ScheduledTask)\b/i);
  assert.match(cmd,/jrei-connect-existing-node-a-evaluation.ps1/);
  assert.match(cmd,/choice \/C YN/);
});
test('Node A status is private, read-only and never starts an inference process',()=>{
  const ps=source('jrei-node-a-evaluation-status.ps1');
  const cmd=source('JREI-CHECK-NODE-A.cmd');
  assert.match(ps,/28b1c0d2-b833-41cb-97e2-df92c9373de0/);
  assert.match(ps,/NODE_A_LIVE_SIGNED_HEARTBEAT=NOT_VERIFIED_BY_LOCAL_READ_ONLY_CHECK/);
  assert.match(ps,/NODE_B_QWEN_AND_PRIVATE_PILOT=UNTOUCHED/);
  assert.match(cmd,/jrei-node-a-evaluation-status.ps1/);
  assert.doesNotMatch(ps,/\b(?:Start-ScheduledTask|Stop-ScheduledTask|Register-ScheduledTask|Unregister-ScheduledTask|Set-Content|Add-Content|New-NetFirewallRule)\b/i);
});
