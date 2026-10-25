/**
 * JREI Qwen OWNER-PILOT WORKER — private, synthetic/owner questions only.
 * Does not set public-live, independent-quality, or modelRuntimeVerified flags.
 * Requires Node A's existing Ed25519/DPAPI identity and SHA-pinned local
 * GGUF + llama-server. Polls Bertina outbound over signed HTTPS ONLY.
 */
import {createLocalLlamaAdapter} from './jrei-loopback-model-adapter.mjs';
import {inspectJreiEducationalDraft} from '../jrei-educational-answer-review.mjs';
import {planJreiArithmetic} from '../jrei-deterministic-arithmetic.mjs';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9._:-]{1,64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const delay=(ms,signal)=>new Promise(resolve=>{
  const t=setTimeout(done,ms);
  function done(){clearTimeout(t);signal?.removeEventListener?.('abort',done);resolve();}
  signal?.addEventListener?.('abort',done,{once:true});
});
export function validateOwnerPilotConfig(config){
  const c=config?.localChat;
  if(!c||c.enabled!==false||c.ownerApproved!==true||
     c.rightsReviewed!==true||!ID.test(c.modelId??'')||
     !ID.test(c.modelVersion??'')||!SHA.test(c.modelSha256??'')||
     typeof c.endpoint!=='string'||!Number.isInteger(c.modelTimeoutMs)||
     c.modelTimeoutMs<5000||c.modelTimeoutMs>35000)
    throw Error('OWNER_PILOT_PRIVATE_QWEN_CONFIG_NOT_READY');
  let url;
  try{url=new URL(c.endpoint);}catch{throw Error('PILOT_LOOPBACK_INVALID');}
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||
     url.pathname!=='/v1/chat/completions'||!url.port||
     Number(url.port)<1024||Number(url.port)>65535||
     url.username||url.password||url.search||url.hash)
    throw Error('PILOT_LOOPBACK_INVALID');
  return Object.freeze({...c});
}
export async function runOwnerPilotWorker(config,key,{post,log,signal}={}){
  const c=validateOwnerPilotConfig(config);
  if(typeof post!=='function'||typeof log!=='function')
    throw Error('OWNER_PILOT_SIGNED_TRANSPORT_REQUIRED');
  const adapter=createLocalLlamaAdapter({
    id:'jrei-owner-private-pilot',model:c.modelId,
    modelVersion:c.modelVersion,modelArtifactSha256:c.modelSha256,
    licenceReviewed:true,ownerApproved:true,endpoint:c.endpoint,
    timeoutMs:Math.min(c.modelTimeoutMs,32000),
    disableThinking:true
  });
  const identity={modelId:c.modelId,modelVersion:c.modelVersion,
    modelSha256:c.modelSha256};
  const request='/api/jrei/v1/owner-pilot/poll';
  const completion='/api/jrei/v1/owner-pilot/complete';
  const rejection='/api/jrei/v1/owner-pilot/reject';
  let stopping=signal?.aborted===true;
  const stop=()=>{stopping=true;log('OWNER_PILOT_STOP_REQUESTED');};
  signal?.addEventListener?.('abort',stop,{once:true});
  log('OWNER_PILOT_PRIVATE_ONLY_NO_PUBLIC_QWEN_RELEASE');
  try{
    await adapter.probe({signal});
    log('OWNER_PILOT_LOOPBACK_MODEL_HEALTHY');
    while(!stopping){
      try{
        const result=await post(config,key,request,identity);
        if(result?.ok!==true||!Object.hasOwn(result,'job'))
          throw Error('PILOT_POLL_CONTRACT_INVALID');
        const job=result.job;
        if(job===null){
          await delay(3000,signal);
          continue;
        }
        if(!job||!UUID.test(job.jobId??'')||
           !SHA.test(job.leaseToken??'')||
           !Number.isSafeInteger(job.expiresAt)||
           !Array.isArray(job.messages)||job.messages.length!==2||
           !['fa','en'].includes(job.language)||
           job.messages[0]?.role!=='system'||
           job.messages[1]?.role!=='user'||
           typeof job.messages[1]?.content!=='string'||
           job.messages[1].content.length>650)
          throw Error('PILOT_JOB_CONTRACT_INVALID');
        // No logging of owner question, answer, lease token or model key.
        const ctl=new AbortController();
        const abort=()=>ctl.abort();
        signal?.addEventListener?.('abort',abort,{once:true});
        let answer=null;
        try{
          const question=job.messages[1].content;
          const arithmetic=planJreiArithmetic(question,job.language);
          const generation=arithmetic.eligible?
            {text:arithmetic.answer,stopReason:'stop',
             requiresEvidenceVerification:true}:
            await adapter.complete({
              model:c.modelId,messages:job.messages,
              maxOutputTokens:Math.min(c.maxContextTokens??220,260),
              temperature:0.1,tools:[],signal:ctl.signal
            });
          const quality=inspectJreiEducationalDraft({
            question,answer:generation.text,language:job.language,
            stopReason:generation.stopReason,scope:'PRIVATE_OWNER_PILOT'
          });
          if(!ctl.signal.aborted&&Date.now()/1000<job.expiresAt &&
             generation.requiresEvidenceVerification===true&&
             quality.status!=='REJECT'&&
             typeof generation.text==='string'&&
             generation.text.length<=3500)
            answer=generation.text;
          if(answer===null)log('OWNER_PILOT_DRAFT_WITHHELD');
          else log('OWNER_PILOT_PROVISIONAL_DRAFT_FOR_PRIVATE_REVIEW');
        }catch{
          log('OWNER_PILOT_INFERENCE_FAILED_OR_REJECTED');
        }finally{
          signal?.removeEventListener?.('abort',abort);
        }
        if(stopping||signal?.aborted)break;
        // A failed scientific gate transmits NO answer. Exact single lease;
        // server erases its ciphertext and never reassigns it.
        const endpoint=answer===null?rejection:completion;
        const body={...identity,jobId:job.jobId,leaseToken:job.leaseToken,
          ...(answer===null?{}:{answer})};
        try{
          const receipt=await post(config,key,endpoint,body);
          log(receipt?.ok===true?
             'OWNER_PILOT_SIGNED_PRIVATE_RESULT_RECORDED':
             'OWNER_PILOT_PRIVATE_RESULT_UNCONFIRMED');
        }catch(e){
          if(e?.message==='WORKER_NOT_AUTHORIZED')throw e;
          log('OWNER_PILOT_PRIVATE_RESULT_UNCONFIRMED_NO_RETRY');
        }
      }catch(e){
        if(e?.message==='WORKER_NOT_AUTHORIZED'){
          log('OWNER_PILOT_SIGNED_IDENTITY_NOT_AUTHORIZED');
          break;
        }
        // A transient network failure is not an authorisation to invent
        // identity, expose the local model or leak private text.
        log('OWNER_PILOT_CONNECTION_UNAVAILABLE_OR_PENDING');
        await delay(5000,signal);
      }
    }
  }finally{
    signal?.removeEventListener?.('abort',stop);
    log('OWNER_PILOT_STOPPED_NO_PUBLIC_RELEASE');
  }
}
