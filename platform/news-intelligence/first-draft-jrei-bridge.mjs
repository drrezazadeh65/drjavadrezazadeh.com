/**
 * JREI first-draft inference planning: source evidence -> model routing ->
 * PRIVATE draft. Unlike post-edit refinement, this does not require
 * an already completed bilingual owner preview.
 *
 * Routes through the EXISTING approved JREI model selector. Never executes
 * inference, introduces a second chatbot or uses OpenAI by default.
 */
import {selectApprovedInferenceRoute} from '../jrei-v5/jrei-autonomous-orchestration-contract.mjs';
import {assert,isHash,plain,safeText,sha256,utcInstant} from './contracts.mjs';
export function proposeNewsFirstDraftFromVerifiedEvidence({
  candidate,evidence,reviewedFacts,ownerControls,
  approvedModelProviders,authorialStyleProfiles={},
  atUtc,format='NEWS_REPORT'
}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    isHash(candidate.fingerprint)&&isHash(candidate.evidenceSha256)&&
    plain(evidence)&&evidence.schema==='jr.jrei.news-evidence-review.v1'&&
    evidence.candidateFingerprint===candidate.fingerprint&&
    evidence.evidenceSha256===candidate.evidenceSha256&&
    evidence.evidenceReviewed===true&&evidence.issuerVerified===true&&
    evidence.sourceStillCurrent===true&&
    Array.isArray(reviewedFacts)&&reviewedFacts.length>=1&&
    reviewedFacts.length<=40&&
    ['NEWS_REPORT','BREAKING_BRIEF','EXPLAINER','ANALYSIS','GUIDE'].includes(format)&&
    plain(ownerControls)&&
    ownerControls.source==='ORIGINAL_JREI_PRIVATE_MODEL_POLICY'&&
    ownerControls.newsDraftingAuthorized===true&&
    ownerControls.privacyReviewPassed===true&&
    ownerControls.independentEditorialReviewRequired===true&&
    Array.isArray(approvedModelProviders)&&approvedModelProviders.length<=16&&
    plain(authorialStyleProfiles)&&utcInstant(atUtc),
    'NEWS_FIRST_DRAFT_PRIVATE_POLICY_NOT_READY');
  for(const f of reviewedFacts) {
    assert(plain(f)&&safeText(f.statement,12,700)&&
      safeText(f.supportingExcerpt,12,5000)&&
      f.independentlyReviewed===true&&
      f.evidenceSha256===candidate.evidenceSha256,
      'NEWS_FIRST_DRAFT_UNREVIEWED_SOURCE_CLAIM');
  }
  for(const locale of ['fa','en']){
    const profile=authorialStyleProfiles[locale];
    if(profile!==undefined&&profile!==null) {
      assert(plain(profile)&&
        profile.schema==='jr.jrei.author-style-measurement.v1'&&
        profile.language===locale&&
        profile.analyzedDocuments>0,
        'NEWS_UNSUPPORTED_AUTHOR_STYLE_CLAIM');
    }
  }
  const route=selectApprovedInferenceRoute({
    task:'BILINGUAL_DIALOGUE',sensitivity:'PUBLIC',
    allowCloud:ownerControls.explicitCloudModelPermission===true,
    maxCostMicrounits:ownerControls.maxCostMicrounits,
    maxLatencyMs:ownerControls.maxLatencyMs,
    minQualityBenchmarkPermille:ownerControls.minQualityBenchmarkPermille
  },approvedModelProviders);
  const sourceProof=sha256(JSON.stringify({
    fingerprint:candidate.fingerprint,evidence:candidate.evidenceSha256,
    reviewedFacts:reviewedFacts.map(x=>x.statement),format
  }));
  return Object.freeze({
    schema:'jr.jrei.news-first-draft-inference.v1',
    status:route.status,atUtc,format,route,
    candidateFingerprint:candidate.fingerprint,
    evidenceSha256:candidate.evidenceSha256,
    reviewedFacts:reviewedFacts.map(x=>({
      statement:x.statement,excerpt:x.supportingExcerpt})),
    sourceProof,authorialStyleProfiles,
    existingJreiServerSideAdapterRequired:true,
    modelHasNotBeenCalled:true,
    doNotSendPersonalData:true,
    sourceExcerptIsUntrustedModelInput:true,
    publicationState:'PRIVATE_UNGENERATED',
    approvedForPublicRelease:false
  });
}
export function quarantineReturnedNewsFirstDraft({
  proposal,originalJreiSignedResult,receivedAtUtc
}={}){
  assert(plain(proposal)&&
    proposal.schema==='jr.jrei.news-first-draft-inference.v1'&&
    proposal.route.status==='APPROVED_ROUTE_PROPOSAL'&&
    plain(originalJreiSignedResult)&&
    originalJreiSignedResult.source==='ORIGINAL_JREI_INFERENCE_EXECUTOR'&&
    originalJreiSignedResult.signedJobVerified===true&&
    originalJreiSignedResult.modelId===proposal.route.modelId&&
    originalJreiSignedResult.providerId===proposal.route.providerId&&
    originalJreiSignedResult.sourceProof===proposal.sourceProof&&
    originalJreiSignedResult.completed===true&&
    typeof originalJreiSignedResult.outputText==='string'&&
    originalJreiSignedResult.outputText.length<=60000&&
    utcInstant(receivedAtUtc),
    'NEWS_JREI_FIRST_DRAFT_RESPONSE_UNTRUSTED');
  return Object.freeze({
    schema:'jr.jrei.news-first-draft-quarantine.v1',
    candidateFingerprint:proposal.candidateFingerprint,
    evidenceSha256:proposal.evidenceSha256,
    sourceProof:proposal.sourceProof,
    outputDigest:sha256(originalJreiSignedResult.outputText),
    atUtc:receivedAtUtc,
    retention:'PRIVATE_EVIDENCE_REVIEW_ONLY',
    independentClaimChecksStillRequired:true,
    bilingualCopyEditingStillRequired:true,
    matchingOwnerApprovalDigestNotCreated:true,
    publicPublicationAuthorized:false
  });
}
