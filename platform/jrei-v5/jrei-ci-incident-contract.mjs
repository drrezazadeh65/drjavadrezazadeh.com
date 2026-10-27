/** JREI independent CI incident decisions, without network or side effects. */
import {createHash} from 'node:crypto';

export const CI_NAMES=Object.freeze([
  'Bertina Master SEO Audit',
  'Safe public scientific experience release QA',
  'DrJavad v5.1.0 First Usable Nondeploying Candidate',
  'JREI Windows Command Center - Functional Source QA (NO DEPLOY)',
]);
export const REPO='drrezazadeh65/drjavadrezazadeh.com';
export const BRANCH='migration/bertina-linux6';
const validSHA=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const validId=x=>Number.isSafeInteger(x)&&x>0;
export const incidentTitle=name=>'[JREI CI INCIDENT] '+name;

export function evaluateCI({headSha,runs}){
  if(!validSHA(headSha)||!Array.isArray(runs)||runs.length>100)
    throw Error('JREI_CI_INVALID_HEAD_OR_RUNS');
  const latest=new Map();
  for(const run of runs){
    if(!run||typeof run!=='object')continue;
    if(!CI_NAMES.includes(run.name)||latest.has(run.name))continue;
    if(run.head_branch!==BRANCH||run.head_sha!==headSha)continue;
    if(!validId(run.id)||run.status!=='completed')continue;
    latest.set(run.name,run);
  }
  const decisions=[];
  for(const name of CI_NAMES){
    const run=latest.get(name);
    if(!run){
      decisions.push({name,decision:'NO_CURRENT_SHA_EVIDENCE',runId:null});
      continue;
    }
    const state=run.conclusion==='success'?'RECOVERY_VERIFIED':
      ['failure','timed_out'].includes(run.conclusion)?'FAILURE_AT_CURRENT_SHA':
      'NO_DECISIVE_RESULT';
    decisions.push({name,decision:state,runId:run.id});
  }
  const digest=createHash('sha256').update(JSON.stringify(
    ['jr.jrei.ci-incident-decision.v1',headSha,decisions])).digest('hex');
  return Object.freeze({schema:'jr.jrei.ci-incident-decision.v1',
    sourceHead:headSha,branch:BRANCH,decisions,receiptSha256:digest,
    changedSource:false,productionDeployed:false});
}
