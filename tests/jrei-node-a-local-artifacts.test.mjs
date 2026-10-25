import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const starter=read('../platform/jrei-v5/windows-worker/jrei-local-model-start.ps1');
const smoke=read('../platform/jrei-v5/windows-worker/jrei-local-synthetic-smoke.ps1');
const staging=read('../platform/jrei-v5/windows-worker/jrei-stage-existing-node-a-qwen.ps1');

test('approved llama.cpp starter pins JREI model alias and loopback',()=>{
 assert.match(starter,/LOCAL_MODEL_ALIAS_INVALID/);
 assert.match(starter,/'--alias',\s*\$modelAlias/);
 assert.match(starter,/'--host','127\.0\.0\.1'/);
 assert.match(starter,/'--n-gpu-layers','0'/);
 assert.match(starter,/Get-FileHash/);
 assert.match(starter,/LOCAL_MODEL_PRIVATE_APPROVAL_REQUIRED/);
});
test('owner local smoke remains off-site, synthetic, and read-only',()=>{
 assert.equal([...smoke].every(ch=>ch.codePointAt(0)<128),true,
   'PowerShell 5.1 without BOM must not contain raw Persian Unicode literals');
 assert.match(smoke,/\\$faPrompt=\\(-join @\\(/);
 assert.match(smoke,/content=\\$faPrompt/);
 assert.doesNotMatch(smoke,/content='[^']*\\/no_think'/);
 assert.match(smoke,/JREI_SMOKE_OWNER_APPROVAL_REQUIRED/);
 assert.match(smoke,/Get-FileHash/);
 assert.match(smoke,/LOOPBACK_MODEL_HEALTH_OK/);
 assert.match(smoke,/SERVER_ALIAS_MATCHES_JREI/);
 assert.match(smoke,/VISIBLE_FA_COMPLETION/);
 assert.match(smoke,/PUBLIC_ACTIVATION_OFF/);
 assert.match(smoke,/127\.0\.0\.1/);
 assert.doesNotMatch(smoke,/Start-Process|Start-ScheduledTask|New-Item|Set-Content|WriteAllText/);
 assert.doesNotMatch(smoke,/https:\/\//);
});
test('staging never enables generative chat or changes original signing key',()=>{
 assert.match(staging,/Set-JreiProperty \$chat 'enabled' \$false/);
 assert.match(staging,/Set-JreiProperty \$chat 'independentQualityAccepted' \$false/);
 assert.match(staging,/NO_WORKER_KEYS_OR_NODE_REGISTRATION_CHANGED/);
});
