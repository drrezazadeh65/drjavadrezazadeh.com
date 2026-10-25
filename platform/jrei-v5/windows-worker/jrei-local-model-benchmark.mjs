/**
 * JREI one-time local model technical benchmark (NOT scientific acceptance).
 *
 * Run on either existing Windows PC after its owner-approved local model has
 * been started: node jrei-local-model-benchmark.mjs --owner-approved
 *   "C:\\private\\jrei-worker-config.json"
 *
 * No Python, download, key access, admin mutation, Bertina call or training.
 * Only the approved localhost llama.cpp HTTP endpoint is contacted.
 * Only finite public synthetic prompts are sent. Responses/config/paths
 * are NEVER logged, saved or returned to a cloud provider.
 */
import {createReadStream,readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,extname,basename} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {createLocalLlamaAdapter} from './jrei-loopback-model-adapter.mjs';

const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9._:-]{1,100}$/;
const safePath=(path,extension)=>typeof path==='string'&&path.length<=600&&
  isAbsolute(path)&&extname(path).toLowerCase()===extension;
const fileExists=p=>{try{return statSync(p).isFile();}catch{return false;}};

export function validateLocalBenchmarkConfig(config){
  if(!config||typeof config!=='object'||Array.isArray(config)||
    !config.localChat||typeof config.localChat!=='object')throw Error('LOCAL_BENCHMARK_CONFIG_INVALID');
  const c=config.localChat;
  if(c.enabled!==true||c.ownerApproved!==true||c.rightsReviewed!==true||
    c.modelRuntimeVerified!==true||c.independentQualityAccepted!==true||
    !ID.test(c.modelId??'')||!ID.test(c.modelVersion??'')||
    !SHA.test(c.modelSha256??'')||!SHA.test(c.backendExeSha256??'')||
    !safePath(c.modelFile,'.gguf')||!safePath(c.backendExe,'.exe')||
    basename(c.backendExe).toLowerCase()!=='llama-server.exe')
    throw Error('LOCAL_BENCHMARK_OWNER_APPROVAL_REQUIRED');
  let endpoint;
  try{endpoint=new URL(c.endpoint);}catch{throw Error('LOCAL_BENCHMARK_LOOPBACK_ONLY');}
  if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||
    endpoint.pathname!=='/v1/chat/completions'||!endpoint.port||
    +endpoint.port<1024||+endpoint.port>65535||endpoint.username||
    endpoint.password||endpoint.search||endpoint.hash)
    throw Error('LOCAL_BENCHMARK_LOOPBACK_ONLY');
  return c;
}

export async function digestFile(path){
  if(!isAbsolute(path)||!fileExists(path))throw Error('LOCAL_BENCHMARK_FILE_MISSING');
  return await new Promise((resolve,reject)=>{
    const h=createHash('sha256');
    const stream=createReadStream(path,{highWaterMark:1024*1024});
    stream.on('data',part=>h.update(part));
    stream.on('error',()=>reject(Error('LOCAL_BENCHMARK_HASH_FAILED')));
    stream.on('end',()=>resolve(h.digest('hex')));
  });
}

export async function benchmark(config,{fetchImpl=globalThis.fetch}={}){
  if(process.platform!=='win32')throw Error('LOCAL_BENCHMARK_WINDOWS_ONLY');
  const c=validateLocalBenchmarkConfig(config);
  if((await digestFile(c.modelFile))!==c.modelSha256||
     (await digestFile(c.backendExe))!==c.backendExeSha256)
    throw Error('LOCAL_BENCHMARK_ARTIFACT_HASH_MISMATCH');
  const adapter=createLocalLlamaAdapter({
    model:c.modelId,modelVersion:c.modelVersion,
    modelArtifactSha256:c.modelSha256,licenceReviewed:true,
    ownerApproved:true,endpoint:c.endpoint,fetchImpl,timeoutMs:30000
  });
  await adapter.probe();
  const prompts=[
    {locale:'en',text:'Reply with a brief greeting in English.'},
    {locale:'fa',text:'فقط یک سلام کوتاه به زبان فارسی بنویس.'}
  ];
  const results=[];
  for(const item of prompts){
    const begin=performance.now();
    const response=await adapter.complete({
      model:c.modelId,messages:[{role:'system',content:'This is a technical synthetic test. No private data or tools.'},
        {role:'user',content:item.text}],maxOutputTokens:64,temperature:0
    });
    const elapsed=Math.round(performance.now()-begin);
    // Output is deliberately discarded; merely generating text is NOT
    // proof of language quality, factual reliability or model ownership.
    results.push({locale:item.locale,
      nonEmpty:response.text.trim().length>0,
      latencyMs:elapsed,
      outputTokenCount:response.usage.outputTokens});
  }
  return {schema:'jr.jrei.local-model-benchmark.v1',pythonRequired:false,
    localhostOnly:true,actualLoopbackInferenceExecuted:true,
    artifactSha256Verified:true,privateContentLogged:false,
    modelQualityScientificallyVerified:false,
    publicReleaseAuthorized:false,results};
}

async function main(){
  if(process.argv.length!==4||process.argv[2]!=='--owner-approved'||
    !isAbsolute(process.argv[3]))throw Error('LOCAL_BENCHMARK_EXPLICIT_OWNER_APPROVAL_REQUIRED');
  const path=process.argv[3];
  if(!fileExists(path)||statSync(path).size>32000)throw Error('LOCAL_BENCHMARK_CONFIG_INVALID');
  let cfg;
  try{cfg=JSON.parse(readFileSync(path,'utf8'));}catch{throw Error('LOCAL_BENCHMARK_CONFIG_INVALID');}
  const result=await benchmark(cfg);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{
    const code=error?.message;
    process.stderr.write('[JREI] '+(
      /^[A-Z0-9_]{4,90}$/.test(code||'')?code:'LOCAL_BENCHMARK_UNAVAILABLE'
    )+'\n');
    process.exitCode=1;
  });
}
