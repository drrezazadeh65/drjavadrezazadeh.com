/**
 * JREI V5 Windows 11 outbound worker v1 (Node.js 20+).
 *
 * Owner-invoked commands:
 *    node jrei-worker.mjs init
 *    node jrei-worker.mjs show-public
 *    node jrei-worker.mjs start [absolute-private-config.json]
 *    node jrei-worker.mjs start-chat [absolute-private-config.json]
 *    node jrei-worker.mjs start-pilot [absolute-private-config.json]
 *
 * NO inbound listener, no remote shell, no arbitrary tool execution, no
 * unapproved model downloads, no cloud inference, and no filesystem upload.
 * The same program runs independently on each of the two Windows PCs.
 * Source only: no hosting, licence, hardware, model or connection is
 * validated until the single owner-authorized final acceptance.
 */
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, lstat, stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, isAbsolute, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { workerSafeErrorCode } from './jrei-worker-error-code.mjs';

const WORKER_DIR = fileURLToPath(new URL('.', import.meta.url));
const DPAPI = fileURLToPath(new URL('./jrei-windows-dpapi.ps1', import.meta.url));
const TASK = 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION';
const CONTRACT = 'jr.jrei.windows-worker.v1';
const API_ORIGIN = 'https://drjavadrezazadeh.com';
const ENDPOINTS = Object.freeze({
  poll: '/api/jrei/v1/worker/poll',
  heartbeat: '/api/jrei/v1/worker/heartbeat',
  complete: '/api/jrei/v1/worker/complete',
  localChatPoll:'/api/jrei/v1/local-chat/poll',
  localChatComplete:'/api/jrei/v1/local-chat/complete',
  localChatReject:'/api/jrei/v1/local-chat/reject',
  ownerPilotPoll:'/api/jrei/v1/owner-pilot/poll',
  ownerPilotComplete:'/api/jrei/v1/owner-pilot/complete',
  ownerPilotReject:'/api/jrei/v1/owner-pilot/reject',
  pythonNodeHeartbeat:'/api/jrei/v1/python-node/heartbeat',
  pythonCanaryPoll:'/api/jrei/v1/python-canary/poll',
  pythonCanaryComplete:'/api/jrei/v1/python-canary/complete',
  localPoll: '/api/jrei/v1/local-chat/poll',
  localComplete: '/api/jrei/v1/local-chat/complete'
});
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{1,64}$/;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const strictObject=x=>x!==null && typeof x==='object' &&
  !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
const privateDir=()=>{
  if(process.platform!=='win32'||!process.env.LOCALAPPDATA)
    throw Error('WINDOWS_LOCALAPPDATA_REQUIRED');
  return resolve(process.env.LOCALAPPDATA, 'JREI');
};
const keyPath=()=>join(privateDir(), 'jrei-worker-key.dpapi');
const sha256=s=>createHash('sha256').update(s).digest('hex');
const safeCode=workerSafeErrorCode;
const log=(code)=>process.stdout.write('[JREI] '+code+'\n');

