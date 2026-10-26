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
