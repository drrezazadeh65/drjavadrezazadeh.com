import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as childProcess from 'node:child_process';
// FINAL-ONLY acceptance tests: written, NOT EXECUTED during source development.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalLlamaAdapter} from
  '../platform/jrei-v5/windows-worker/jrei-loopback-model-adapter.mjs';

const opts={
  id:'local-cpu-mock',
  model:'owner-reviewed-gguf',
  modelVersion:'v1',
  modelArtifactSha256:'a'.repeat(64),
  licenceReviewed:true,ownerApproved:true,
  endpoint:'http://127.0.0.1:18080/v1/chat/completions',
  fetchImpl:async()=>new Response(JSON.stringify({
    choices:[{message:{content:'Unverified answer [E1].'},finish_reason:'stop'}],
    usage:{prompt_tokens:12,completion_tokens:8}
  }),{status:200,headers:{'content-type':'application/json'}})
};
test('non-loopback inference URLs are refused before any network request',()=>{
  for(const endpoint of [
    'https://example.org/v1/chat/completions',
    'http://192.168.1.2:18080/v1/chat/completions',
    'http://127.0.0.1:18080/admin',
    'http://127.0.0.1:18080/v1/chat/completions?key=a',
    'http://'+'username:password@127.0.0.1:18080/v1/chat/completions'
  ])assert.throws(()=>createLocalLlamaAdapter({...opts,endpoint}));
});
test('unapproved models and unverified licences are never invoked',()=>{
  assert.throws(()=>createLocalLlamaAdapter({...opts,ownerApproved:false}));
  assert.throws(()=>createLocalLlamaAdapter({...opts,licenceReviewed:false}));
  assert.throws(()=>createLocalLlamaAdapter({...opts,modelArtifactSha256:'bad'}));
});
test('only allowlisted version, bounded messages and no model-driven tools',async()=>{
  const adapter=createLocalLlamaAdapter(opts);
  await assert.rejects(()=>adapter.complete({
    model:'different-model',messages:[{role:'user',content:'Hi'}],
    maxOutputTokens:300
  }),/UNAPPROVED_MODEL_SELECTION/);
  await assert.rejects(()=>adapter.complete({
    model:opts.model,messages:[{role:'user',content:'Hi'}],
    maxOutputTokens:300,tools:[{name:'exec'}]
  }),/LOCAL_MODEL_TOOL_CALLS_DISABLED/);
  await assert.rejects(()=>adapter.complete({
    model:opts.model,messages:[{role:'user',content:'x'.repeat(20000)}],
    maxOutputTokens:300
  }),/LOCAL_MODEL_MESSAGES_INVALID/);
});
test('local generated answer is an unverified evidence draft, never official',async()=>{
  const result=await createLocalLlamaAdapter(opts).complete({
    model:opts.model,messages:[{role:'user',content:'Question'}],
    maxOutputTokens:300,temperature:0
  });
  assert.equal(result.verified,false);
  assert.equal(result.requiresEvidenceVerification,true);
  assert.deepEqual(result.toolCalls,[]);
  assert.equal(result.source,'LOCAL_MODEL_DRAFT_UNVERIFIED');
  assert.equal(result.text,'Unverified answer [E1].');
});


// Regression gate for the exact Node.js -> Bertina PHP signed request contract.
// All keys and payloads below are ephemeral, synthetic and local to CI.
test('Bertina verifies the real /api worker path with Node Ed25519 signatures',()=>{
  const {readFileSync}=fs;
  const server=readFileSync(new URL('../api/jrei-hybrid-worker.php',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../platform/jrei-v5/windows-worker/jrei-worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/poll:\s*'\/api\/jrei\/v1\/worker\/poll'/);
  assert.match(server,/if\(!sodium_crypto_sign_verify_detached\(\$sig,\$canonical,\$public\)\)/);
  const begin=server.indexOf('    $canonical="jrei-worker-v1\\n"');
  assert.ok(begin>=0,'PHP canonical assignment must remain executable, not hidden inside a comment');
  const hash="hash('sha256',$raw);";
  const end=server.indexOf(hash,begin);
  assert.ok(end>begin,'PHP must include SHA256 of the exact received body');
  const canonicalPhp=server.slice(begin,end+hash.length);
  assert.match(canonicalPhp,/"\\n\/api"\.\$path/);
  assert.doesNotMatch(server.slice(begin-140,begin),/\/\/[^\n]*\\n[^\n]*$/);

  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
  const publicB64=publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64');
  const raw=JSON.stringify({metrics:{status:'ONLINE',cpuPercent:3,ramPercent:25,
    gpuPercent:null,latencyMs:null,modelId:null,modelVersion:null},datasets:[]});
  const timestamp='1792750000',nonce='0123456789abcdef0123456789abcdef';
  const bodyDigest=crypto.createHash('sha256').update(raw).digest('hex');
  const signedPath='/api/jrei/v1/worker/poll';
  const canonical='jrei-worker-v1\nPOST\n'+signedPath+'\n'+timestamp+'\n'+nonce+'\n'+bodyDigest;
  const signature=crypto.sign(null,Buffer.from(canonical),privateKey).toString('hex');
  const runPhp=(dispatchPath,payload)=> {
    const lines=[
      '$verb="POST";','$path='+JSON.stringify(dispatchPath)+';',
      '$timestamp='+JSON.stringify(timestamp)+';',
      '$nonce='+JSON.stringify(nonce)+';',
      '$raw=stream_get_contents(STDIN);',
      canonicalPhp,
      '$public=base64_decode('+JSON.stringify(publicB64)+',true);',
      '$sig=hex2bin('+JSON.stringify(signature)+');',
      'echo sodium_crypto_sign_verify_detached($sig,$canonical,$public)?"VERIFIED":"REJECTED";'
    ];
    return childProcess.spawnSync('php',['-r',lines.join('\n')],{
      input:payload,encoding:'utf8',timeout:5000
    });
  };
  const valid=runPhp('/jrei/v1/worker/poll',raw);
  assert.equal(valid.status,0,valid.stderr);
  assert.equal(valid.stdout,'VERIFIED','Node and PHP must sign the same public HTTP path');
  const changedPath=runPhp('/jrei/v1/worker/complete',raw);
  assert.equal(changedPath.status,0,changedPath.stderr);
  assert.equal(changedPath.stdout,'REJECTED','a signature must never authorize a different API path');
  const changedBody=runPhp('/jrei/v1/worker/poll',raw+' ');
  assert.equal(changedBody.status,0,changedBody.stderr);
  assert.equal(changedBody.stdout,'REJECTED','a signature must never authorize a modified body');
});

test('Windows Worker confines DPAPI execution-policy override to the reviewed helper subprocess',()=>{
  const worker=fs.readFileSync(
    new URL('../platform/jrei-v5/windows-worker/jrei-worker.mjs',import.meta.url),
    'utf8'
  );
  assert.match(worker,/spawnSync\(powershell,[\s\S]{0,180}'-ExecutionPolicy','Bypass',[\s\S]{0,75}'-File',DPAPI/);
  assert.match(worker,/const powershell=join\(resolve\(systemRoot\),'System32',/);
  assert.doesNotMatch(worker,/Set-ExecutionPolicy|powershell\.exe\s*\/c/i);
});
