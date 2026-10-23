/**
 * TESTLY + Humanability research architecture — source-only scientific gates.
 *
 * Anchors: private original author proposals, independently read 2026-10-23:
 *   TESTLY.docx SHA256 7be9d7e...; Humanability of Language Testing.docx
 *   SHA256 6e01e8f... (full digests in jrei-testly-source-register.json).
 * Nothing here claims completed psychometric validation or gives a TESTLY
 * numeric score. Original unpublished proposal text remains private.
 */
import {createHash} from 'node:crypto';

export const QUALITY_LAB_PROTOCOL='jr.jrei.testly-research.v1';
export const RESEARCH_STATUSES=Object.freeze([
  'DRAFT','ETHICS_REVIEW','APPROVED_FOR_RECRUITMENT',
  'COLLECTING','ANALYSIS_PENDING','RESULTS_REVIEW',
  'COMPLETED','SUSPENDED','REJECTED','CLOSED'
]);
export const EVIDENCE_LEVELS=Object.freeze([
  'THEORETICAL_PROPOSITION',
  'PROPOSED_OPERATIONAL_INDICATOR',
  'EXPERT_REVIEWED',
  'EMPIRICALLY_INVESTIGATED',
  'VALIDATION_SUPPORTED',
  'CHALLENGED_BY_EVIDENCE',
  'RETRACTED'
]);
export const OUTCOMES=Object.freeze([
  'SUPPORTS_PROPOSITION','CHALLENGES_PROPOSITION',
  'MIXED_EVIDENCE','INCONCLUSIVE','NOT_EVALUATED'
]);
export const METHODOLOGIES=Object.freeze([
  'CONCEPTUAL_REVIEW','QUALITATIVE_INTERVIEWS','FOCUS_GROUPS',
  'EXPERT_JUDGEMENT','CLASSICAL_TEST_THEORY',
  'ITEM_RESPONSE_THEORY','EXPLORATORY_FACTOR_ANALYSIS',
  'CONFIRMATORY_FACTOR_ANALYSIS',
  'MEASUREMENT_INVARIANCE','LONGITUDINAL_COMPARISON',
  'MIXED_METHODS','OTHER_PRE_REGISTERED'
]);
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9._:-]{1,100}$/.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const note=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2000;
const deny=(reason)=>Object.freeze({
 ok:false,code:reason,canRecruit:false,canAnalyze:false,
 canPublish:false,validated:false
});
const allow=(rest={})=>Object.freeze({
 ok:true,canPublish:false,validated:false,...rest
});
const KNOWN_FRAMEWORKS=new Set(['TESTLY','HUMANABILITY']);
const AUTHOR_PROPOSAL_DIGESTS=Object.freeze({
 'testly-author-book-proposal':'7be9d7e369cc314b6c054b5f4cae37c8391ec6c10256ff867ee2fc582aad74a3',
 'humanability-author-research-proposal':'6e01e8f2f3e05a387dcb3f3fd4ace8fbacc5560834638de182d1ea5645916ac5'
});
const DIMENSIONS={
 TESTLY:new Set([
  'RELIABILITY','VALIDITY','FAIRABILITY_FAIRNESS','HUMANABILITY',
  'AUTHENTICITY','PRACTICALITY','IMPACT_CONSEQUENTIALITY',
  'ACCESSIBILITY','TRANSPARENCY','ACCOUNTABILITY','SECURITY'
 ]),
 HUMANABILITY:new Set([
  'HUMAN_DIGNITY','AGENCY','INDIVIDUALITY_CONTEXT',
  'WELLBEING','MEANINGFULNESS',
  'CULTURAL_LINGUISTIC_RESPONSIVENESS',
  'DEVELOPMENTAL_ORIENTATION'
 ])
};
// Exact conceptual source locators from confidential author proposals.
// Does not certify empirical validity or publish the manuscript.
const SOURCE_PARAGRAPHS=Object.freeze({
 TESTLY:Object.freeze({
  RELIABILITY:96,VALIDITY:98,FAIRABILITY_FAIRNESS:102,HUMANABILITY:105,
  AUTHENTICITY:109,PRACTICALITY:111,IMPACT_CONSEQUENTIALITY:113,
  ACCESSIBILITY:118,TRANSPARENCY:119,ACCOUNTABILITY:120,SECURITY:121
 }),
 HUMANABILITY:Object.freeze({
  HUMAN_DIGNITY:170,AGENCY:179,INDIVIDUALITY_CONTEXT:188,
  WELLBEING:196,MEANINGFULNESS:205,
  CULTURAL_LINGUISTIC_RESPONSIVENESS:213,DEVELOPMENTAL_ORIENTATION:221
 })
});
const METHOD_EVIDENCE={
 CLASSICAL_TEST_THEORY:['SCORING_RULES','ITEM_RESPONSES','REVIEWED_SAMPLE'],
 ITEM_RESPONSE_THEORY:['SCORING_RULES','ITEM_RESPONSES','REVIEWED_SAMPLE','MODEL_IDENTIFICATION'],
 EXPLORATORY_FACTOR_ANALYSIS:['REVIEWED_SAMPLE','INSTRUMENT_VERSION'],
 CONFIRMATORY_FACTOR_ANALYSIS:['REVIEWED_SAMPLE','INSTRUMENT_VERSION','PRE_REGISTERED_STRUCTURE'],
 MEASUREMENT_INVARIANCE:['REVIEWED_SAMPLE','INSTRUMENT_VERSION','GROUP_COMPARABILITY'],
 LONGITUDINAL_COMPARISON:['REVIEWED_SAMPLE','TIMEPOINT_COMPARABILITY']
};
/**
 * A construct/indicator is not created as a scientifically validated metric
 * simply because a proposal names it. Never invent threshold/score/weight.
 */
