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
import os from 'node:os';

const ID=/^[A-Za-z0-9._:-]{1,64}$/;
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const TOKEN=/^[a-f0-9]{64}$/;
const wait=Math.min;
function abortableDelay(ms,signal){
  return new Promise(resolve=>{
    if(signal?.aborted){resolve();return;}
    let timer;
    const finish=()=>{
      clearTimeout(timer);
      signal?.removeEventListener?.('abort',finish);
      resolve();
    };
    timer=setTimeout(finish,ms);
    signal?.addEventListener?.('abort',finish,{once:true});
  });
}
const safeReason=error=>{
  const value=typeof error?.message==='string'?error.message:'UNAVAILABLE';
  return /^[A-Z0-9_]{3,90}$/.test(value)?value:'LOCAL_MODEL_TEMPORARILY_UNAVAILABLE';
};
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;

// Sample actual host CPU time rather than interpreting the owner's
// "training" label as proof of a model-weight training process.
// Local system limits are used to defer NEW inference leases only.
function cpuSnapshot(){
  const cpus=os.cpus();
  if(!cpus.length)return null;
  return cpus.reduce((sum,cpu)=>{
    const t=cpu.times;
    sum.idle+=t.idle;
    sum.total+=t.user+t.nice+t.sys+t.irq+t.idle;
    return sum;
  },{idle:0,total:0});
}
function resourcePressure(previous,limits){
  const snapshot=cpuSnapshot();
  const duration=snapshot&&previous?snapshot.total-previous.total:0;
  const cpuPercent=duration>0?
    100*(1-(snapshot.idle-previous.idle)/duration):null;
  const total=os.totalmem();
  const ramPercent=total>0?100*(1-os.freemem()/total):null;
  const cpuBusy=Number.isInteger(limits?.maxCpuPercent)&&
    cpuPercent!==null&&cpuPercent>limits.maxCpuPercent;
  const ramBusy=Number.isInteger(limits?.maxRamPercent)&&
    ramPercent!==null&&ramPercent>limits.maxRamPercent;
  return {snapshot,busy:cpuBusy||ramBusy};
}

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
     (c.idlePollMaxSeconds!==undefined&&
       (!Number.isInteger(c.idlePollMaxSeconds)||
        c.idlePollMaxSeconds<c.pollSeconds||c.idlePollMaxSeconds>60))||
     typeof c.maxContextTokens!=='number'||!Number.isInteger(c.maxContextTokens)||
     c.maxContextTokens<128||c.maxContextTokens>1200)
    throw Error('JREI_LOCAL_MODEL_OWNER_APPROVAL_REQUIRED');
  // Validate endpoint before even polling a signed job. Never make the
  // local model accessible through a public/private-network hostname.
  let endpoint;
  try{endpoint=new URL(c.endpoint);}catch{throw Error('MODEL_MUST_USE_EXACT_WINDOWS_LOOPBACK');}
  if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||
     endpoint.pathname!=='/v1/chat/completions'||!endpoint.port||
     Number(endpoint.port)<1024||Number(endpoint.port)>65535||
     endpoint.username||endpoint.password||endpoint.search||endpoint.hash)
    throw Error('MODEL_MUST_USE_EXACT_WINDOWS_LOOPBACK');
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
  let stopping=signal?.aborted===true,backoff=0;
  let previousCpu=cpuSnapshot(),resourceBusy=false;
  let idlePollSeconds=model.pollSeconds;
  let backendCheckedAt=0;
  const maxIdlePollSeconds=model.idlePollMaxSeconds??20;
  const stop=()=>{stopping=true;log('LOCAL_CHAT_STOP_REQUESTED');};
  signal?.addEventListener?.('abort',stop,{once:true});
  log('OWNER_JREI_LOCAL_CHAT_STARTED_NO_CLOUD');
  try{
    while(!stopping){
      try{
        // Protect both the web-host queue and the owner's local computer:
        // do not request a NEW lease while RAM/CPU pressure is above
        // the already approved Worker configuration limits.
        const pressure=resourcePressure(previousCpu,config.limits);
        previousCpu=pressure.snapshot;
        if(pressure.busy){
          if(!resourceBusy)log('LOCAL_CHAT_RESOURCE_PRESSURE_DEFERRED');
          resourceBusy=true;
          if(!stopping)await abortableDelay(15000,signal);
          continue;
        }
        if(resourceBusy)log('LOCAL_CHAT_RESOURCE_PRESSURE_CLEARED');
        resourceBusy=false;
        // No signed chat-mode readiness advertisement while the local
        // llama.cpp backend is absent, starting or unhealthy. This is a
        // bounded loopback-only GET; it never sends visitor messages.
        if(Date.now()-backendCheckedAt>=25000){
          await adapter.probe({signal});
          backendCheckedAt=Date.now();
        }
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
          // The server's 45-second node freshness window must remain
          // meaningful during a long (up to 35-second) local inference.
          // A signed poll from an already leased node refreshes the
          // EXISTING node heartbeat but cannot claim a second lease.
          // Cancellation and owner revocation can interrupt local CPU
          // inference without restarting the public queue or retrying the
          // same lease. The per-job signal never escapes this lease.
          const jobController=new AbortController();
          const stopJob=()=>jobController.abort();
          signal?.addEventListener?.('abort',stopJob,{once:true});
          if(stopping||signal?.aborted)stopJob();
          const leaseDeadline=setTimeout(stopJob,
            Math.max(0,job.expiresAt*1000-Date.now()-1500));
          let heartbeatInFlight=false;
          const heartbeat=async()=>{
            if(stopping||heartbeatInFlight)return;
            heartbeatInFlight=true;
            try{
              const status=await post(config,key,pollEndpoint,{
                modelId:model.modelId,modelVersion:model.modelVersion,
                modelSha256:model.modelSha256,heartbeatOnly:true,
                jobId:job.jobId,leaseToken:job.leaseToken
              });
              if(status?.ok!==true||status.job!==null||
                 status.jobActive!==true){
                log('LOCAL_CHAT_HEARTBEAT_REQUIRES_REVIEW');
                jobController.abort();
              }
            }catch(error){
              // Unknown heartbeat outcome aborts only the active lease;
              // explicit owner revocation stops the ENTIRE chat process so
              // it never silently reconnects under withdrawn permission.
              log('LOCAL_CHAT_HEARTBEAT_UNCONFIRMED');
              jobController.abort();
              if(error?.message==='WORKER_NOT_AUTHORIZED'||
                 error?.message==='LOCAL_CHAT_MODEL_NOT_APPROVED'){
                stopping=true;
                log('LOCAL_CHAT_STOPPED_AWAITING_OWNER_AUTHORIZATION');
              }
            }finally{heartbeatInFlight=false;}
          };
          const heartbeatTimer=setInterval(()=>{void heartbeat();},15000);
          try{
            const draft=await adapter.complete({
              model:model.modelId,
              messages:job.messages,
              maxOutputTokens:model.maxContextTokens,
              temperature:0.2,tools:[],signal:jobController.signal
            });
            if(stopping||jobController.signal.aborted||
               Date.now()/1000>=job.expiresAt)
              throw Error('LOCAL_CHAT_RESULT_OUTSIDE_LEASE');
            // Truncated generations or visible internal reasoning are
            // not safe educational answers, even when they mention
            // plausible source labels. The Bertina evidence gate remains
            // the independent final judge of a COMPLETE public draft.
            if(draft.stopReason!=='stop'||
               /<\/?think(?:\s|>)/i.test(draft.text??'')||
               draft.requiresEvidenceVerification!==true||
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
          }finally{
            clearInterval(heartbeatTimer);
            clearTimeout(leaseDeadline);
            jobController.abort();
            signal?.removeEventListener?.('abort',stopJob);
          }
        }
        if(!stopping){
          // Idle polling is progressively reduced, at most once per
          // configured bounded interval. This prevents two always-on PCs
          // generating unnecessary MariaDB writes every few seconds.
          // A leased job resets polling to its owner-approved base rate.
          const delaySeconds=result.job===null?idlePollSeconds:model.pollSeconds;
          idlePollSeconds=result.job===null?
            Math.min(maxIdlePollSeconds,Math.max(model.pollSeconds,idlePollSeconds*2)):
            model.pollSeconds;
          const jitterMs=Math.floor(Math.random()*1000);
          await abortableDelay(delaySeconds*1000+jitterMs,signal);
        }
      }catch(error){
        log('LOCAL_CHAT_TRANSPORT_'+safeReason(error));
        if(error?.message==='WORKER_NOT_AUTHORIZED'||
           error?.message==='LOCAL_CHAT_MODEL_NOT_APPROVED'){
          log('LOCAL_CHAT_STOPPED_AWAITING_OWNER_AUTHORIZATION');
          break;
        }
        idlePollSeconds=model.pollSeconds;
        backendCheckedAt=0;
        backoff=Math.min(backoff+1,6);
        if(!stopping)await abortableDelay(wait(120000,10000*2**(backoff-1)),signal);
      }
    }
  }finally{
    signal?.removeEventListener?.('abort',stop);
    log('OWNER_JREI_LOCAL_CHAT_STOPPED');
  }
}
