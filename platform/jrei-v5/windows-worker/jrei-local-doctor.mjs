/**
 * JREI local readiness doctor — read-only, Python-free and secret-free.
 * Does not install software, execute inference, contact Bertina, change
 * permissions, or print the DPAPI private key / full private config.
 *
 * node jrei-local-doctor.mjs
 */
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,delimiter} from 'node:path';
import os from 'node:os';

const home=os.homedir();
const local=process.env.LOCALAPPDATA||join(home,'AppData','Local');
const privateDir=join(local,'JREI');
const configPath=join(privateDir,'jrei-worker-config.json');
const isFile=p=>{try{return statSync(p).isFile();}catch{return false;}};
const exePaths=(name)=>[
  ...String(process.env.PATH||'').split(delimiter).filter(Boolean).map(p=>join(p,name)),
  join(local,'Programs','Ollama',name),
  join(process.env.ProgramFiles||'C:\\Program Files','Ollama',name)
];
const availableExe=name=>exePaths(name).some(isFile);
const modelCandidates=()=>{
  const root=join(home,'.cache','huggingface','hub','models--Qwen--Qwen3-4B-GGUF','snapshots');
  try{return readdirSync(root,{withFileTypes:true})
    .filter(x=>x.isDirectory()).map(x=>join(root,x.name,'Qwen3-4B-Q4_K_M.gguf'))
    .filter(isFile);}catch{return [];}
};
const flags=c=>({
  configured:!!c,
  enabled:c?.enabled===true,
  ownerApproved:c?.ownerApproved===true,
  rightsReviewed:c?.rightsReviewed===true,
  modelRuntimeVerified:c?.modelRuntimeVerified===true,
  independentQualityAccepted:c?.independentQualityAccepted===true,
  modelIdConfigured:typeof c?.modelId==='string'&&!c.modelId.startsWith('REPLACE_'),
  modelFilePresent:typeof c?.modelFile==='string'&&isFile(c.modelFile),
  modelShaConfigured:/^[a-f0-9]{64}$/.test(c?.modelSha256||''),
  loopbackEndpointConfigured:typeof c?.endpoint==='string'&&
    /^http:\/\/127\.0\.0\.1:\d+\/v1\/chat\/completions$/.test(c.endpoint)
});
let config=null,configReadable=false;
if(isFile(configPath)){
  try{config=JSON.parse(readFileSync(configPath,'utf8'));configReadable=true;}
  catch{configReadable=false;}
}
const found=modelCandidates();
const report={
  schema:'jr.jrei.local-doctor.v1',
  readOnly:true,installedOrApproved:false,
  windows:process.platform==='win32',
  privateWorkerKeyPresent:isFile(join(privateDir,'jrei-worker-key.dpapi')),
  privateConfigPresent:isFile(configPath),
  privateConfigReadable:configReadable,
  approvedModelOnThisComputer:false,
  knownQwen3GGUFCandidateCount:found.length,
  llamaServerOnPath:availableExe('llama-server.exe'),
  ollamaExecutableFound:availableExe('ollama.exe'),
  localChat:flags(config?.localChat),
  status:'SOURCE_PREFLIGHT_ONLY_NO_INFERENCE_VERIFIED'
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