function protectKey(mode, file, plaintext='') {
  if(process.platform!=='win32'||!isAbsolute(file)||file.length>600)
    throw Error('WINDOWS_KEY_PATH_REQUIRED');
  // The executable and PowerShell script are fixed by this reviewed source,
  // never received from the job queue, model output or a browser response.
  // Use the trusted Windows executable by its absolute OS location, not
  // PATH lookup, which could select a malicious powershell.exe.
  const systemRoot=process.env.SystemRoot||process.env.windir;
  if(typeof systemRoot!=='string'||!isAbsolute(systemRoot))
    throw Error('WINDOWS_SYSTEM_ROOT_UNAVAILABLE');
  const powershell=join(resolve(systemRoot),'System32',
    'WindowsPowerShell','v1.0','powershell.exe');
  // Windows may default to Restricted execution policy. Permit ONLY this
  // fixed, reviewed DPAPI helper subprocess; do not relax the user's system
  // or CurrentUser policy, nor accept a script path from the network.
  const r=spawnSync(powershell,
    ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
     '-File',DPAPI,'-Mode',mode,'-KeyFile',file],
    {input:plaintext,encoding:'utf8',timeout:12000,maxBuffer:16384,
     windowsHide:true,shell:false});
  if(r.error||r.status!==0)
    throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
  if(mode==='unprotect') {
    if(typeof r.stdout!=='string'||r.stdout.length<60||
       r.stdout.length>8192)return null;
    return r.stdout;
  }
  return null;
}
async function init() {
  const folder=privateDir();
  await mkdir(folder,{recursive:true,mode:0o700});
  const file=keyPath();
  try {
    await lstat(file);
    throw Error('KEY_ALREADY_PRESENT_NEVER_OVERWRITE');
  }catch(e){
    if(e?.code!=='ENOENT')throw e;
  }
  const keys=generateKeyPairSync('ed25519');
  const privatePem=keys.privateKey.export({format:'pem',type:'pkcs8'});
  const pubDer=keys.publicKey.export({format:'der',type:'spki'});
  if(pubDer.length<32)throw Error('ED25519_PUBLIC_KEY_INVALID');
  const publicKeyB64=pubDer.subarray(-32).toString('base64');
  protectKey('protect',file,privatePem);
  log('NEW_INDEPENDENT_NODE_KEY_CREATED');
  process.stdout.write('PUBLIC_KEY_B64='+publicKeyB64+'\n');
  log('PASTE_ONLY_PUBLIC_KEY_IN_SUPER_ADMIN_REGISTER_NODE');
  log('AFTER_REGISTRATION_USE_RETURNED_NODE_ID_IN_PRIVATE_CONFIG');
  log('NEVER_SHARE_PRIVATE_KEY_FILE_OR_DEVICE_IDENTIFIERS');
}

/**
 * Recover the PUBLIC identity for an already initialized Windows computer.
 * Never decrypt or print the private PEM to stdout, never replace an
 * existing DPAPI file, and never export identity to a network endpoint.
 */
async function showPublic() {
  const file=keyPath();
  const st=await lstat(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size<32||st.size>16384)
    throw Error('WINDOWS_DPAPI_KEY_FILE_INVALID');
  const pem=protectKey('unprotect',file);
  if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
  const key=createPrivateKey(pem);
  if(key.asymmetricKeyType!=='ed25519')
    throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
  const pubDer=createPublicKey(key).export({format:'der',type:'spki'});
  if(!Buffer.isBuffer(pubDer)||pubDer.length<32)
    throw Error('ED25519_PUBLIC_KEY_INVALID');
  const publicKeyB64=pubDer.subarray(-32).toString('base64');
  if(!/^[A-Za-z0-9+/]{43}=$/.test(publicKeyB64))
    throw Error('ED25519_PUBLIC_KEY_INVALID');
  log('EXISTING_INDEPENDENT_NODE_KEY_VERIFIED');
  process.stdout.write('PUBLIC_KEY_B64='+publicKeyB64+'\n');
  log('ONLY_THE_PUBLIC_KEY_MAY_BE_USED_FOR_OWNER_REGISTRATION');
}

function validateConfig(config) {
  if(!strictObject(config) || config.protocol!==CONTRACT||
     !UUID.test(config.nodeId??'')||
     config.origin!==API_ORIGIN||!Array.isArray(config.datasets)||
     config.datasets.length>15||!strictObject(config.limits)||
     !Number.isInteger(config.limits.pollSeconds)||
     config.limits.pollSeconds<20||config.limits.pollSeconds>60||
     !Number.isInteger(config.limits.maxJobSeconds)||
     config.limits.maxJobSeconds<15||config.limits.maxJobSeconds>540||
     !Number.isInteger(config.limits.maxRamPercent)||
     config.limits.maxRamPercent<50||config.limits.maxRamPercent>95||
     !Number.isInteger(config.limits.maxCpuPercent)||
     config.limits.maxCpuPercent<50||config.limits.maxCpuPercent>100)
    throw Error('PRIVATE_WORKER_CONFIG_INVALID');
  const ids=new Set();
  for(const d of config.datasets) {
    if(!strictObject(d)||!ID.test(d.id??'')||
       !ID.test(d.evaluationVersion??'')||
       !SHA.test(d.datasetSha256??'')||
       !SHA.test(d.evidenceSha256??'')||
       !SHA.test(d.activePolicySha256??'')||
       typeof d.path!=='string'||!isAbsolute(d.path)||
       d.path.length>500||ids.has(d.id)||
       d.originalSourceReviewed!==true)
      throw Error('APPROVED_PUBLIC_DATASET_CONFIG_INVALID');
    ids.add(d.id);
  }
  return Object.freeze({...config,datasets:config.datasets.map(Object.freeze)});
}

