/**
 * JREI provider-neutral orchestration decision contract v1.
 * Pure, source-only policy. No live provider, paid API key, worker or
 * credential is invoked by importing this module.
 *
 * This module is a capability/budget/privacy selection boundary for a future
 * SERVER-SIDE coordinator, not a simulated conversational model.
 */
export const JREI_ORCHESTRATION_VERSION='jr.jrei.autonomous-orchestration.v1';
const MAX_PROVIDERS=16;
const MAX_LATENCY_MS=30000;
const ALLOWED_TASKS=new Set([
  'BILINGUAL_DIALOGUE','GROUNDED_RETRIEVAL','QUESTION_EXPLANATION',
  'DOCUMENT_CLASSIFICATION','ANSWER_KEY_CONFLICT_REVIEW',
  'EXAM_ITEM_DRAFT','EXAM_ITEM_INDEPENDENT_REVIEW'
]);
const SENSITIVITY=new Set(['PUBLIC','CONSENTED_LEARNER','PRIVATE_RESTRICTED']);
const SUPPORTED_KINDS=new Set(['APPROVED_CLOUD_API','SIGNED_LOCAL_WORKER']);
const boundedInteger=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const safeId=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_.:-]{2,79}$/i.test(v);
const freezeDecision=(status,details={})=>Object.freeze({
  schema:JREI_ORCHESTRATION_VERSION,status,
  modelId:null,providerId:null,reasonCodes:[],estimatedCostMicrounits:null,
  inferenceOccurred:false,responseContent:null,
  scientificValidationEstablished:false,...details
});
const validProvider=p=>p&&typeof p==='object'&&safeId(p.id)&&
  SUPPORTED_KINDS.has(p.kind)&&p.approved===true&&p.enabled===true&&
  p.integrationVerified===true&&p.credentialAvailable===true&&
  boundedInteger(p.estimatedCostMicrounits,0,100000000)&&
  boundedInteger(p.p95LatencyMs,1,MAX_LATENCY_MS)&&
  boundedInteger(p.qualityBenchmarkPermille,0,1000)&&
  Array.isArray(p.capabilities)&&p.capabilities.every(x=>ALLOWED_TASKS.has(x))&&
  p.capabilities.length<=16&&
  p.allowedSensitivities instanceof Array&&
  p.allowedSensitivities.every(x=>SENSITIVITY.has(x))&&
  p.allowedSensitivities.length<=3&&
  Number.isSafeInteger(p.remainingBudgetMicrounits)&&
  p.remainingBudgetMicrounits>=0;
/**
 * Select only a verified, policy-approved, budgeted model candidate.
 * A candidate describing itself as "connected" is not proof of actual
 * inference: real integrationVerified status must come from server operations.
 */
export function selectApprovedInferenceRoute(input,providers){
  if(!input||typeof input!=='object'||!Array.isArray(providers)||
     providers.length>MAX_PROVIDERS)
    return freezeDecision('DENIED',{reasonCodes:['INVALID_POLICY_INPUT']});
  const {task,sensitivity,allowCloud,maxCostMicrounits,
    maxLatencyMs,minQualityBenchmarkPermille}=input;
  if(!ALLOWED_TASKS.has(task)||!SENSITIVITY.has(sensitivity)||
     typeof allowCloud!=='boolean'||
     !boundedInteger(maxCostMicrounits,0,100000000)||
     !boundedInteger(maxLatencyMs,1,MAX_LATENCY_MS)||
     !boundedInteger(minQualityBenchmarkPermille,0,1000))
    return freezeDecision('DENIED',{reasonCodes:['INCOMPLETE_TASK_PERMISSION']});
  if(sensitivity!=='PUBLIC'&&input.purposeConsentApproved!==true)
    return freezeDecision('DENIED',{reasonCodes:['PURPOSE_CONSENT_REQUIRED']});
  const eligible=providers.filter(p=>validProvider(p)&&
    (allowCloud||p.kind!=='APPROVED_CLOUD_API')&&
    p.allowedSensitivities.includes(sensitivity)&&
    p.capabilities.includes(task)&&
    p.remainingBudgetMicrounits>=p.estimatedCostMicrounits&&
    p.estimatedCostMicrounits<=maxCostMicrounits&&
    p.p95LatencyMs<=maxLatencyMs&&
    p.qualityBenchmarkPermille>=minQualityBenchmarkPermille);
  if(!eligible.length)return freezeDecision('NO_APPROVED_MODEL_AVAILABLE',{
    reasonCodes:['NO_VERIFIED_INTEGRATION_MEETS_PRIVACY_QUALITY_OR_BUDGET']
  });
  eligible.sort((a,b)=>b.qualityBenchmarkPermille-a.qualityBenchmarkPermille||
    a.estimatedCostMicrounits-b.estimatedCostMicrounits||
    a.p95LatencyMs-b.p95LatencyMs||a.id.localeCompare(b.id));
  const picked=eligible[0];
  return freezeDecision('APPROVED_ROUTE_PROPOSAL',{
    providerId:picked.id,modelId:picked.modelId&&safeId(picked.modelId)?
      picked.modelId:null,
    estimatedCostMicrounits:picked.estimatedCostMicrounits,
    estimatedLatencyMs:picked.p95LatencyMs,
    observedQualityPermille:picked.qualityBenchmarkPermille,
    routeKind:picked.kind,
    reasonCodes:['HUMAN_APPROVED_PROVIDER_POLICY','BENCHMARK_AND_BUDGET_GATE'],
    // Selection is not model execution, network permission, or a response.
    executionPermittedByThisModule:false
  });
}
/**
 * Reject claims without independent evidence and full source linkage.
 * Providers never approve their own outputs, scientific claims or exam keys.
 */
export function reviewProposedEducationalClaims(payload){
  if(!payload||typeof payload!=='object'||
     !Array.isArray(payload.claims)||payload.claims.length>40)
    return Object.freeze({status:'REVIEW_REQUIRED',reasonCodes:['INVALID_CLAIM_BATCH']});
  const disputed=[];
  payload.claims.forEach((claim,index)=>{
    if(!claim||typeof claim!=='object'||
       typeof claim.text!=='string'||!claim.text.trim()||
       !Array.isArray(claim.sources)||claim.sources.length<1||
       !claim.sources.every(s=>s&&typeof s==='object'&&safeId(s.sourceId)&&
         /^[a-f0-9]{64}$/.test(s.contentSha256||'')&&
         s.rightsApproved===true&&s.independentlyReviewed===true))
      disputed.push(index);
  });
  return Object.freeze({
    schema:JREI_ORCHESTRATION_VERSION,
    status:disputed.length?'REVIEW_REQUIRED':'EVIDENCE_METADATA_COMPLETE',
    disputedClaimIndices:Object.freeze(disputed),
    responseApprovedForPublication:false,
    actualSourcesRetrieved:false,
    independentScientificReviewCompleted:false
  });
}
