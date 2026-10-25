import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateLocalBenchmarkConfig,digestFile,benchmark} from
  '../platform/jrei-v5/windows-worker/jrei-local-model-benchmark.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const sample=()=>({
 localChat:{enabled:true,ownerApproved:true,rightsReviewed:true,
  modelRuntimeVerified:true,independentQualityAccepted:true,
  modelId:'qwen-test',modelVersion:'test-v1',modelSha256:'a'.repeat(64),
  backendExeSha256:'b'.repeat(64),modelFile:'/private/model.gguf',
  backendExe:'/private/llama-server.exe',
  endpoint:'http://127.0.0.1:8080/v1/chat/completions'}
});
test('technical benchmark requires owner and licence review, but not prior scientific approval',()=>{
 const x=sample();
 for(const flag of ['ownerApproved','rightsReviewed']){
  const y=structuredClone(x);y.localChat[flag]=false;
  assert.throws(()=>validateLocalBenchmarkConfig(y),/OWNER_APPROVAL_REQUIRED/);
 }
 const prerelease=structuredClone(x);
 for(const flag of ['enabled','modelRuntimeVerified','independentQualityAccepted'])
  prerelease.localChat[flag]=false;
 assert.equal(validateLocalBenchmarkConfig(prerelease).modelId,'qwen-test');
 prerelease.localChat.disableThinking=true;
 assert.equal(validateLocalBenchmarkConfig(prerelease).disableThinking,true);
 prerelease.localChat.disableThinking='true';
 assert.throws(()=>validateLocalBenchmarkConfig(prerelease),/OWNER_APPROVAL_REQUIRED/);
});
test('benchmark strictly rejects non-loopback endpoints',()=>{
 for(const url of ['http://localhost:8080/v1/chat/completions',
  'http://0.0.0.0:8080/v1/chat/completions',
  'https://127.0.0.1:8080/v1/chat/completions',
  'http://127.0.0.1:8080/health']){
  const x=sample();x.localChat.endpoint=url;
  assert.throws(()=>validateLocalBenchmarkConfig(x),/LOOPBACK_ONLY/);
 }
});
test('file digest is streaming, matches SHA and does not expose bytes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jrei-bench-'));
 try{
  const file=join(dir,'fixture.gguf');
  writeFileSync(file,'nonpersonal fake fixture');
  assert.equal(await digestFile(file),hash('nonpersonal fake fixture'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('unapproved environments cannot initiate benchmark network calls',async()=>{
 let calls=0;
 await assert.rejects(benchmark(sample(),{fetchImpl:()=>{calls++;throw Error('NETWORK_CALLED')}}),
  /WINDOWS_ONLY|FILE_MISSING/);
 assert.equal(calls,0);
});