function metrics(state, cpu, latency=null) {
  const total=os.totalmem();
  const memory=total>0?(100*(1-os.freemem()/total)):null;
  return {
    status:state,
    cpuPercent:cpu,
    ramPercent:Number.isFinite(memory)?Number(memory.toFixed(2)):null,
    // Windows AMD RX 580 telemetry and acceleration are NOT assumed.
    // Until a compatible hardware driver/backend is measured: UNKNOWN.
    gpuPercent:null,
    latencyMs:latency,
    modelId:null,modelVersion:null
  };
}
function cpuSnapshot() {
  const cores=os.cpus();
  return cores.reduce((acc,c)=>{
    const t=c.times;
    acc.idle+=t.idle;
    acc.total+=t.user+t.nice+t.sys+t.irq+t.idle;
    return acc;
  },{idle:0,total:0});
}
function cpuPercent(previous,next) {
  const total=next.total-previous.total;
  const active=total-(next.idle-previous.idle);
  if(total<=0)return null;
  return Number(Math.max(0,Math.min(100,active*100/total)).toFixed(2));
}
async function loadConfig(configArg) {
  if(!configArg||!isAbsolute(configArg))
    throw Error('PRIVATE_CONFIG_ABSOLUTE_PATH_REQUIRED');
  const file=resolve(configArg);
  if(file.length>600)throw Error('PRIVATE_CONFIG_PATH_INVALID');
  const st=await lstat(file);
  if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>32000)
    throw Error('PRIVATE_CONFIG_FILE_INVALID');
  const config=JSON.parse(await readFile(file,'utf8'));
  return validateConfig(config);
}

function signedRequest(privateKey,nodeId,path,body) {
  const raw=JSON.stringify(body);
  if(raw.length>6000)throw Error('SIGNED_REQUEST_TOO_LARGE');
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=randomBytes(16).toString('hex');
  const canonical='jrei-worker-v1\nPOST\n'+path+'\n'+timestamp+'\n'+
    nonce+'\n'+sha256(raw);
  const signature=sign(null,Buffer.from(canonical),privateKey).toString('hex');
  return {raw,headers:{
    'Content-Type':'application/json','Accept':'application/json',
    'X-JREI-Node':nodeId,'X-JREI-Time':timestamp,
    'X-JREI-Nonce':nonce,'X-JREI-Signature':signature
  }};
}
async function readBoundedJson(response) {
  const contentType=response.headers.get('content-type')||'';
  const size=Number(response.headers.get('content-length')||0);
  if(!/^application\/json\b/i.test(contentType)||size>16384||
     !response.body)throw Error('SERVER_RESPONSE_CONTRACT_INVALID');
  const reader=response.body.getReader();
  const chunks=[];let count=0;
  try {
    while(true) {
      const {value,done}=await reader.read();
      if(done)break;
      count+=value.byteLength;
      if(count>16384)throw Error('SERVER_RESPONSE_LIMIT');
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!strictObject(data))throw Error('SERVER_RESPONSE_CONTRACT_INVALID');
  return data;
}
async function post(config,key,path,body) {
  if(!Object.values(ENDPOINTS).includes(path))
    throw Error('WORKER_PATH_NOT_ALLOWLISTED');
  const signed=signedRequest(key,config.nodeId,path,body);
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),12000);
  try {
    // Fetch is outbound HTTPS only. Do not follow redirects to another
    // origin, expose the local model port or send private dataset bytes.
    const response=await fetch(API_ORIGIN+path,{
      method:'POST',headers:signed.headers,body:signed.raw,
      redirect:'error',cache:'no-store',signal:ctl.signal
    });
    if(!response.ok)
      throw Error(response.status===403?'WORKER_NOT_AUTHORIZED':
        response.status===409?'WORKER_LEASE_CONFLICT':
        response.status===429?'WORKER_RATE_LIMIT':
        'WORKER_BACKEND_UNAVAILABLE');
    const data=await readBoundedJson(response);
    if(data.ok!==true)throw Error('SERVER_RESPONSE_CONTRACT_INVALID');
    return data;
  } finally {clearTimeout(timer);}
}

