import test from 'node:test';
import assert from 'node:assert/strict';
import {runLocalChatWorker,validateLocalChatConfig} from '../platform/jrei-v5/windows-worker/jrei-local-chat-worker.mjs';

const sha='a'.repeat(64);
const config=()=>({
  localChat:{
    enabled:true,modelId:'JREI-LM',modelVersion:'1.0',
    modelSha256:sha,rightsReviewed:true,ownerApproved:true,
    modelRuntimeVerified:true,independentQualityAccepted:true,
    endpoint:'http://127.0.0.1:8080/v1/chat/completions',
    pollSeconds:2,modelTimeoutMs:8000,maxContextTokens:240
  }
});
const job={
  jobId:'11111111-1111-4111-8111-111111111111',
  leaseToken:'b'.repeat(64),expiresAt:Math.floor(Date.now()/1000)+32,
  messages:[
    {role:'system',content:'You are JREI-LM, the locally hosted educational assistant.'},
    {role:'user',content:'What is educational research?'}
  ]
};

test('must obtain explicit owner and independently reviewed model approval',()=>{
  assert.throws(()=>validateLocalChatConfig({...config(),localChat:{
    ...config().localChat,ownerApproved:false
  }}),/APPROVAL_REQUIRED/);
  assert.throws(()=>validateLocalChatConfig({...config(),localChat:{
    ...config().localChat,endpoint:'http://evil.example/v1/chat/completions'
  }}),/MODEL_MUST_USE_EXACT_WINDOWS_LOOPBACK|APPROVAL_REQUIRED/);
  assert.equal(validateLocalChatConfig(config()).modelId,'JREI-LM');
});

test('signed Windows worker invokes ONLY loopback and returns unverified answer to server gate',async()=>{
  const controller=new AbortController(),requests=[],localCalls=[],logs=[];
  const post=async (_cfg,_key,path,body)=>{
    requests.push({path,body});
    if(path==='/api/jrei/v1/local-chat/poll')
      return {ok:true,job};
    if(path==='/api/jrei/v1/local-chat/complete'){
      controller.abort();
      return {ok:true,accepted:true,status:'PROVISIONAL',scienceVerified:false};
    }
    throw Error('FORBIDDEN_PATH');
  };
  const fetchImpl=async (url,init)=>{
    localCalls.push({url:String(url),init});
    return new Response(JSON.stringify({
      choices:[{message:{role:'assistant',content:'Educational research examines learning practices.'},
        finish_reason:'stop'}],
      usage:{prompt_tokens:30,completion_tokens:7}
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  await runLocalChatWorker(config(),null,{
    post,log:s=>logs.push(s),fetchImpl,signal:controller.signal
  });
  assert.deepEqual(requests.map(x=>x.path),[
    '/api/jrei/v1/local-chat/poll','/api/jrei/v1/local-chat/complete'
  ]);
  assert.equal(requests[1].body.jobId,job.jobId);
  assert.equal(requests[1].body.leaseToken,job.leaseToken);
  assert.match(requests[1].body.answer,/Educational research/);
  assert.equal(localCalls.length,1);
  assert.equal(localCalls[0].url,'http://127.0.0.1:8080/v1/chat/completions');
  assert.equal(localCalls[0].init.method,'POST');
  assert.equal(localCalls[0].init.redirect,'error');
  assert.equal(JSON.parse(localCalls[0].init.body).model,'JREI-LM');
  assert.ok(logs.includes('LOCAL_CHAT_EVIDENCE_GUARD_ACCEPTED_PROVISIONAL'));
});

test('model failure does not fabricate a reply, call cloud, or retry a leased job',async()=>{
  const controller=new AbortController(),requests=[],logs=[];
  const post=async (_cfg,_key,path)=>{
    requests.push(path);
    if(path.includes('/poll'))return {ok:true,job:{
      ...job,expiresAt:Math.floor(Date.now()/1000)+32
    }};
    throw Error('UNEXPECTED_COMPLETION');
  };
  const fetchImpl=async ()=>{
    controller.abort();
    throw Error('LOCAL_BACKEND_OFFLINE');
  };
  await runLocalChatWorker(config(),null,{
    post,log:s=>logs.push(s),fetchImpl,signal:controller.signal
  });
  assert.deepEqual(requests,['/api/jrei/v1/local-chat/poll']);
  assert.ok(logs.some(x=>x.startsWith('LOCAL_CHAT_TASK_')));
});
