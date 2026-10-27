#!/usr/bin/env node
/** Live JREI site monitoring runs unattended every scheduled GitHub cycle.
 * Only public allowlisted GET probes and read-only pinned source filesystem.
 * A repeatedly failed public path may create/update a unique GitHub issue.
 * No cloud credentials, arbitrary URL, databases, private pages, code writes
 * or publication actions. One observation is not proof of systemic health.
 */
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {
  GOV_REPOSITORY,GOV_BRANCH,GOV_ORIGIN,GOV_DOMAINS,GOV_PUBLIC_PATHS,
  reconcileSiteGovernor
} from '../platform/jrei-v5/jrei-autonomous-site-governor.mjs';

const base=resolve(process.cwd());
const safeSHA=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
function checkedFilePath(rel){
 const target=resolve(base,rel);
 if(!target.startsWith(base+sep))throw Error('JREI_GOVERNOR_SOURCE_ESCAPE');
 return target;
}
async function sourceObservation(path){
 try{
   const target=checkedFilePath(path);
   const entry=await stat(target);
   if(entry.isDirectory()){
     return {state:'PRESENT',
       sha256:createHash('sha256').update('JREI_DIRECTORY_PRESENT:'+path).digest('hex')};
   }
   if(!entry.isFile()||entry.size>1_000_000)return {state:'ERROR',sha256:null};
   const bytes=await readFile(target);
   return {state:'PRESENT',sha256:createHash('sha256').update(bytes).digest('hex')};
 }catch(e){
   return {state:e?.code==='ENOENT'?'MISSING':'ERROR',sha256:null};
 }
}
async function probe(path){
 const url=new URL(path,GOV_ORIGIN);
 if(url.origin!==GOV_ORIGIN||!GOV_PUBLIC_PATHS.includes(url.pathname)){
   throw Error('JREI_GOVERNOR_PUBLIC_URL_DENIED');
 }
 let last={state:'UNKNOWN',status:null,latencyMs:null,attempts:0,
   consistentlyFailed:false};
 for(let i=1;i<=2;i++){
   const began=Date.now();
   try{
     const response=await fetch(url,{
       method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),
       headers:{'User-Agent':'JREI-Owner-Site-Governor/1.0 public-health-check',
                'Accept':'text/html,application/xml,text/plain'}
     });
     if(response.body)await response.body.cancel().catch(()=>{});
     const responseMs=Math.min(30000,Date.now()-began);
     const location=response.headers.get('location');
     const redirectSafe=!(response.status>=300&&response.status<400)||
       (location&&new URL(location,url).origin===GOV_ORIGIN);
     if(response.status>=200&&response.status<400&&redirectSafe){
       return {state:'RESPONDING',status:response.status,
         latencyMs:responseMs,attempts:i,consistentlyFailed:false};
     }
     last={state:'UNAVAILABLE',status:response.status,
       latencyMs:responseMs,attempts:i,consistentlyFailed:i===2};
   }catch{
     last={state:'UNAVAILABLE',status:null,
       latencyMs:Math.min(30000,Date.now()-began),attempts:i,
       consistentlyFailed:i===2};
   }
   if(i<2)await new Promise(done=>setTimeout(done,1400));
 }
 return last;
}
const marker='<!-- jrei-site-governor-v1:owner-approved-public-health -->';
const title=path=>'[JREI SITE GOVERNOR] public route '+path;
async function api(method,path,body,token){
 const response=await fetch('https://api.github.com'+path,{
   method,signal:AbortSignal.timeout(12000),
   headers:{'Accept':'application/vnd.github+json',
      'User-Agent':'JREI-Owner-Site-Governor',
      'X-GitHub-Api-Version':'2022-11-28',
      'Authorization':'Bearer '+token,
      ...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
 });
 if(!response.ok)throw Error('GITHUB_ISSUE_SYNC_HTTP_'+response.status);
 return response.status===204?null:response.json();
}
async function synchronizeIssue(path,result,token){
 if(!token)return 'ISSUE_SYNC_NOT_AUTHORIZED';
 // Search only the original repo. Never create issues from model text.
 const q=encodeURIComponent('repo:'+GOV_REPOSITORY+' is:issue in:title "'+title(path)+'"');
 const list=await api('GET','/search/issues?q='+q+'&per_page=20',null,token);
 const existing=(list.items||[]).filter(x=>x.title===title(path)&&
   x.body?.includes(marker));
 if(existing.length>1)return 'DUPLICATE_INCIDENT_REQUIRES_REVIEW';
 const item=existing[0];
 if(result.consistentlyFailed){
   if(item?.state==='open')return 'EXISTING_GITHUB_INCIDENT_OPEN';
   if(item?.state==='closed'){
     await api('PATCH','/repos/'+GOV_REPOSITORY+'/issues/'+item.number,
       {state:'open'},token);
     return 'GITHUB_INCIDENT_REOPENED';
   }
   await api('POST','/repos/'+GOV_REPOSITORY+'/issues',{
     title:title(path),
     body:marker+'\n\nRepeated public GET probe failure (2 attempts in this run) for '+
       GOV_ORIGIN+path+'. Investigate separately. This issue is NOT proof of '+
       'database, worker, or publishing failure; do not automatically deploy.\n\n'+
       'Source: scheduled JREI Site Governor on '+GOV_BRANCH+
       '. HTTP status: '+String(result.status??'UNKNOWN')+
       '. This task is deduplicated by exact issue title and marker.'
   },token);
   return 'GITHUB_INCIDENT_CREATED';
 }
 if(item?.state==='open'&&result.state==='RESPONDING'){
   // Do not close a genuine incident on a single recovered sample:
   // human or a future multi-run recovery policy can confirm closure.
   return 'GITHUB_INCIDENT_OPEN_RECOVERY_NOT_CONFIRMED';
 }
 return 'NO_INCIDENT_ACTION';
}
async function run(){
 const repository=process.env.GITHUB_REPOSITORY;
 const branch=process.env.GITHUB_REF_NAME;
 const sha=process.env.GITHUB_SHA;
 if(repository!==GOV_REPOSITORY||branch!==GOV_BRANCH||!safeSHA(sha)){
   throw Error('JREI_GOVERNOR_CANONICAL_BRANCH_REQUIRED');
 }
 const files={};
 for(const path of [...new Set(Object.values(GOV_DOMAINS).flat())]){
   files[path]=await sourceObservation(path);
 }
 const publicProbes={};
 for(const path of GOV_PUBLIC_PATHS)publicProbes[path]=await probe(path);
 const observation=reconcileSiteGovernor({
   repository,branch,sha,observedAt:Math.floor(Date.now()/1000),
   files,publicProbes
 });
 const dir=join(resolve(process.env.RUNNER_TEMP||tmpdir()),'jrei-site-governor');
 await mkdir(dir,{recursive:true,mode:0o700});
 const issueSync={};
 const token=process.env.GITHUB_TOKEN||'';
 if(process.env.GITHUB_EVENT_NAME==='schedule'||process.env.GITHUB_EVENT_NAME==='workflow_dispatch'){
   for(const path of GOV_PUBLIC_PATHS){
     try{
       issueSync[path]=await synchronizeIssue(path,publicProbes[path],token);
     }catch{
       // GitHub issue sync is distinct from direct public observation.
       issueSync[path]='GITHUB_ISSUE_SYNC_UNKNOWN';
     }
   }
 }
 await writeFile(join(dir,'site-governor-observation.json'),
   JSON.stringify({...observation,githubIssueSync:issueSync},null,2)+'\n',
   {mode:0o600,flag:'w'});
 console.log('[JREI] CANONICAL_SITE_GOVERNOR_OBSERVATION_CAPTURED');
 console.log('[JREI] OBSERVED_PUBLIC_ROUTES='+GOV_PUBLIC_PATHS.length);
 console.log('[JREI] SOURCE_DOMAINS='+Object.keys(GOV_DOMAINS).length);
 console.log('[JREI] REPEATED_PUBLIC_FAILURES='+
   Object.values(publicProbes).filter(x=>x.consistentlyFailed).length);
 console.log('[JREI] PRIVATE_DATABASE_AND_WORKER_HEALTH=UNKNOWN');
 console.log('[JREI] SITE_SOURCE_OR_PRODUCTION_MODIFIED=false');
}
run().catch(e=>{
 const message=String(e?.message||'JREI_GOVERNOR_FAILED');
 console.error(/^[A-Z0-9_]{6,96}$/.test(message)?message:'JREI_GOVERNOR_FAILED');
 process.exitCode=1;
});