async function evaluateLease(job,localDataset,config) {
  if(!strictObject(job)||!UUID.test(job.jobId??'')||
     !UUID.test(job.leaseId??'')||job.taskType!==TASK||
     !localDataset||!ID.test(job.datasetId??'')||
     !SHA.test(job.datasetSha256??'')||
     !SHA.test(job.evidenceSha256??'')||
     job.datasetSha256!==localDataset.datasetSha256||
     job.evidenceSha256!==localDataset.evidenceSha256||
     job.evaluationVersion!==localDataset.evaluationVersion||
     !Number.isSafeInteger(job.leaseExpiresAt)||
     job.leaseExpiresAt<=Date.now()/1000)
    throw Error('UNAPPROVED_OR_EXPIRED_JOB');
  return new Promise((resolveResult,reject)=>{
    // One Node Worker thread per real Windows machine, maxConcurrency=1.
    // The surrounding process can still heartbeat while this CPU job runs.
    const thread=new Worker(new URL('./jrei-eval-task.mjs',import.meta.url),
      {workerData:{job,localDataset},execArgv:[]});
    let settled=false;
    const finish=(err,value)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      // No attempt to requeue a job automatically after unknown outcome.
      void thread.terminate();
      if(err)reject(err);else resolveResult(value);
    };
    const timer=setTimeout(()=>finish(Error('EVALUATION_TIME_BUDGET_EXCEEDED')),
      config.limits.maxJobSeconds*1000);
    thread.once('message',msg=>{
      if(!msg||msg.ok!==true||!strictObject(msg.result))
        finish(Error(msg?.code&&/^[A-Z0-9_]{3,80}$/.test(msg.code)
          ?msg.code:'LOCAL_EVALUATION_REQUIRES_OWNER_REVIEW'));
      else finish(null,msg.result);
    });
    thread.once('error',()=>finish(Error('LOCAL_EVALUATION_THREAD_ERROR')));
    thread.once('exit',code=>{
      if(!settled)finish(Error('LOCAL_EVALUATION_EXIT_UNCONFIRMED'));
    });
  });
}

