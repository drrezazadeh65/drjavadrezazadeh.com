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
    'http://username:password@127.0.0.1:18080/v1/chat/completions'
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
