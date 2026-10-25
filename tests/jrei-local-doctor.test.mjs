import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const doctor=resolve('platform/jrei-v5/windows-worker/jrei-local-doctor.mjs');
function inspect(arg,env={}){
 const child=spawnSync(process.execPath,[doctor,...(arg?[arg]:[])],{
  cwd:resolve('.'),encoding:'utf8',timeout:10000,
  env:{...process.env,...env}
 });
 assert.equal(child.status,0,child.stderr);
 return JSON.parse(child.stdout);
}
test('missing Windows private config stays unavailable without Python',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jrei-doctor-'));
 try{
  const r=inspect(null,{LOCALAPPDATA:dir});
  assert.equal(r.pythonRequired,false);
  assert.equal(r.inferencePerformed,false);
  assert.equal(r.privateConfigPresent,false);
  assert.equal(r.configurationReadyForIndependentVerification,false);
  assert.equal(r.liveLocalModelRunningVerified,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('private config is inspected without exposing private paths or model IDs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jrei-doctor-'));
 try{
  const model=join(dir,'private-model.gguf');
  const backend=join(dir,'llama-server.exe');
  const cfg=join(dir,'private-worker.json');
  writeFileSync(model,'fixture only');
  writeFileSync(backend,'fixture only');
  writeFileSync(cfg,JSON.stringify({localChat:{
   enabled:true,ownerApproved:true,rightsReviewed:true,
   modelRuntimeVerified:true,independentQualityAccepted:true,
   modelId:'SECRET_TEST_MODEL_ID',modelFile:model,backendExe:backend,
   modelSha256:'a'.repeat(64),backendExeSha256:'b'.repeat(64),
   endpoint:'http://127.0.0.1:8080/v1/chat/completions'
  }}));
  const r=inspect(cfg,{LOCALAPPDATA:dir});
  assert.equal(r.localChat.modelFilePresent,true);
  assert.equal(r.localChat.backendExePresent,true);
  assert.equal(r.localChat.loopbackEndpointConfigured,true);
  assert.equal(r.modelHashesVerified,false);
  assert.equal(r.liveLocalModelRunningVerified,false);
  assert.equal(r.configurationReadyForIndependentVerification,process.platform==='win32');
  assert.equal(JSON.stringify(r).includes(dir),false);
  assert.equal(JSON.stringify(r).includes('SECRET_TEST_MODEL_ID'),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('non-loopback endpoint is rejected without network contact',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jrei-doctor-'));
 try{
  const cfg=join(dir,'worker.json');
  writeFileSync(cfg,JSON.stringify({localChat:{endpoint:'http://0.0.0.0:8080/v1/chat/completions'}}));
  const r=inspect(cfg,{LOCALAPPDATA:dir});
  assert.equal(r.localChat.loopbackEndpointConfigured,false);
  assert.equal(r.configurationReadyForIndependentVerification,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