export function registerConstructProposal({
 framework,frameworkVersion,dimensionCode,sourceId,
 sourceSha256,sourceParagraph,evidenceLevel,indicatorId=null,
 definitionReviewed=false
}={}) {
 if(!KNOWN_FRAMEWORKS.has(framework)||!id(frameworkVersion)||
    !DIMENSIONS[framework].has(dimensionCode)||
    !id(sourceId)||!hash(sourceSha256)||
    !Number.isInteger(sourceParagraph)||sourceParagraph<0||
    !EVIDENCE_LEVELS.includes(evidenceLevel)||
    (indicatorId!==null&&!id(indicatorId)))
   return deny('CONSTRUCT_SOURCE_INVALID');
 const permitted=framework==='TESTLY'
   ?sourceId==='testly-author-book-proposal'
   :sourceId==='humanability-author-research-proposal';
 if(!permitted||AUTHOR_PROPOSAL_DIGESTS[sourceId]!==sourceSha256)
   return deny('WRONG_AUTHOR_PROPOSAL_OR_DIGEST');
 if(SOURCE_PARAGRAPHS[framework][dimensionCode]!==sourceParagraph)
   return deny('CONSTRUCT_DEFINITION_LOCATOR_MISMATCH');
 if(evidenceLevel!=='THEORETICAL_PROPOSITION'&&
    evidenceLevel!=='PROPOSED_OPERATIONAL_INDICATOR')
   return deny('HIGHER_VALIDATION_REQUIRES_EXTERNAL_EVIDENCE');
 if(evidenceLevel==='PROPOSED_OPERATIONAL_INDICATOR'&&
   (indicatorId===null||definitionReviewed!==true))
   return deny('INDICATOR_OPERATIONAL_DEFINITION_UNVERIFIED');
 return allow({status:evidenceLevel,framework,frameworkVersion,
   dimensionCode,indicatorId,sourceId,sourceSha256,sourceParagraph,
   scoringEnabled:false,threshold:null});
}
/** Exact protocol questions/methods are investigator-specified; no AI
 * inserts hypotheses or changes an approved analysis plan post hoc. */
export function validateResearchProtocol({
 protocolId,protocolVersion,framework,frameworkVersion,
 registeredHypotheses,plannedMethods,ethicalBasis,
 independentEthicsApproval,sourceDocumentSha256,
 consentNoticeVersion,studyIncludesMinors=false,
 guardianProtocolReviewed=false,sourceQuestionVersion,
 changesAfterPreregistration=false
}={}) {
 if(!id(protocolId)||!id(protocolVersion)||
    !KNOWN_FRAMEWORKS.has(framework)||!id(frameworkVersion)||
    !hash(sourceDocumentSha256)||!id(sourceQuestionVersion)||
    !id(consentNoticeVersion)||!Array.isArray(registeredHypotheses)||
    registeredHypotheses.length<1||registeredHypotheses.length>40||
    registeredHypotheses.some(h=>!isObj(h)||!id(h.id)||!note(h.question))||
    !Array.isArray(plannedMethods)||plannedMethods.length<1||
    plannedMethods.some(m=>!METHODOLOGIES.includes(m))||
    !id(ethicalBasis))
   return deny('RESEARCH_PROTOCOL_INVALID');
 if(changesAfterPreregistration!==false)
   return deny('PREREGISTRATION_AMENDMENT_REQUIRED');
 if(independentEthicsApproval!==true)
   return deny('ETHICS_APPROVAL_REQUIRED');
 if(studyIncludesMinors&&!guardianProtocolReviewed)
   return deny('MINOR_GUARDIAN_PROTOCOL_REQUIRED');
 return allow({canRecruit:true,
   protocolId,protocolVersion,consentNoticeVersion,
   approvedMethods:Object.freeze([...new Set(plannedMethods)]),
   studyIncludesMinors,canAnalyze:false,protocolStatus:'APPROVED_FOR_RECRUITMENT'});
}
/**
 * A privacy-preserving research authorization check. Account/guardian and
 * right-to-withdrawal verification MUST also be performed server-side via
 * original eco_consent_records; this source-only DTO proves nothing itself.
 */