async function run(configArg) {
  const config=await loadConfig(configArg);
  const pem=protectKey('unprotect',keyPath());
  if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
  const key=createPrivateKey(pem);
  if(key.asymmetricKeyType!=='ed25519')
    throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
  // Only the local DPAPI-encrypted key is used to sign outbound
  // requests. Do not export another PEM copy or log key material.
  log('OUTBOUND_WORKER_SOURCE_STARTED_NOT_MODEL_INFERENCE');
  let stop=false,lastCPU=cpuSnapshot(),backoff=0,latency=null;
  let leaseActive=false,heldLeaseExpiresAt=0;
  const signalStop=()=>{stop=true;log('STOP_REQUESTED');};
  process.once('SIGINT',signalStop);
  process.once('SIGTERM',signalStop);
  const getTelemetry=()=>{
    const next=cpuSnapshot(),cpu=cpuPercent(lastCPU,next);
    lastCPU=next;
    const base=metrics('ONLINE',cpu,latency);
    const overloaded=(base.ramPercent!==null&&
      base.ramPercent>config.limits.maxRamPercent);
    const cpuHeavy=cpu!==null&&cpu>config.limits.maxCpuPercent;
    // CPU or RAM pressure must prevent a new lease. DEGRADED denotes
    // higher network latency, not permission to exceed resource limits.
    return metrics(leaseActive||overloaded||cpuHeavy?'BUSY':
      latency!==null&&latency>4000?'DEGRADED':'ONLINE',cpu,latency);
  };
  while(!stop){
    try {
      const health=getTelemetry();
      const pollStart=Date.now();
      // Each PC advertises ONLY hashes of corpora installed on that PC.
      // Bertina independently checks its approved catalogue before assigning
      // a task; no private documents, filenames or local filesystem paths
      // are transmitted in the signed request.
      const available=config.datasets.map(d=>({
        id:d.id,datasetSha256:d.datasetSha256,
        evidenceSha256:d.evidenceSha256,
        evaluationVersion:d.evaluationVersion
      }));
      const response=await post(config,key,ENDPOINTS.poll,{
        metrics:health,datasets:available
      });
      latency=Math.min(300000,Math.max(0,Date.now()-pollStart));
      backoff=0;
      if(response.job!==null){
        const job=response.job;
        const localDataset=config.datasets.find(d=>d.id===job?.datasetId);
        if(!localDataset||!ID.test(job?.datasetId??'')){
          log('SERVER_QUEUED_DATASET_NOT_LOCALLY_AUTHORIZED');
          // Explicitly do not fabricate a result or transfer the corpus.
          // The original leased job expires into NEEDS_REVIEW.
          await sleep(20000);
          continue;
        }
        leaseActive=true;
        heldLeaseExpiresAt=job.leaseExpiresAt;
        let alive=true,heartbeatInFlight=false;
        const heartbeat=async()=>{
          if(!alive||stop||heartbeatInFlight)return;
          heartbeatInFlight=true;
          try {
            const latest=await post(config,key,ENDPOINTS.heartbeat,{
              jobId:job.jobId,leaseId:job.leaseId,
              metrics:getTelemetry()
            });
            if(Number.isSafeInteger(latest.leaseExpiresAt))
              heldLeaseExpiresAt=latest.leaseExpiresAt;
          }catch{
            // A network timeout is not a license to duplicate/steal work.
            log('HEARTBEAT_UNCONFIRMED');
          }finally{heartbeatInFlight=false;}
        };
        const timer=setInterval(()=>{void heartbeat();},45000);
        try {
          const result=await evaluateLease(job,localDataset,config);
          if(stop||Date.now()/1000>=heldLeaseExpiresAt)
            throw Error('LEASE_EXPIRED_OR_STOPPED');
          alive=false;clearInterval(timer);
          const response=await post(config,key,ENDPOINTS.complete,{
            jobId:job.jobId,leaseId:job.leaseId,result
          });
          if(response.state!=='REVIEW_REQUIRED'||response.autoPublished!==false)
            throw Error('SERVER_COMPLETION_CONTRACT_INVALID');
          log('AGGREGATE_RESULT_STAGED_FOR_OWNER_REVIEW');
        }catch(error){
          alive=false;clearInterval(timer);
          log('JOB_REQUIRES_OWNER_REVIEW_'+safeCode(error));
          // No retry of an uncertain result. The server will classify a
          // timed-out lease as unknown, preserving audit and idempotency.
        }finally{leaseActive=false;}
      }
      if(!stop)await sleep(config.limits.pollSeconds*1000);
    }catch(error){
      log(safeCode(error));
      if(error?.message==='WORKER_NOT_AUTHORIZED') {
        log('CHECK_OWNER_REGISTERED_NODE_AND_PRIVATE_HOST_OFF_SWITCH');
        break;
      }
      backoff=Math.min(backoff+1,6);
      if(!stop)await sleep(Math.min(120000,10000*2**(backoff-1)));
    }
  }
  log('OUTBOUND_WORKER_STOPPED');
}

/**
 * Verify the exact owner-selected GGUF bytes before the active chat worker
 * polls for private prompts. This is a local read-only check, not a claim
 * that the model, runtime, rights or independent quality were approved.
 */
