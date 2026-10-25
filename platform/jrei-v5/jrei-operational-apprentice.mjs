/**
 * JREI Engineering Apprentice v1.1 — evidence-ranked historical precedents.
 *
 * This is a deterministic, offline DECISION-SUPPORT module. It can infer
 * candidate correlations, not read a developer's mind or prove root cause.
 * Executable work requires separate limited tools + actual independent QA.
 * 13k commits are observations, not 13k certified examples.
 */
import {createHash} from 'node:crypto';
import {REPOSITORY} from './jrei-site-apprentice.mjs';

const SHA=/^[a-f0-9]{40}$/i;
const DOMAINS=new Set([
  'CODE','UI_UX','DESIGN','SEO_GEO','CONTENT','OPERATIONS',
  'SECURITY','DATA','AI_JREI','TESTING'
]);
const ACTIONS=new Set([
  'DIAGNOSE_REGRESSION','PROPOSE_UI_FIX',
  'PROPOSE_CODE_FIX','PROPOSE_SEO_FIX','PROPOSE_CONTENT_FIX'
]);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const event=x=>x==='success'||x==='failure'||x==='cancelled'||x==='timed_out'
  ?x:'other';
const boundedString=(x,max=200)=>typeof x==='string'&&x.trim().length>=4&&
  x.length<=max&&!/[\u0000-\u001f]/.test(x)&&
  !/(?:BEGIN [A-Z ]*PRIVATE KEY|password=|api_key=|sk-[A-Za-z0-9_-]{12,})/i.test(x);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze=x=>Object.freeze(x);
const domainOf=commit=>obj(commit?.categories)?Object.entries(commit.categories)
  .filter(([key,n])=>DOMAINS.has(key)&&Number.isSafeInteger(n)&&n>0)
  .map(([key])=>key):[];
