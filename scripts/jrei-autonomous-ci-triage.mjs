#!/usr/bin/env node
/**
 * Independent JREI agent: inspect CI evidence at canonical HEAD and
 * maintain deduplicated GitHub failure issues without user commands.
 * Autonomous observation and incident management are NOT code repair.
 * No production writes, secrets disclosure, Git changes or deployment.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {REPO,BRANCH,evaluateCI,incidentTitle} from
  '../platform/jrei-v5/jrei-ci-incident-contract.mjs';

const base='https://api.github.com';
const token=process.env.GITHUB_TOKEN||'';
const head=process.env.GITHUB_SHA||'';
const retry=Number(process.env.GITHUB_RUN_ATTEMPT||1);
const headers={
 'Accept':'application/vnd.github+json',
 'X-GitHub-Api-Version':'2022-11-28',
 'User-Agent':'JREI-Autonomous-CI-Triage/1.0',
 'Authorization':'Bearer '+token,
};
function pathAllowed(method,path){
 const basePath='/repos/'+REPO;
 return method==='GET'
   ? (path===basePath+'/branches/migration/bertina-linux6'||
      path===basePath+'/actions/runs?branch=migration%2Fbertina-linux6&per_page=100'||
      /^\/repos\/drrezazadeh65\/drjavadrezazadeh\.com\/issues\?state=all&per_page=100&page=[1-5]$/.test(path))
   : (method==='POST'&&path===basePath+'/issues')||
      (method==='PATCH'&&/^\/repos\/drrezazadeh65\/drjavadrezazadeh\.com\/issues\/[1-9][0-9]*$/.test(path));
}
async function github(method,path,body){
 if(!pathAllowed(method,path))throw Error('CI_TRIAGE_UNAUTHORIZED_API_PATH');
 const res=await fetch(base+path,{
   method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)
 });
 if(!res.ok)throw Error('CI_TRIAGE_GITHUB_HTTP_'+res.status);
 const bytes=await res.text();
 if(bytes.length>800000)throw Error('CI_TRIAGE_RESPONSE_TOO_LARGE');
 return bytes?JSON.parse(bytes):null;
}
async function fetchIssues(){
 const all=[];
 for(let page=1;page<=5;page++){
   const part=await github('GET','/repos/'+REPO+
     '/issues?state=all&per_page=100&page='+page);
   if(!Array.isArray(part))throw Error('CI_TRIAGE_ISSUE_SHAPE_INVALID');
   all.push(...part);
   if(part.length<100)return all;
 }
 throw Error('CI_TRIAGE_ISSUE_PAGINATION_INCOMPLETE');
}
function issueContent(name,runId,sha,verdict){
 const url='https://github.com/'+REPO+'/actions/runs/'+runId;
 return [
   'JREI has autonomously detected a reproducible CI incident at canonical HEAD.',
   '',
   '**Workflow:** '+name,
   '**Canonical SHA:** '+sha,
   '**Run evidence:** '+url,
   '**Observed state:** '+verdict,
   '',
   'Next action: inspect the failing step, generate an isolated code candidate,',
   'run matching and complete CI checks, and attach the passing run receipt.',
   'Do not weaken the original test or assert production deployment.',
   '',
   'Automatically maintained from the source-bound JREI CI observer.'
 ].join('\n');
}
async function actOnDecisions(decisions,issueList,sha){
 const actions=[];
 for(const d of decisions){
  if(!['FAILURE_AT_CURRENT_SHA','RECOVERY_VERIFIED'].includes(d.decision))
    continue;
  const title=incidentTitle(d.name);
  const found=issueList.filter(x=>x&&x.title===title&&!x.pull_request);
  if(found.length>1){
   actions.push({workflow:d.name,state:'AMBIGUOUS_DUPLICATE_ISSUES'});
   continue;
  }
  const old=found[0];
  if(d.decision==='FAILURE_AT_CURRENT_SHA'){
   const body=issueContent(d.name,d.runId,sha,d.decision);
   if(!old){
    const created=await github('POST','/repos/'+REPO+'/issues',{title,body});
    actions.push({workflow:d.name,state:'INCIDENT_OPENED',issue:created.number});
   }else if(old.state!=='open'||old.body!==body){
    await github('PATCH','/repos/'+REPO+'/issues/'+old.number,{state:'open',body});
    actions.push({workflow:d.name,state:'INCIDENT_UPDATED',issue:old.number});
   }else actions.push({workflow:d.name,state:'EXISTING_INCIDENT',issue:old.number});
  }else if(old&&old.state==='open'){
   const body=(old.body||'')+'\n\n**CI recovery at SHA:** '+sha+
     '\n**Successful run:** https://github.com/'+REPO+'/actions/runs/'+d.runId+
     '\nThe issue closure does NOT attest production deployment.';
   await github('PATCH','/repos/'+REPO+'/issues/'+old.number,{state:'closed',body});
   actions.push({workflow:d.name,state:'CLOSED_AFTER_CI_PASS',issue:old.number});
  }
 }
 return actions;
}
export async function main(){
 if(process.env.GITHUB_REPOSITORY!==REPO||
    process.env.GITHUB_REF_NAME!==BRANCH||
    !/^[a-f0-9]{40}$/.test(head)||
    !token||retry<1)throw Error('CI_TRIAGE_OWNER_CANONICAL_SCOPE_MISSING');
 const branch=await github('GET','/repos/'+REPO+'/branches/migration/bertina-linux6');
 if(branch?.commit?.sha!==head)
   throw Error('CI_TRIAGE_STALE_SHA_REFUSE_MUTATION');
 const runList=await github('GET','/repos/'+REPO+
   '/actions/runs?branch=migration%2Fbertina-linux6&per_page=100');
 const decision=evaluateCI({headSha:head,runs:runList.workflow_runs});
 const issues=await fetchIssues();
 const actions=await actOnDecisions(decision.decisions,issues,head);
 const receipt={...decision,actions,mode:'ISSUE_TRIAGE_ONLY',
   model_training:false,code_changed:false,site_published:false};
 const folder=join(process.env.RUNNER_TEMP||tmpdir(),'jrei-ci-triage');
 await mkdir(folder,{recursive:true});
 await writeFile(join(folder,'ci-triage-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log('JREI_CI_TRIAGE_COMPLETED',JSON.stringify({sha:head,actions:actions.length}));
 return receipt;
}
if(process.argv[1]&&import.meta.url.endsWith('/'+process.argv[1].replaceAll('\\','/').split('/').at(-1))){
 main().catch(e=>{console.error('JREI_CI_TRIAGE_BLOCKED',e.message);process.exitCode=1});
}