async function verifyLocalModelArtifact(c) {
  if(typeof c?.modelFile!=='string'||!isAbsolute(c.modelFile)||
     c.modelFile.length>500||!c.modelFile.toLowerCase().endsWith('.gguf')||
     !SHA.test(c.modelSha256??''))
    throw Error('LOCAL_MODEL_GGUF_PATH_AND_SHA_REQUIRED');
  // Hugging Face snapshot files can be links to the local blob cache.
  // The content digest, not the filename or symlink metadata, is authoritative.
  const st=await stat(c.modelFile);
  if(!st.isFile()||st.size<1048576||st.size>16000000000)
    throw Error('LOCAL_MODEL_GGUF_FILE_INVALID');
  const digest=createHash('sha256');
  let bytes=0;
  for await(const chunk of createReadStream(c.modelFile,{highWaterMark:1024*1024})){
    bytes+=chunk.length;
    if(bytes>16000000000)throw Error('LOCAL_MODEL_GGUF_TOO_LARGE');
    digest.update(chunk);
  }
  if(bytes!==st.size||digest.digest('hex')!==c.modelSha256)
    throw Error('LOCAL_MODEL_GGUF_SHA256_MISMATCH');
  log('LOCAL_MODEL_GGUF_SHA256_MATCHED_NOT_INFERENCE');
}

/**
 * Source-file approval is insufficient unless the Windows Node process also
 * sees the exact owner-pinned llama.cpp executable. The separate PowerShell
 * model launcher checks this at launch; checking here independently prevents
 * a mismatched/private configuration from leasing real visitor prompts.
 * This does not claim to attest the identity of an already running PID.
 */
async function verifyLocalLlamaExecutable(c) {
  if(typeof c?.backendExe!=='string'||!isAbsolute(c.backendExe)||
     c.backendExe.length>500||
     basename(c.backendExe).toLowerCase()!=='llama-server.exe'||
     !SHA.test(c.backendExeSha256??''))
    throw Error('LOCAL_LLAMA_EXECUTABLE_PATH_AND_SHA_REQUIRED');
  // Compact Windows llama.cpp distributions may use a small PE .exe with
  // shared DLLs. A fixed 128-KiB minimum was rejecting valid hash-pinned
  // launchers even though the owner's separate PS launcher ran them.
  // Follow valid links and attest PE format + the original whole-file SHA.
  const link=await stat(c.backendExe);
  if(!link.isFile()||link.size<1024||link.size>536870912)
    throw Error('LOCAL_LLAMA_EXECUTABLE_FILE_INVALID');
  const handle=await open(c.backendExe,'r');
  try{
    const header=Buffer.alloc(64);
    const first=await handle.read(header,0,64,0);
    if(first.bytesRead!==64||header.toString('ascii',0,2)!=='MZ')
      throw Error('LOCAL_LLAMA_EXECUTABLE_PE_HEADER_INVALID');
    const offset=header.readUInt32LE(0x3c);
    if(offset<64||offset>1048576||offset+4>link.size)
      throw Error('LOCAL_LLAMA_EXECUTABLE_PE_HEADER_INVALID');
    const pe=Buffer.alloc(4);
    const second=await handle.read(pe,0,4,offset);
    if(second.bytesRead!==4||!pe.equals(Buffer.from([80,69,0,0])))
      throw Error('LOCAL_LLAMA_EXECUTABLE_PE_HEADER_INVALID');
  }finally{await handle.close();}
  const digest=createHash('sha256');
  let bytes=0;
  for await(const chunk of createReadStream(c.backendExe,{highWaterMark:1024*1024})){
    bytes+=chunk.length;
    if(bytes>536870912)throw Error('LOCAL_LLAMA_EXECUTABLE_TOO_LARGE');
    digest.update(chunk);
  }
  if(bytes!==link.size||digest.digest('hex')!==c.backendExeSha256)
    throw Error('LOCAL_LLAMA_EXECUTABLE_SHA256_MISMATCH');
  log('LOCAL_LLAMA_EXECUTABLE_SHA256_MATCHED_NOT_RUNTIME_ATTESTATION');
}

