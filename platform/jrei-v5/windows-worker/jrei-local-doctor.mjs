/**
 * Read-only, Python-free JREI Windows model preflight.
 * Never launches binaries, opens ports, hashes multi-GB weights, exposes
 * secrets, initializes new identities or claims model inference has run.
 * Run: node jrei-local-doctor.mjs [absolute-private-config.json]
 */
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,delimiter,isAbsolute,resolve,basename,extname} from 'node:path';
import os from 'node:os';

const home=os.homedir();
const local=process.env.LOCALAPPDATA||join(home,'AppData','Local');
const privateDir=join(local,'JREI');
const defaultConfig=join(privateDir,'jrei-worker-config.json');
const isFile=p=>{try{return typeof p==='string'&&statSync(p).isFile();}catch{return false;}};
const allowPrivatePath=p=>typeof p==='string'&&isAbsolute(p)&&p.length<=600;
const candidateConfig=process.argv[2];
const configPath=candidateConfig===undefined?defaultConfig:
  allowPrivatePath(candidateConfig)?resolve(candidateConfig):null;
const exeCandidates=(name)=>[
  ...String(process.env.PATH||'').split(delimiter).filter(Boolean).map(p=>join(p,name)),
  join(local,'Programs','Ollama',name),
  join(process.env.ProgramFiles||'C:\\Program Files','Ollama',name),
  join(home,'llama.cpp','build','bin','Release',name),
  join(home,'llama.cpp','build','bin',name),
  join(home,'Downloads',name)
];
const unique=x=>[...new Set(x.filter(Boolean))];
const installed=paths=>unique(paths).filter(isFile);
const ggufCandidates=()=>{
  const root=join(home,'.cache','huggingface','hub','models--Qwen--Qwen3-4B-GGUF','snapshots');
  try{return readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory())
    .map(x=>join(root,x.name,'Qwen3-4B-Q4_K_M.gguf')).filter(isFile);}
  catch{return [];}
};
let config=null,configReadable=false;
if(configPath&&isFile(configPath)){
  try{config=JSON.parse(readFileSync(configPath,'utf8'));configReadable=
    config!==null&&typeof config==='object'&&!Array.isArray(config);}
  catch{configReadable=false;}
}
const c=configReadable&&config.localChat&&typeof config.localChat==='object'?
  config.localChat:null;
const modelFile=allowPrivatePath(c?.modelFile)&&
  extname(c.modelFile).toLowerCase()==='.gguf'&&isFile(c.modelFile);
const backendFile=allowPrivatePath(c?.backendExe)&&
  basename(c.backendExe).toLowerCase()==='llama-server.exe'&&
  isFile(c.backendExe);
const endpointOk=typeof c?.endpoint==='string'&&
  /^http:\/\/127\.0\.0\.1:(?:[1-9]\d{3,4})\/v1\/chat\/completions$/.test(c.endpoint)&&
  Number(new URL(c.endpoint).port)>=1024&&Number(new URL(c.endpoint).port)<=65535;
const hashOk=p=>typeof p==='string'&&/^[a-f0-9]{64}$/.test(p);
const flags={
  configured:!!c,enabled:c?.enabled===true,
  ownerApproved:c?.ownerApproved===true,
  rightsReviewed:c?.rightsReviewed===true,
  modelRuntimeVerified:c?.modelRuntimeVerified===true,
  independentQualityAccepted:c?.independentQualityAccepted===true,
  modelIdConfigured:typeof c?.modelId==='string'&&
    c.modelId.length>0&&!c.modelId.startsWith('REPLACE_'),
  modelFilePresent:!!modelFile,
  backendExePresent:!!backendFile,
  modelShaConfigured:hashOk(c?.modelSha256),
  backendExeShaConfigured:hashOk(c?.backendExeSha256),
  loopbackEndpointConfigured:endpointOk
};
const pinnedInputsPresent=flags.modelFilePresent&&flags.backendExePresent&&
  flags.modelShaConfigured&&flags.backendExeShaConfigured;
const approvedToAttemptLaunch=process.platform==='win32'&&
  Object.values(flags).every(Boolean);
// No path, node ID, secret, private config or model identifier is printed.
// Metadata presence is not a verification of hashes, licensing, quality,
// startup, HTTPS node connectivity or actual model-generated responses.
const report={
  schema:'jr.jrei.local-doctor.v2',readOnly:true,pythonRequired:false,
  installationPerformed:false,inferencePerformed:false,
  windows:process.platform==='win32',
  privateWorkerKeyPresent:isFile(join(privateDir,'jrei-worker-key.dpapi')),
  privateConfigPresent:!!configPath&&isFile(configPath),
  privateConfigReadable:configReadable,
  knownQwen3GGUFCandidateCount:ggufCandidates().length,
  llamaServerCandidateCount:installed(exeCandidates('llama-server.exe')).length,
  ollamaExecutableFound:installed(exeCandidates('ollama.exe')).length>0,
  localChat:flags,pinnedInputsPresent,
  configurationReadyForIndependentVerification:approvedToAttemptLaunch,
  modelHashesVerified:false,approvedModelOnThisComputer:false,
  liveLocalModelRunningVerified:false,
  status:'SOURCE_PREFLIGHT_ONLY_NO_INFERENCE_VERIFIED'
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
