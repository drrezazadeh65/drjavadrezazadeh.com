/** JREI observed Github history: READ-ONLY, owner repo only, no raw logs or conversation data. */
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {classifySiteWork} from '../platform/jrei-v5/jrei-site-apprentice.mjs';
const REPO='drrezazadeh65/drjavadrezazadeh.com';
const SHA=/^[a-f0-9]{40}$/i;
const safeName=s=>typeof s==='string'?s.replace(/[\r\n\x00-\x1f]/g,' ').slice(0,120):'UNKNOWN';
export function classifyHistoricalRun(run){
 const sha=run?.head_sha,conclusion=run?.conclusion??null;
 if(!SHA.test(sha??'')||!Number.isSafeInteger(run?.id)||run.id<1)
  throw Error('JREI_GH_RUN_INVALID');
 const name=safeName(run.name);
 const possibleDeployment=/deploy|bertina|publish|production|release/i.test(name);
 return {
  runId:run.id,commitSha:sha.toLowerCase(),workflow:safeName(run.name),
  createdAt:run.created_at||null,htmlUrl:run.html_url||null,
  event:safeName(run.event),status:safeName(run.status),
  conclusion:conclusion===null?null:safeName(conclusion),
  possibleDeployment,promotionEvidence:'NOT_INDEPENDENTLY_VERIFIED',
  // CI_SUCCESS is not BERTINA_DEPLOYED or user-facing quality acceptance.
  liveDeploymentVerified:false,lessonApproved:false
 };
}
export function summarizeHistory(runs,deployments,completeness){
 const byWorkflow=new Map(),shaStats=new Map();
 for(const r of runs){
  const w=byWorkflow.get(r.workflow)||{total:0,success:0,failure:0,cancelled:0,other:0};
  w.total++;
  if(r.conclusion==='success')w.success++;
  else if(r.conclusion==='failure')w.failure++;
  else if(r.conclusion==='cancelled')w.cancelled++;
  else w.other++;
  byWorkflow.set(r.workflow,w);
  const s=shaStats.get(r.commitSha)||{runs:0,success:0,failure:0,cancelled:0};
  s.runs++;
  if(r.conclusion==='success')s.success++;
  if(r.conclusion==='failure')s.failure++;
  if(r.conclusion==='cancelled')s.cancelled++;
  shaStats.set(r.commitSha,s);
 }
 return {
  schema:'jr.jrei.site-apprentice-github-history.v1',
  repository:REPO,generatedAt:new Date().toISOString(),
  workflowRunsExamined:runs.length,
  githubDeploymentsExamined:deployments.length,
  completeness,
  // Failure and success are observations. Root cause requires changed code,
  // accepted remediation and independent test/deploy receipts.
  workflowStatistics:[...byWorkflow].sort(([a],[b])=>a.localeCompare(b))
    .map(([workflow,counts])=>({workflow,...counts})),
  commitObservations:[...shaStats].map(([commitSha,counts])=>({commitSha,...counts})),
  deploymentObservations:deployments,
  runObservations:runs,
  automatedLearningStatus:'HISTORICAL_EVIDENCE_COLLECTED_UNREVIEWED',
  changesToWebsite:0,trainingExecuted:false,
  rootCausesIndependentlyEstablished:false,
  originalBertinaReleaseReceiptsVerified:false,
  autonomousPrivilegesGranted:false
 };
}
async function apiGet(path,token){
 const url='https://api.github.com/repos/'+REPO+path;
 const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'JREI-ReadOnly-History/1.0'}});
 if(!res.ok)throw Error('JREI_GITHUB_HISTORY_HTTP_'+res.status);
 return res.json();
}
async function paged(path,token,limitPages=250){
 const all=[];let page=0,complete=false;
 for(let p=1;p<=limitPages;p++){
  const data=await apiGet(path+(path.includes('?')?'&':'?')+'per_page=100&page='+p,token);
  const list=Array.isArray(data)?data:(Array.isArray(data?.workflow_runs)?data.workflow_runs:null);
  if(!list)throw Error('JREI_GITHUB_HISTORY_SCHEMA_INVALID');
  page++;
  all.push(...list);
  if(list.length<100){complete=true;break;}
 }
 return {all,complete,pagesRead:page};
}

