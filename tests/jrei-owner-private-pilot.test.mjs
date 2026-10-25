import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOwnerPilotConfig} from
  '../platform/jrei-v5/windows-worker/jrei-owner-pilot-worker.mjs';
const minimal=()=>({localChat:{
  enabled:false,ownerApproved:true,rightsReviewed:true,
  modelId:'jrei-qwen3-4b-q4km',modelVersion:'qwen3-4b-q4km-20261025',
  modelSha256:'7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5',
  endpoint:'http://127.0.0.1:8081/v1/chat/completions',
  modelTimeoutMs:30000,maxContextTokens:240,
  modelRuntimeVerified:false,independentQualityAccepted:false
}});
test('real Qwen evidence may be rehearsed privately without inventing acceptance',()=>{
 const c=validateOwnerPilotConfig(minimal());
 assert.equal(c.enabled,false);
 assert.equal(c.independentQualityAccepted,false);
 assert.equal(c.modelRuntimeVerified,false);
 assert.equal(c.endpoint,'http://127.0.0.1:8081/v1/chat/completions');
});
test('pilot cannot silently turn on public conversation',()=>{
 const c=minimal();c.localChat.enabled=true;
 assert.throws(()=>validateOwnerPilotConfig(c),
   /OWNER_PILOT_PRIVATE_QWEN_CONFIG_NOT_READY/);
});
test('pilot requires owner approval and reviewed usage rights',()=>{
 for(const key of ['ownerApproved','rightsReviewed']){
  const c=minimal();c.localChat[key]=false;
  assert.throws(()=>validateOwnerPilotConfig(c),
    /OWNER_PILOT_PRIVATE_QWEN_CONFIG_NOT_READY/);
 }
});
test('private worker never opens an externally exposed endpoint',()=>{
 for(const endpoint of [
  'http://0.0.0.0:8081/v1/chat/completions',
  'http://192.168.1.1:8081/v1/chat/completions',
  'https://127.0.0.1:8081/v1/chat/completions',
  'http://127.0.0.1:8081/exec',
  'http://127.0.0.1:8081/v1/chat/completions?key=abc']){
  const c=minimal();c.localChat.endpoint=endpoint;
  assert.throws(()=>validateOwnerPilotConfig(c),/PILOT_LOOPBACK_INVALID/);
 }
});
