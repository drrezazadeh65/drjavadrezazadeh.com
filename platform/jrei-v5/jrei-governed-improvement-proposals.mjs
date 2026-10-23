/**
 * JREI Ultimate Vision — autonomous IMPROVEMENT PROPOSAL contract.
 *
 * This is a deterministic, non-executing evidence gate for proposed
 * isolated-branch changes. It NEVER calls GitHub, runs tests, applies
 * patches, merges PRs, deploys or edits secrets, payments or security.
 * Final approval and acceptance remain owner-controlled.
 */
import {createHash} from 'node:crypto';

const HASH=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9._-]{2,60}$/;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const s=(v,max)=>typeof v==='string'&&v.trim().length>0&&
  v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const BLOCKED=Object.freeze([
  /(^|\/)\.github\//i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(?:secrets?|private|credentials?|keys?)(?:\/|$)/i,
  /(^|\/)(?:payments?|commerce|checkout|billing|auth|identity|security|consent|privacy|migration|database|db)(?:[./_-]|\/|$)/i,
  /(?:^|\/)api\/index\.php$/i,
  /(?:^|\/)api\/operations\.php$/i,
  /(?:^|\/)sw\.js$/i,
  /(?:^|\/)AGENTS\.md$/i,
  /(?:^|\/)platform\/assistant-runtime-policy\.json$/i
]);
const ALLOWED=[
  /^assets\/(?:css|js)\/[a-z0-9._/-]+\.(?:css|js)$/i,
  /^platform\/jrei-v5\/[a-z0-9._/-]+\.mjs$/i,
  /^docs\/(?:governance|research|educational)\/[a-z0-9._/-]+\.md$/i
];
export const JREI_IMPROVEMENT_PROPOSAL_SCHEMA='jr.jrei.improvement-proposal.v1';

export function proposalPathAllowed(path){
  return s(path,180)&&!path.startsWith('/')&&!path.includes('..')&&
    !path.includes('\\')&&ALLOWED.some(r=>r.test(path))&&
    !BLOCKED.some(r=>r.test(path));
}
const fail=(why)=>Object.freeze({
  schema:JREI_IMPROVEMENT_PROPOSAL_SCHEMA,
  status:'BLOCKED',reason:why,
  safeToMerge:false,safeToDeploy:false,canRunTests:false,
  patchExecuted:false,repoChanged:false
});

/**
 * Input must be derived from a trusted, immutable, independent evaluation
 * record by authenticated server code; a model or visitor cannot assert
 * quality/benchmark acceptance. No CI is run at this stage.
 */
export function draftGovernedImprovement(spec){
  if(!obj(spec)||spec.schema!=='jr.jrei.improvement-input.v1')
    return fail('UNVERIFIED_PROPOSAL_ENVELOPE');
  if(!s(spec.proposalId,60)||!ID.test(spec.proposalId)||
     !s(spec.summary,600)||!s(spec.rationale,2400)||
     !s(spec.riskAnalysis,2400)||!s(spec.rollbackPlan,2400))
    return fail('MISSING_PROPOSAL_REASONING_OR_ROLLBACK');
  if(!Array.isArray(spec.changedPaths)||spec.changedPaths.length<1||
     spec.changedPaths.length>12||
     new Set(spec.changedPaths).size!==spec.changedPaths.length||
     !spec.changedPaths.every(proposalPathAllowed))
    return fail('SENSITIVE_OR_UNBOUNDED_PATHS');
  if(!s(spec.currentCommit,64)||
     !/^[a-f0-9]{40}$/.test(spec.currentCommit)||
     !HASH.test(spec.evaluationEvidenceSha256)|| 
     !HASH.test(spec.baselineArtifactSha256)||
     !HASH.test(spec.candidateArtifactSha256))
    return fail('MISSING_IMMUTABLE_EVIDENCE');
  if(!Array.isArray(spec.independentFindings)||
     spec.independentFindings.length<1||
     spec.independentFindings.length>12||
     !spec.independentFindings.every(x=>obj(x)&&
       s(x.finding,900)&&HASH.test(x.sourceDigest)&&
       x.observed===true))
    return fail('NO_INDEPENDENT_REPRODUCIBLE_FINDINGS');
  if(spec.changesPaymentOrSecurity===true||
     spec.changesPrivateDataControls===true||
     spec.downloadsExternalCode===true||
     spec.requestsUnrestrictedExecution===true||
     spec.publishesExamOrMedicalAdvice===true)
    return fail('FORBIDDEN_AUTONOMOUS_SCOPE');
  const digest=createHash('sha256').update(JSON.stringify([
    spec.proposalId,spec.currentCommit,
    spec.changedPaths,spec.evaluationEvidenceSha256,
    spec.baselineArtifactSha256,spec.candidateArtifactSha256
  ])).digest('hex');
  return Object.freeze({
    schema:JREI_IMPROVEMENT_PROPOSAL_SCHEMA,
    status:'DRAFT_OWNER_REVIEW_REQUIRED',
    proposalId:spec.proposalId,
    targetBranch:'improvement/jrei-'+spec.proposalId,
    baseCommit:spec.currentCommit,
    changedPaths:Object.freeze([...spec.changedPaths]),
    summary:spec.summary,
    rationale:spec.rationale,
    riskAnalysis:spec.riskAnalysis,
    rollbackPlan:spec.rollbackPlan,
    independentEvidenceSha256:spec.evaluationEvidenceSha256,
    candidateArtifactSha256:spec.candidateArtifactSha256,
    proposalDigest:digest,
    candidateQualityIndependentlyAccepted:false,
    externalModelEvaluationRequired:true,
    canOpenDraftPullRequestAfterOwnerPolicyReview:true,
    canRunTests:false,
    patchExecuted:false,repoChanged:false,
    safeToMerge:false,safeToDeploy:false,
    mustNotModifyCanonicalBranch:true
  });
}
