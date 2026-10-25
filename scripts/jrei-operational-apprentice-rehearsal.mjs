#!/usr/bin/env node
/**
 * Private CI-only rehearsal on real historical evidence. Does not patch,
 * clone unknown repos, call a model, or decide production release.
 *
 * Usage: node scripts/jrei-operational-apprentice-rehearsal.mjs
 *        /path/to/read-only-github-history.json
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {
  assessHistoricalEngineeringTask,identifyHistoricalRepairCandidates
} from '../platform/jrei-v5/jrei-operational-apprentice.mjs';

const tasks=[
  {name:'mobile-ui',action:'PROPOSE_UI_FIX',
    goal:'Resolve a public mobile navigation regression without changing approved routes',
    domains:['UI_UX','DESIGN','TESTING']},
  {name:'seo-geo',action:'PROPOSE_SEO_FIX',
    goal:'Investigate an existing bilingual canonical and structured-data regression',
    domains:['SEO_GEO','TESTING']},
  {name:'site-php',action:'PROPOSE_CODE_FIX',
    goal:'Diagnose a first-party PHP functional regression with source tests',
    domains:['CODE','TESTING']},
  {name:'security',action:'DIAGNOSE_REGRESSION',
    goal:'Investigate a regression in protected account session or CSRF behavior',
    domains:['SECURITY','CODE','TESTING']}
];
export async function runOfflineHistoryRehearsal(source,outputDir){
 const raw=await readFile(source,'utf8');
 if(raw.length>75_000_000)throw Error('APPRENTICE_HISTORY_TOO_LARGE');
 const history=JSON.parse(raw);
 const tasksOut=tasks.map(task=>({
  label:task.name,report:assessHistoricalEngineeringTask({history,task,maxCandidates:8})
 }));
 const workflows=['Bertina Master SEO Audit','SEO GEO Regression',
    'JREI source and twin-Windows acceptance (No Deployment)'];
 const transitions=workflows.map(workflow=>identifyHistoricalRepairCandidates({
  history,workflow,maxPairs:12
 }));
 const totalTransitions=transitions.reduce((sum,x)=>sum+x.possiblePairCount,0);
 const evidence={
   schema:'jr.jrei.operational-apprentice-real-history-rehearsal.v1',
   archiveDigest:null, // No raw archive hash exposed in public status.
   inspectedGitCommitCount:history.gitCommitObservations.length,
   inspectedWorkflowRunCount:history.runObservations.length,
   distinctObservedDeploymentCount:history.deploymentObservations.length,
   actionProposals:tasksOut,workflowTransitions:transitions,
   possibleFailureToSuccessPairs:totalTransitions,
   demonstrableAutonomousCodeChanges:0,
   demonstrableSiteFixes:0,
   demonstrableDesignerProficiency:false,
   autonomousGitHubWriteAuthorization:false,
   productionDeployAuthorized:false,
   source:'PREVIOUS_OWNER_REPOSITORY_HISTORY_ACTION_ARTIFACT',
   executionState:'REAL_HISTORY_RETRIEVAL_AND_REPAIR_TRIAGE_COMPLETE',
   skillReviewState:'CANDIDATES_REQUIRE_DIFF_QA_AND_INDEPENDENT_REVIEW'
 };
 await mkdir(outputDir,{recursive:true,mode:0o700});
 await writeFile(join(outputDir,'engineering-rehearsal.json'),
   JSON.stringify(evidence,null,2)+'\n',{mode:0o600,flag:'w'});
 return {
  commits:evidence.inspectedGitCommitCount,
  runs:evidence.inspectedWorkflowRunCount,
  deploymentRecords:evidence.distinctObservedDeploymentCount,
  potentialTransitions:totalTransitions,
  candidateCount:tasksOut.reduce((n,x)=>n+x.report.precedents.length,0),
  summary:'HISTORICAL_EVIDENCE_ANALYSED_NOT_AUTONOMOUS_ENGINEERING'
 };
}
async function main(){
 if(!process.env.CI||process.env.GITHUB_REPOSITORY!=='drrezazadeh65/drjavadrezazadeh.com')
  throw Error('APPRENTICE_CI_ONLY');
 const input=process.argv[2];
 if(!input||input.length>1024)throw Error('APPRENTICE_HISTORY_INPUT_MISSING');
 const out=join(process.env.RUNNER_TEMP||tmpdir(),'jrei-real-history-rehearsal');
 const r=await runOfflineHistoryRehearsal(input,out);
 for(const [k,v] of Object.entries(r))
   process.stdout.write('[JREI] '+k.toUpperCase()+'='+v+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{
  const reason=String(e?.message??'APPRENTICE_ERROR');
  process.stderr.write('[JREI] '+(/^[A-Z0-9_]{8,80}$/.test(reason)?reason:'APPRENTICE_REHEARSAL_FAILED')+'\n');
  process.exitCode=1;
 });
}