const cmd=process.argv[2];
try {
  if(cmd==='init'&&process.argv.length===3)await init();
  else if(cmd==='show-public'&&process.argv.length===3)await showPublic();
  else if(cmd==='start'&&process.argv.length===4)await run(process.argv[3]);
  else if(cmd==='start-chat'&&process.argv.length===4){
    const config=await loadConfig(process.argv[3]);
    const {runLocalChatWorker,validateLocalChatConfig}=await import('./jrei-local-chat-worker.mjs');
    validateLocalChatConfig(config);
    await verifyLocalModelArtifact(config.localChat);
    await verifyLocalLlamaExecutable(config.localChat);
    const pem=protectKey('unprotect',keyPath());
    if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
    const key=createPrivateKey(pem);
    if(key.asymmetricKeyType!=='ed25519')
      throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
    const stop=new AbortController();
    process.once('SIGINT',()=>stop.abort());
    process.once('SIGTERM',()=>stop.abort());
    await runLocalChatWorker(config,key,{post,log,signal:stop.signal});
  }
  else if(cmd==='start-pilot'&&process.argv.length===4){
    const config=await loadConfig(process.argv[3]);
    const {runOwnerPilotWorker,validateOwnerPilotConfig}=
      await import('./jrei-owner-pilot-worker.mjs');
    validateOwnerPilotConfig(config);
    await verifyLocalModelArtifact(config.localChat);
    await verifyLocalLlamaExecutable(config.localChat);
    const pem=protectKey('unprotect',keyPath());
    if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
    const key=createPrivateKey(pem);
    if(key.asymmetricKeyType!=='ed25519')
      throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
    const stop=new AbortController();
    process.once('SIGINT',()=>stop.abort());
    process.once('SIGTERM',()=>stop.abort());
    await runOwnerPilotWorker(config,key,{post,log,signal:stop.signal});
  }
  else if(cmd==='start-python-canary'&&process.argv.length===4){
    // Distinct optional process, no changes to the existing signed Qwen
    // workers, no arbitrary model-generated tool, no key re-enrolment.
    const config=await loadConfig(process.argv[3]);
    const pem=protectKey('unprotect',keyPath());
    if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
    const key=createPrivateKey(pem);
    if(key.asymmetricKeyType!=='ed25519')
      throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
    const {runPythonCanaryWorker}=await import('./jrei-python-canary-worker.mjs');
    const stop=new AbortController();
    process.once('SIGINT',()=>stop.abort());
    process.once('SIGTERM',()=>stop.abort());
    await runPythonCanaryWorker(config,key,{post,log,signal:stop.signal});
  }
  else if(cmd==='start-python-health'&&process.argv.length===4){
    // Existing private config and Ed25519 key are reused unchanged.
    // This is a NEW optional logon process, not an extension of Qwen pilot.
    const config=await loadConfig(process.argv[3]);
    const pem=protectKey('unprotect',keyPath());
    if(!pem)throw Error('WINDOWS_DPAPI_KEY_UNAVAILABLE');
    const key=createPrivateKey(pem);
    if(key.asymmetricKeyType!=='ed25519')
      throw Error('PRIVATE_KEY_TYPE_UNAPPROVED');
    const {runPythonHealthWorker}=await import('./jrei-python-health-worker.mjs');
    const stop=new AbortController();
    process.once('SIGINT',()=>stop.abort());
    process.once('SIGTERM',()=>stop.abort());
    await runPythonHealthWorker(config,key,{post,log,signal:stop.signal});
  }
  else{
    process.stdout.write(
      'JREI: use "node jrei-worker.mjs init" separately on each PC, then\n'+
      '       "node jrei-worker.mjs start C:\\path\\to\\private-config.json"\n'+
      '       "node jrei-worker.mjs start-chat C:\\path\\to\\private-config.json" for separately approved local JREI-LM.\n'+
      'No models or worker APIs are activated by displaying this help.\n'
    );
    if(cmd!==undefined)process.exitCode=2;
  }
}catch(error){
  log(safeCode(error));
  process.exitCode=1;
}
