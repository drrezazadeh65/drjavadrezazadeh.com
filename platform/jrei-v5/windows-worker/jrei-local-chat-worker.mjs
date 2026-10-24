/**
 * JREI-LM FIRST: separate owner-approved generative Windows worker.
 * Uses the existing DPAPI key + signed HTTPS outbound transport provided
 * by jrei-worker.mjs. No inbound ports, cloud APIs, model downloads,
 * shell commands, filesystem upload or training in this module.
 *
 * start-chat is deliberately separate from the evaluation worker process;
 * one local model and one in-flight inference per Windows node.
 */
import {createLocalLlamaAdapter} from './jrei-loopback-model-adapter.mjs';

const ID=/^[A-Za-z0-9._:-]{1,64}$/;
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const TOKEN=/^[a-f0-9]{64}$/;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=Math.min;
const safeReason=error=>{
  const value=typeof error?.message==='string'?error.message:'UNAVAILABLE';
  return /^[A-Z0-9_]{3,90}$/.test(value)?value:'LOCAL_MODEL_TEMPORARILY_UNAVAILABLE';
};
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;

export function validateLocalChatConfig(config){
  if(!isPlain(config)||!isPlain(config.localChat)||config.localChat.enabled!==true)
    throw Error('OWNER_LOCAL_CHAT_NOT_CONFIGURED');
  const c=config.localChat;
  if(!ID.test(c.modelId??'')||!ID.test(c.modelVersion??'')||
     !SHA.test(c.modelSha256??'')||c.rightsReviewed!==true||
     c.ownerApproved!==true||c.modelRuntimeVerified!==true||
     c.independentQualityAccepted!==true||
     typeof c.endpoint!=='string'||
     !Number.isInteger(c.pollSeconds)||c.pollSeconds<2||c.pollSeconds>10||
     !Number.isInteger(c.modelTimeoutMs)||c.modelTimeoutMs<5000||
     c.modelTimeoutMs>35000||
     typeof c.maxContextTokens!=='number'||!Number.isInteger(c.maxContextTokens)||
     c.maxContextTokens<128||c.maxContextTokens>1200)
    throw Error('JREI_LOCAL_MODEL_OWNER_APPROVAL_REQUIRED');
  return Object.freeze({...c});
}

export async function runLocalChatWorker(config,key,{post,log,signal,fetchImpl}={}){
  if(typeof post!=='function'||typeof log!=='function')
    throw Error('LOCAL_CHAT_TRANSPORT_UNAVAILABLE');
  const model=validateLocalChatConfig(config);
  const adapter=createLocalLlamaAdapter({
    id:'jrei-owner-local-chat',model:model.modelId,
    modelVersion:model.modelVersion,modelArtifactSha256:model.modelSha256,
    ownerApproved:true,licenceReviewed:true,endpoint:model.endpoint,
    fetchImpl,timeoutMs:model.modelTimeoutMs
  });
  const pollEndpoint='/api/jrei/v1/local-chat/poll';
  const completeEndpoint='/api/jrei/v1/local-chat/complete';
  let stopping=false,backoff=0;
  const stop=()=>{stopping=true;log('LOCAL_CHAT_STOP_REQUESTED');};
  signal?.addEventListener?.('abort',stop,{once:true});
  log('OWNER_JREI_LOCAL_CHAT_STARTED_NO_CLOUD');
  try{
    while(!stopping){
      try{
        // Original transport signs exact method/path/body with independent
        // Ed25519 key. Model SHA/approval are checked again by Bertina.
        const result=await post(config,key,pollEndpoint,{
          modelId:model.modelId,modelVersion:model.modelVersion,
          modelSha256:model.modelSha256
        });
        if(result?.ok!==true||!Object.hasOwn(result,'job'))
          throw Error('LOCAL_CHAT_POLL_CONTRACT_INVALID');
        backoff=0;
        if(result.job!==null){
          const job=result.job;
          if(!isPlain(job)||!UUID.test(job.jobId??'')||
             !TOKEN.test(job.leaseToken??'')||
             !Number.isSafeInteger(job.expiresAt)||
             !Array.isArray(job.messages)||job.messages.length<2||
             job.messages.length>10)
            throw Error('LOCAL_CHAT_UNTRUSTED_WORK');
          // Never start model work past lease expiry; no unknown retry.
          if(job.expiresAt*1000-Date.now()<3500){
            log('LOCAL_CHAT_LEASE_TOO_SHORT_NO_INFERENCE');
            continue;
          }
          try{
            const draft=await adapter.complete({
              model:model.modelId,
              messages:job.messages,
              maxOutputTokens:model.maxContextTokens,
              temperature:0.2,tools:[],signal
            });
            if(stopping||Date.now()/1000>=job.expiresAt)
              throw Error('LOCAL_CHAT_RESULT_OUTSIDE_LEASE');
            if(draft.requiresEvidenceVerification!==true||
               typeof draft.text!=='string'||draft.text.length<12||
               draft.text.length>4000)
              throw Error('LOCAL_CHAT_MODEL_OUTPUT_NOT_ACCEPTABLE');
            const receipt=await post(config,key,completeEndpoint,{
              jobId:job.jobId,leaseToken:job.leaseToken,
              modelId:model.modelId,modelVersion:model.modelVersion,
              modelSha256:model.modelSha256,answer:draft.text
            });
            if(receipt?.ok!==true||typeof receipt.accepted!=='boolean')
              throw Error('LOCAL_CHAT_COMPLETION_CONTRACT_INVALID');
            log(receipt.accepted?'LOCAL_CHAT_EVIDENCE_GUARD_ACCEPTED_PROVISIONAL':
              'LOCAL_CHAT_EVIDENCE_GUARD_REJECTED');
          }catch(error){
            // The leased job expires to FAILED/unknown. Do not requeue a
            // possibly completed inference or transfer text elsewhere.
            log('LOCAL_CHAT_TASK_'+safeReason(error));
          }
        }
        if(!stopping)await sleep(model.pollSeconds*1000);
      }catch(error){
        log('LOCAL_CHAT_TRANSPORT_'+safeReason(error));
        if(error?.message==='WORKER_NOT_AUTHORIZED'||
           error?.message==='LOCAL_CHAT_MODEL_NOT_APPROVED'){
          log('LOCAL_CHAT_STOPPED_AWAITING_OWNER_AUTHORIZATION');
          break;
        }
        backoff=Math.min(backoff+1,6);
        if(!stopping)await sleep(wait(120000,10000*2**(backoff-1)));
      }
    }
  }finally{
    signal?.removeEventListener?.('abort',stop);
    log('OWNER_JREI_LOCAL_CHAT_STOPPED');
  }
}