function histories(history){
 if(!obj(history)||history.repository!==REPOSITORY||
    !Array.isArray(history.gitCommitObservations)||
    !Array.isArray(history.runObservations)||
    !Array.isArray(history.deploymentObservations))
   throw Error('APPRENTICE_HISTORY_SCHEMA_INVALID');
 if(history.gitCommitObservations.length>100000||
    history.runObservations.length>100000||
    history.deploymentObservations.length>30000)
   throw Error('APPRENTICE_HISTORY_LIMIT_EXCEEDED');
 if(history.gitCommitObservations.some(x=>!SHA.test(x?.commitSha??''))||
    history.runObservations.some(x=>!SHA.test(x?.commitSha??'')))
   throw Error('APPRENTICE_HISTORY_SHA_INVALID');
 return history;
}
function summarizeRuns(runs){
 const count={success:0,failure:0,cancelled:0,timed_out:0,other:0};
 const workflows=new Set();
 for(const r of runs){
  count[event(r.conclusion)]++;
  if(boundedString(r.workflow,120))workflows.add(r.workflow);
 }
 return {counts:count,workflows:[...workflows].sort().slice(0,12)};
}
export function assessHistoricalEngineeringTask({history,task,maxCandidates=8}={}){
 const h=histories(history);
 if(!obj(task)||!ACTIONS.has(task.action)||
    !boundedString(task.goal)||!Array.isArray(task.domains)||
    task.domains.length<1||task.domains.length>5||
    task.domains.some(d=>!DOMAINS.has(d))||
    !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>20)
  throw Error('APPRENTICE_TASK_INVALID');
 const desired=[...new Set(task.domains)];
 const bySha=new Map();
 for(const run of h.runObservations){
  if(!bySha.has(run.commitSha))bySha.set(run.commitSha,[]);
  const list=bySha.get(run.commitSha);
  if(list.length<60)list.push(run);
 }
 const candidates=[];
 for(const commit of h.gitCommitObservations){
  const subjects=domainOf(commit);
  const overlap=desired.filter(d=>subjects.includes(d));
  if(!overlap.length)continue;
  const runs=bySha.get(commit.commitSha)||[];
  const observed=summarizeRuns(runs);
  const first=Number.isFinite(Date.parse(commit.committedAt))?
    Date.parse(commit.committedAt):0;
  // Rank by topological evidence and specific-domain overlap, NOT by
  // claiming the model understands the actual source modification.
  const score=overlap.length*10+
    (observed.counts.success>0?3:0)+(observed.counts.failure>0?2:0)+
    (observed.counts.cancelled>0?1:0);
  candidates.push({
   commitSha:commit.commitSha,domainOverlap:overlap,
   score,observedCi:observed,
   committedAt:first?new Date(first).toISOString():null,
   relatedChangeCount:Number.isSafeInteger(commit.fileCount)?commit.fileCount:0,
   rootCauseVerified:false,
   deployedToBertinaVerified:false,
   developerLessonVerified:false,
   safeSourceDiffReviewed:false,
   sampleInterpretation:observed.counts.failure>0?
     'REVIEW_FAILED_WORKFLOW_AS_POTENTIAL_NEGATIVE_EXAMPLE':
     'METADATA_SIMILARITY_ONLY'
  });
 }
 candidates.sort((a,b)=>b.score-a.score||
   (b.committedAt||'').localeCompare(a.committedAt||'')||
   a.commitSha.localeCompare(b.commitSha));
 const selected=candidates.slice(0,maxCandidates);
 const reply={
  schema:'jr.jrei.engineering-apprentice-diagnosis.v1',
  repository:REPOSITORY,goalDigestSha256:hash(task.goal),
  action:task.action,requestedDomains:desired,
  matchingHistoricalCommitCount:candidates.length,
  commitPopulation:h.gitCommitObservations.length,
  ciPopulation:h.runObservations.length,
  workflowHistoryTruncated:h.completeness?.workflowRunsComplete!==true,
  evidenceClassification:'PRECEDENT_CANDIDATES_NOT_VALIDATED_SKILLS',
  precedents:selected,
  nextWork:[
   {stage:'TRACE',instruction:'Inspect relevant first-party source and actual historical diff in an isolated environment',privilege:'READ_ONLY'},
   {stage:'DIAGNOSE',instruction:'Correlate issue, code delta, failing/passing test, and live release receipt without assuming causality',privilege:'READ_ONLY'},
   {stage:'DESIGN',instruction:'Produce scoped patch proposal with alternatives and accessibility, mobile, security, SEO impacts',privilege:'REVIEW_ONLY'},
   {stage:'VERIFY',instruction:'Run isolated tests including explicit negative regression cases and measured acceptance criteria',privilege:'SANDBOX_ONLY'},
   {stage:'PROMOTE',instruction:'Require external review and original authorised deployment; record genuine release/rollback receipts',privilege:'OWNER_GATED'}
  ],
  doesNotReadPrivateChat:true,doesNotTrainModelWeights:true,
  canEditRepository:false,canRelease:false,
  proofOfIndependentDesignIntelligence:false,
  nextAcceptance:'ONE_HISTORICAL_REAL_WORLD_BUG_REPRODUCED_FIXED_IN_SANDBOX_AND_INDEPENDENTLY_VERIFIED'
 };
 return freeze({...reply,reportSha256:hash(reply)});
}
/** CI failure -> success in the SAME workflow is a correlation, NOT a fix proof.
 * Preserve intermediate cancel/timeout rather than reclassifying as failure. */
export function identifyHistoricalRepairCandidates({history,workflow,maxPairs=20}={}){
 const h=histories(history);
 if(!boundedString(workflow,120)||!Number.isInteger(maxPairs)||
    maxPairs<1||maxPairs>100)throw Error('APPRENTICE_REPAIR_QUERY_INVALID');
 const ordered=h.runObservations.filter(x=>x.workflow===workflow&&
    ['success','failure'].includes(x.conclusion)&&
    Number.isFinite(Date.parse(x.createdAt))).sort((a,b)=>
      Date.parse(a.createdAt)-Date.parse(b.createdAt)||
      a.runId-b.runId);
 const pairs=[];
 let failure=null;
 for(const r of ordered){
  if(r.conclusion==='failure'){failure=r;continue;}
  if(failure&&r.conclusion==='success'&&r.commitSha!==failure.commitSha){
   pairs.push({failedCommitSha:failure.commitSha,
    laterSuccessfulCommitSha:r.commitSha,
    workflow,changeMayBeRelevant:true,
    actualFixNotProven:true,productionNotProven:true,
    nextStep:'DIFF_AND_NEGATIVE_TEST_REVIEW'});
   failure=null;
  }
 }
 return freeze({schema:'jr.jrei.engineering-repair-candidates.v1',
  workflow,pairs:pairs.slice(0,maxPairs),
  possiblePairCount:pairs.length,
  runPopulation:ordered.length,
  historyTruncated:h.completeness?.workflowRunsComplete!==true,
  verifiedFixes:0,abilityToRewriteSource:false});
}