export function authorizeResearchDataset({
 protocol,participantPolicy,consent,privacyProof,dataset,
 intendedMethod
}={}) {
 if(!isObj(protocol)||protocol.protocolStatus!=='APPROVED_FOR_RECRUITMENT'||
    protocol.canRecruit!==true||!METHODOLOGIES.includes(intendedMethod)||
    !protocol.approvedMethods?.includes(intendedMethod))
   return deny('PROTOCOL_NOT_APPROVED_FOR_METHOD');
 if(!isObj(dataset)||!id(dataset.datasetId)||!hash(dataset.sha256)||
    !id(dataset.instrumentVersion)||!id(dataset.retentionPolicyVersion)||
    dataset.minimizationReviewed!==true||
    dataset.rawIdentityIncluded===true||
    dataset.directIdentifiersIncluded===true||
    dataset.recordCount===undefined||
    !Number.isSafeInteger(dataset.recordCount)||dataset.recordCount<1)
   return deny('RESEARCH_DATASET_MINIMIZATION_UNVERIFIED');
 if(!isObj(privacyProof)||privacyProof.accountAuthorizationRechecked!==true||
    privacyProof.purposeScopedAccess===true&&privacyProof.withdrawalRechecked!==true||
    privacyProof.breachReviewClear!==true||privacyProof.exportRightsApproved!==true)
   return deny('DATA_ACCESS_AND_WITHDRAWAL_NOT_VERIFIED');
 if(privacyProof.purposeScopedAccess!==true)
   return deny('RESEARCH_PURPOSE_SCOPE_MISSING');
 if(!isObj(consent)||consent.current!==true||
    consent.purpose!=='TESTLY_HUMANABILITY_RESEARCH'||
    consent.noticeVersion!==protocol.consentNoticeVersion||
    consent.withdrawn!==false)
   return deny('RESEARCH_CONSENT_NOT_CURRENT');
 if(!isObj(participantPolicy)||participantPolicy.includesMinors!==true&&
    participantPolicy.includesMinors!==false)
   return deny('PARTICIPANT_POLICY_INVALID');
 if(participantPolicy.includesMinors===true&&(
    protocol.studyIncludesMinors!==true||
    participantPolicy.guardianAuthorizationVerified!==true||
    participantPolicy.legalBasisReviewed!==true||
    privacyProof.childDataAccessApproved!==true))
   return deny('MINORS_RESEARCH_AUTHORIZATION_REQUIRED');
 const prerequisites=METHOD_EVIDENCE[intendedMethod]||[];
 const certified=Array.isArray(dataset.approvedCapabilities)
   ?dataset.approvedCapabilities:[];
 if(prerequisites.some(x=>!certified.includes(x)))
   return deny('ANALYTIC_METHOD_PREREQUISITES_MISSING');
 return allow({canAnalyze:true,mayExportDeidentifiedMetadata:true,
   privateParticipantRowsMayLeaveBertina:false,
   datasetId:dataset.datasetId,datasetDigest:dataset.sha256,
   method:intendedMethod,recordCount:dataset.recordCount,
   caution:'No empirical validity or confirmatory result is implied.'});
}
/** Negative results are first-class outcomes; AI must not suppress them. */
export function stageResearchFinding({
 protocolId,protocolVersion,hypothesisId,analysisId,
 method,analysisCodeSha256,datasetSha256,resultDigest,
 interpretation,contradictionsRecorded,independentReviewer,
 reportVersion,disclosureReview
}={}) {
 if(![protocolId,protocolVersion,hypothesisId,analysisId,independentReviewer,
   reportVersion].every(id)||
    !METHODOLOGIES.includes(method)||
    ![analysisCodeSha256,datasetSha256,resultDigest].every(hash)||
    !OUTCOMES.includes(interpretation)||interpretation==='NOT_EVALUATED'||
    contradictionsRecorded!==true||disclosureReview!==true)
   return deny('RESEARCH_FINDING_PROVENANCE_INCOMPLETE');
 return allow({findingStatus:'PENDING_INDEPENDENT_REVIEW',
   interpretation,analysisId,reportVersion,
   negativeFindingsMustBeRetained:true,canPublish:false,
   scientificValidationClaim:false});
}
/** Optional discovery only. Actual statistical analyses must document
 * models, assumptions, missing-data handling, fit diagnostics and code. */
export function proposeResearchMethod({researchQuestion,method,
  designReviewed,sampleReviewed,assumptionsReviewed}={}) {
 if(!note(researchQuestion)||!METHODOLOGIES.includes(method))
   return deny('METHOD_OR_QUESTION_INVALID');
 if(designReviewed!==true||sampleReviewed!==true||
    assumptionsReviewed!==true)
   return deny('METHOD_NOT_JUSTIFIED_BY_RESEARCH_DESIGN');
 return allow({method,advisoryOnly:true,
  statisticalResult:null,empiricalValidationEstablished:false});
}
