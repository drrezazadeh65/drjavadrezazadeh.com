/**
 * JREI News: provider-neutral inference route proposal ONLY.
 * Reuses the original JREI orchestration policy. No second chatbot,
 * live model call, implicit OpenAI payment or publication.
 */
import {selectApprovedInferenceRoute} from '../jrei-v5/jrei-autonomous-orchestration-contract.mjs';
import {assert,plain,utcInstant,sha256} from './contracts.mjs';
export function proposeJreiNewsInference({
  task='BILINGUAL_DIALOGUE',providers,ownerControls,newsReviewPackage,at
}={}){
  assert(['BILINGUAL_DIALOGUE','GROUNDED_RETRIEVAL',
    'DOCUMENT_CLASSIFICATION'].includes(task)&&
    Array.isArray(providers)&&providers.length<=16&&
    plain(ownerControls)&&ownerControls.sourceApproved===true&&
    ownerControls.ownerControlledModelPolicy===true&&
    ownerControls.newsGenerationEnabled===true&&
    ownerControls.privacyReviewPassed===true&&
    plain(newsReviewPackage)&&
    newsReviewPackage.schema==='jr.jrei.news-review-package.v1'&&
    newsReviewPackage.publicationApproved===false&&utcInstant(at),
    'NEWS_JREI_MODEL_POLICY_DISABLED');
  const route=selectApprovedInferenceRoute({
    task,sensitivity:'PUBLIC',
    allowCloud:ownerControls.cloudUseApproved===true,
    maxCostMicrounits:ownerControls.maxCostMicrounits,
    maxLatencyMs:ownerControls.maxLatencyMs,
    minQualityBenchmarkPermille:ownerControls.minQualityBenchmarkPermille
  },providers);
  return Object.freeze({schema:'jr.jrei.news-model-route-proposal.v1',
    route,at,newsDigest:newsReviewPackage.preview.approvalDigest,
    existingJreiRouteOnly:true,noProviderExecuted:true,
    publicationAuthorized:false});
}
export function modelDraftQuarantine({inferenceProposal,receivedEnvelope,observedAt}={}){
  assert(plain(inferenceProposal)&&
    inferenceProposal.schema==='jr.jrei.news-model-route-proposal.v1'&&
    inferenceProposal.route.status==='APPROVED_ROUTE_PROPOSAL'&&
    plain(receivedEnvelope)&&
    receivedEnvelope.providerId===inferenceProposal.route.providerId&&
    typeof receivedEnvelope.utf8Output==='string'&&
    receivedEnvelope.utf8Output.length<=30000&&utcInstant(observedAt),
    'NEWS_MODEL_RESPONSE_INVALID');
  return Object.freeze({schema:'jr.jrei.news-model-draft.v1',
    sourcePreviewDigest:inferenceProposal.newsDigest,
    providerId:receivedEnvelope.providerId,
    modelOutputSha256:sha256(receivedEnvelope.utf8Output),
    receivedAt:observedAt,storageHint:'PRIVATE_REVIEW_ONLY',
    factCheckRequired:true,styleCheckRequired:true,
    ownerApprovalRequired:true,neverAutoPublish:true});
}
