import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalLlamaAdapter} from
  '../platform/jrei-v5/windows-worker/jrei-loopback-model-adapter.mjs';
import {validateLocalChatConfig} from
  '../platform/jrei-v5/windows-worker/jrei-local-chat-worker.mjs';

const base={
  model:'jrei-qwen3-4b',modelVersion:'qwen3-4b-q4km-2026',
  modelArtifactSha256:'a'.repeat(64),
  licenceReviewed:true,ownerApproved:true,
  endpoint:'http://127.0.0.1:8081/v1/chat/completions'
};
const sample={model:base.model,maxOutputTokens:80,temperature:0,
  messages:[{role:'user',content:'فقط بنویس: سلام'}]};
const mock=(answer,seen)=>async (url,options)=>{
  assert.equal(new URL(url).hostname,'127.0.0.1');
  const request=JSON.parse(options.body);
  seen.push(request);
  return new Response(JSON.stringify({
    choices:[{message:{content:answer},finish_reason:'stop'}],
    usage:{prompt_tokens:10,completion_tokens:5}
  }),{headers:{'content-type':'application/json'},status:200});
};
test('opt-in disables Qwen thinking in localhost request and surfaces actual Persian text',async()=>{
  const captured=[];
  const adapter=createLocalLlamaAdapter({...base,disableThinking:true,
    fetchImpl:mock('سلام',captured)});
  const response=await adapter.complete(sample);
  assert.equal(captured.length,1);
  assert.deepEqual(captured[0].chat_template_kwargs,{enable_thinking:false});
  assert.equal(response.text,'سلام');
  assert.equal(response.stopReason,'stop');
  assert.equal(response.verified,false);
});
test('other models retain provider-neutral default without Qwen-specific options',async()=>{
  const captured=[];
  const adapter=createLocalLlamaAdapter({...base,fetchImpl:mock('Hello',captured)});
  const response=await adapter.complete(sample);
  assert.equal(response.text,'Hello');
  assert.equal(Object.hasOwn(captured[0],'chat_template_kwargs'),false);
});
test('silent reasoning-only responses are not accepted as successful draft',async()=>{
  const adapter=createLocalLlamaAdapter({...base,disableThinking:true,
    fetchImpl:mock('   ',[])});
  await assert.rejects(adapter.complete(sample),/LOCAL_MODEL_EMPTY_ANSWER/);
});
test('unsafe nonboolean model thinking settings are rejected',()=>{
  assert.throws(()=>createLocalLlamaAdapter({...base,disableThinking:'false'}),
    /LOCAL_MODEL_OWNER_APPROVAL_REQUIRED/);
});
test('JREI chat config only permits an explicit boolean thinking switch',()=>{
  const cfg={localChat:{
    enabled:true,ownerApproved:true,rightsReviewed:true,
    modelRuntimeVerified:true,independentQualityAccepted:true,
    modelId:base.model,modelVersion:base.modelVersion,
    modelSha256:base.modelArtifactSha256,endpoint:base.endpoint,
    pollSeconds:3,idlePollMaxSeconds:20,
    modelTimeoutMs:30000,maxContextTokens:240,disableThinking:true
  }};
  assert.equal(validateLocalChatConfig(cfg).disableThinking,true);
  cfg.localChat.disableThinking='true';
  assert.throws(()=>validateLocalChatConfig(cfg),
    /JREI_LOCAL_MODEL_OWNER_APPROVAL_REQUIRED/);
});
