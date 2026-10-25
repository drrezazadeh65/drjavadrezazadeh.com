/**
 * JREI repair hypothesis mining from observed (not imagined) CI evidence.
 * A failure followed by success is a correlation only. A named, reviewed
 * code patch and held-out verification must precede an accepted lesson.
 */
import {createHash} from 'node:crypto';
export const REPAIR_SCHEMA='jr.jrei.explainable-repair-evidence.v1';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9_.:-]{2,110}$/i;
const issue=reason=>Object.freeze({admissible:false,reason,autonomousFixAllowed:false});
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
function run(r){
 return r&&SHA.test(r.headSha??'')&&ID.test(r.workflow??'')&&
  ['success','failure','cancelled','timed_out'].includes(r.conclusion)&&
  Number.isSafeInteger(r.runId)&&r.runId>0;
}
export function proposeJreiDevelopmentRepair({failedRun,subsequentRun,
 patchDigestSha256=null,changedPaths=[],issueType='UNKNOWN',
 humanVerificationDigest=null}={}){
 if(!run(failedRun)||!run(subsequentRun)||failedRun.conclusion!=='failure'||
    subsequentRun.conclusion!=='success'||
    failedRun.workflow!==subsequentRun.workflow||
    failedRun.headSha===subsequentRun.headSha||
    failedRun.runId===subsequentRun.runId||
    !Array.isArray(changedPaths)||changedPaths.length>150||
    changedPaths.some(x=>typeof x!=='string'||x.length>320||
      x.startsWith('/')||x.includes('..')||x.includes('\\')||
      /(?:\.env|secret|password|private|key\.|credentials)/i.test(x))||
    !/^[A-Z_]{3,48}$/.test(issueType))
   return issue('OBSERVABLE_FAILURE_TO_SUCCESS_PAIR_REQUIRED');
 if(patchDigestSha256!==null&&!HASH.test(patchDigestSha256)||
    humanVerificationDigest!==null&&!HASH.test(humanVerificationDigest))
   return issue('EVIDENCE_DIGEST_INVALID');
 const repair={
  schema:REPAIR_SCHEMA,
  failing:{sha:failedRun.headSha,runId:failedRun.runId},
  succeeding:{sha:subsequentRun.headSha,runId:subsequentRun.runId},
  workflow:failedRun.workflow,issueType,
  observedSafePaths:[...new Set(changedPaths)].sort(),
  exactPatchDigest:patchDigestSha256,
  independentVerificationDigest:humanVerificationDigest,
  status:patchDigestSha256&&humanVerificationDigest?
    'PATCH_EVIDENCE_AVAILABLE_REQUIRES_CAUSAL_REVIEW':
    'CORRELATION_ONLY_NOT_A_PROVEN_REPAIR',
  confidenceNotMeasured:true,sourceDiffInspected:false,
  siteFixCausationProven:false,
  selfTrainingNotPermitted:true,autoMergeOrDeployAllowed:false,
  secretsRead:false
 };
 return Object.freeze({...repair,admissible:true,hypothesisDigestSha256:digest(repair)});
}
export function planJreiRepairLesson({hypothesis,independentReviewerId,
 reviewReceiptSha256,heldOutRun,approvedForRetrieval=false}={}){
 if(!hypothesis?.admissible||hypothesis.schema!==REPAIR_SCHEMA||
    !ID.test(independentReviewerId??'')||
    !HASH.test(reviewReceiptSha256??'')||
    !run(heldOutRun)||heldOutRun.conclusion!=='success'||
    heldOutRun.headSha!==hypothesis.succeeding.sha||
    !hypothesis.exactPatchDigest||
    !hypothesis.independentVerificationDigest)
   return issue('CAUSAL_LESSON_EVIDENCE_INCOMPLETE');
 return Object.freeze({admissible:true,schema:'jr.jrei.apprentice-proposed-lesson.v1',
   sourceHypothesisDigest:hypothesis.hypothesisDigestSha256,
   reviewReceiptSha256,independentReviewerId,
   heldOutVerificationRunId:heldOutRun.runId,
   proposedRetrievalStatus:approvedForRetrieval?
     'REVIEWED_CANDIDATE_NOT_IMPORT': 'NOT_APPROVED',
   memoryImported:false,modelWeightsUpdated:false,
   autonomousPatchApplied:false,deployAuthorized:false});
}