/** All reachable original Git commits, even when ancient Actions logs expired.
 * Strictly FILE-NAME categories only, no messages, patches or code contents.
 */
export function inventoryFullGitHistory(){
 const raw=execFileSync('git',[
  'log','--all','--name-only','--format=JREI_GIT|%H|%cI'
 ],{encoding:'utf8',timeout:120000,maxBuffer:134217728,
  stdio:['ignore','pipe','pipe']});
 const rows=[],counts={};let item=null;
 const push=()=>{if(item){
   item.categories=Object.fromEntries(Object.entries(counts)
     .filter(([,v])=>v>0));
   rows.push(item);
 }};
 for(const line of raw.split(/\r?\n/)){
  if(line.startsWith('JREI_GIT|')){
   push();
   const m=line.match(/^JREI_GIT\|([a-f0-9]{40})\|(\S+)$/i);
   item=m?{commitSha:m[1].toLowerCase(),committedAt:m[2],
     fileCount:0,categories:{},source:'ORIGINAL_GIT_FILENAME_ONLY'}:null;
   for(const k of Object.keys(counts))delete counts[k];
  }else if(item&&line.trim()){
   item.fileCount++;
   for(const domain of classifySiteWork(line.trim()))counts[domain]=(counts[domain]||0)+1;
  }
 }
 push();
 return {reachableGitCommitCount:rows.length,gitHistoryComplete:true,
  earliestObservedCommit:rows.at(-1)?.commitSha??null,
  latestObservedCommit:rows[0]?.commitSha??null,
  gitCommitObservations:rows};
}

async function main(){
 const token=process.env.GITHUB_TOKEN;
 if(process.env.GITHUB_REPOSITORY!==REPO||typeof token!=='string'||token.length<20)
  throw Error('JREI_AUTHENTICATED_SOURCE_REQUIRED');
 // Actions results are not equivalent to site deployment receipts.
 const workflows=await paged('/actions/runs?exclude_pull_requests=false',token,250);
 const deployments=await paged('/deployments',token,100);
 const parsed=workflows.all.map(classifyHistoricalRun);
 const git=inventoryFullGitHistory();
 const dep=deployments.all.map(d=>({
   deploymentId:d.id,sha:SHA.test(d.sha??'')?d.sha.toLowerCase():null,
   environment:safeName(d.environment),createdAt:d.created_at??null,
   status:'STATUS_NOT_CHECKED',liveBertinaProof:false
 }));
 const report=summarizeHistory(parsed,dep,{
   workflowRunsComplete:workflows.complete,
   deploymentsComplete:deployments.complete,
   workflowPagesRead:workflows.pagesRead,
   deploymentPagesRead:deployments.pagesRead
 });
 const full={...report,...git,historyLearningScope:'READ_ONLY_COMMIT_METADATA_AND_ACCESSIBLE_ACTIONS'};
 const serialized=JSON.stringify(full,null,2)+'\n';
 const sha=createHash('sha256').update(serialized).digest('hex');
 const dir=join(process.env.RUNNER_TEMP||'/tmp','jrei-website-historical-backfill');
 await mkdir(dir,{recursive:true,mode:0o700});
 await writeFile(join(dir,'read-only-github-history.json'),serialized,{mode:0o600,flag:'w'});
 process.stdout.write('[JREI] HISTORICAL_RUNS='+parsed.length+'\n');
 process.stdout.write('[JREI] ALL_REACHABLE_GIT_COMMITS='+git.reachableGitCommitCount+'\n');
 process.stdout.write('[JREI] GITHUB_DEPLOYMENTS='+dep.length+'\n');
 process.stdout.write('[JREI] COMPLETE='+String(workflows.complete&&deployments.complete)+'\n');
 process.stdout.write('[JREI] UNVERIFIED_HISTORY_SHA256='+sha+'\n');
 process.stdout.write('[JREI] REVIEW_BEFORE_SKILL_PROMOTION\n');
 process.stdout.write('[JREI] NO_WEBSITE_DEPLOY_OR_MODEL_TRAINING\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{process.stderr.write('[JREI] '+String(e?.message||'HISTORY_FAILED').replace(/[^A-Z0-9_]/g,'').slice(0,90)+'\n');process.exitCode=1;});
