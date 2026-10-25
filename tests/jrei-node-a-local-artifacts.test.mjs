import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const starter=read('../platform/jrei-v5/windows-worker/jrei-local-model-start.ps1');
const smoke=read('../platform/jrei-v5/windows-worker/jrei-local-synthetic-smoke.ps1');
const staging=read('../platform/jrei-v5/windows-worker/jrei-stage-existing-node-a-qwen.ps1');

test('model launcher is one syntactically bounded ASCII source without duplicated tail',()=>{
  assert.equal([...starter].every(ch=>ch.codePointAt(0)<128),true);
  assert.equal((starter.match(/\$singleInstance\.Dispose\(\)/g)||[]).length,1);
  assert.equal((starter.match(/\$arguments=@\(/g)||[]).length,1);
  assert.equal((starter.match(/LOCAL_MODEL_LOOPBACK_ONLY/g)||[]).length,2);
  assert.match(starter,/\$modelAlias -cnotmatch '\^\[A-Za-z0-9\._:-\]\{1,100\}\$'/);
});

test('staged launch cannot enable public AI and retains pinned model SHA',()=>{
  assert.match(starter,/if\(\$StagingOnly\)/);
  assert.match(starter,/\$c\.enabled -ne \$false/);
  assert.match(starter,/LOCAL_MODEL_STAGING_REQUIRES_PUBLIC_CHAT_OFF/);
  assert.match(starter,/\$c\.independentQualityAccepted -ne \$true/);
  assert.match(starter,/Get-FileHash/);
  assert.match(starter,/'--alias', \$modelAlias/);
  assert.match(starter,/'--host', '127\.0\.0\.1'/);
  assert.match(starter,/'--n-gpu-layers', '0'/);
  assert.match(starter,/LOCAL_MODEL_PORT_ALREADY_IN_USE/);
  assert.doesNotMatch(starter,/Start-ScheduledTask|Set-ScheduledTask|Invoke-WebRequest/);
});

test('owner local smoke stays ASCII and never mutates keys or config',()=>{
  assert.equal([...smoke].every(ch=>ch.codePointAt(0)<128),true);
  assert.match(smoke,/\$faPrompt=\(-join @\(/);
  assert.match(smoke,/content=\$faPrompt/);
  assert.match(smoke,/JREI_SMOKE_OWNER_APPROVAL_REQUIRED/);
  assert.match(smoke,/Get-FileHash/);
  assert.match(smoke,/LOOPBACK_MODEL_HEALTH_OK/);
  assert.match(smoke,/SERVER_ALIAS_MATCHES_JREI/);
  assert.match(smoke,/VISIBLE_FA_COMPLETION/);
  assert.match(smoke,/PUBLIC_ACTIVATION_OFF/);
  assert.doesNotMatch(smoke,/Start-Process|Start-ScheduledTask|New-Item|Set-Content|WriteAllText/);
  assert.doesNotMatch(smoke,/https:\/\//);
});

test('staging script preserves registered node and disables public chat',()=>{
  assert.match(staging,/Set-JreiProperty \$chat 'enabled' \$false/);
  assert.match(staging,/Set-JreiProperty \$chat 'independentQualityAccepted' \$false/);
  assert.match(staging,/NO_WORKER_KEYS_OR_NODE_REGISTRATION_CHANGED/);
});
