/**
 * JR Educational Intelligence V3 — deterministic, privacy-first orchestration contract.
 * This is a pure decision gate, NOT an LLM, an admissions authority or a predictor.
 * It performs no I/O, persistence, network calls or access to private user records.
 * Only a separately authenticated backend may supply approved source/rule metadata.
 */
export const JR_EI_VERSION = '3.0.0-foundation';
export const INTENTS = Object.freeze({
  GUIDANCE: 'GENERAL_GUIDANCE',
  CATALOGUE: 'EXPLORE_PROGRAMMES',
  ELIGIBILITY: 'CHECK_ELIGIBILITY',
  TREND: 'MOCK_EXAM_TREND',
  STUDY: 'STUDY_PLANNING',
  PATHWAY: 'COMPARE_PATHWAYS',
  PROBABILITY: 'ADMISSION_PROBABILITY',
});

const OFFICIAL_AUTHORITY = 'SANJESH';
const YEAR_MIN = 1300, YEAR_MAX = 1500;
const sha256 = s => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
const positiveText = (s, max=180) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const safeYear = y => Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX;
const unique = values => [...new Set(values)];
const blocked = (code, extra={}) => Object.freeze({
  version: JR_EI_VERSION, status: 'BLOCKED', reasonCodes: Object.freeze([code]),
  tool: null, modelMayOverride: false, predictionEnabled: false,
  ...extra,
});
const ready = (tool, extra={}) => Object.freeze({
  version: JR_EI_VERSION, status: 'READY_FOR_CONTROLLED_TOOL', tool,
  reasonCodes: Object.freeze([]), modelMayOverride: false,
  predictionEnabled: false, ...extra,
});

/** Merely checks supplied review metadata; not independent PDF/authority verification. */
export function inspectOfficialSource(source, year) {
  const issues=[];
  if (!source || typeof source !== 'object' || Array.isArray(source))
    return Object.freeze({usable:false,issues:Object.freeze(['INVALID_SOURCE'])});
  if (!safeYear(year) || source.year !== year) issues.push('CYCLE_MISMATCH');
  if (source.authority !== OFFICIAL_AUTHORITY) issues.push('AUTHORITY_NOT_SUPPORTED');
  if (!positiveText(source.documentId, 120) || !Number.isInteger(source.revision) || source.revision < 1)
    issues.push('DOCUMENT_VERSION_MISSING');
  if (!Number.isInteger(source.pdfPage) || source.pdfPage < 1) issues.push('SOURCE_PAGE_MISSING');
  if (!sha256(source.pdfSha256)) issues.push('SOURCE_HASH_MISSING');
  if (source.documentReviewState !== 'QA_APPROVED' || source.pageReviewState !== 'REVIEWED'
    || source.reviewerApproved !== true) issues.push('HUMAN_REVIEW_NOT_COMPLETE');
  if (source.superseded !== false) issues.push('AMENDMENT_STATUS_UNRESOLVED');
  return Object.freeze({
    usable: issues.length === 0,
    issues: Object.freeze(issues),
    // Metadata presence is not a substitute for a trusted, authenticated server query.
    evidenceLevel: issues.length ? 'UNCONFIRMED_METADATA' : 'REVIEW_METADATA_COMPLETE',
  });
}

/**
 * Creates a tool route without giving an LLM permission to declare official
 * eligibility, train on minors' data, or invent statistical admission chances.
 * The caller must enforce identity/consent server-side before providing learner data.
 */
export function planEducationalRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request))
    return blocked('INVALID_REQUEST');
  const {intent,year,learner,officialSources=[],ruleCoverage=null}=request;
  if (!Object.values(INTENTS).includes(intent)) return blocked('UNKNOWN_INTENT');
  if (!safeYear(year)) return blocked('INVALID_ADMISSION_YEAR');
  if (!Array.isArray(officialSources) || officialSources.length > 100)
    return blocked('INVALID_SOURCE_COLLECTION');

  if (learner?.privateDataRequested === true) {
    if (learner.authenticated !== true || learner.consentForThisPurpose !== true)
      return blocked('PRIVATE_LEARNER_ACCESS_NOT_AUTHORIZED');
    if (learner.isMinor === true && learner.guardianAuthorized !== true)
      return blocked('GUARDIAN_AUTHORIZATION_REQUIRED');
    if (learner.isMinor !== true && learner.isMinor !== false)
      return blocked('AGE_STATUS_UNCONFIRMED');
  }

  const reviewed=officialSources.filter(source=>inspectOfficialSource(source,year).usable);
  const provenance=Object.freeze({
    admissionYear:year, reviewedSourceMetadataCount:reviewed.length,
    sourceCoverageNotIndependentlyVerified:true,
    personalDataUsed:false,
  });

  switch (intent) {
    case INTENTS.GUIDANCE:
      return ready('PUBLIC_EDUCATIONAL_GUIDANCE', {provenance});
    case INTENTS.STUDY:
      return ready('DESCRIPTIVE_STUDY_PLAN', {provenance,
        boundary:'PLAN_SUGGESTIONS_ONLY_NO_LEARNING_DIAGNOSIS'});
    case INTENTS.TREND:
      return ready('PROVIDER_NATIVE_TREND_ANALYSIS', {provenance,
        boundary:'NO_PROVIDER_TO_SANJESH_SCORE_CONVERSION'});
    case INTENTS.PATHWAY:
      return ready('PERSONAL_PREFERENCE_COMPARISON', {provenance,
        boundary:'NOT_A_PSYCHOMETRIC_OR_ADMISSION_SCORE'});
    case INTENTS.PROBABILITY:
      // No production validated probability model exists in the inspected repo.
      // Never interpret client-supplied flags as authority to enable predictions.
      return blocked('VALIDATED_ADMISSION_MODEL_NOT_AVAILABLE', {provenance});
    case INTENTS.CATALOGUE:
      if (reviewed.length === 0) return blocked('SOURCE_REVIEW_REQUIRED', {provenance});
      return ready('SOURCE_REVIEWED_CATALOGUE_QUERY', {provenance,
        boundary:'REQUIRE_SERVER_SIDE_RECORD_AND_AMENDMENT_RECHECK'});
    case INTENTS.ELIGIBILITY:
      if (reviewed.length === 0) return blocked('SOURCE_REVIEW_REQUIRED', {provenance});
      if (!ruleCoverage || ruleCoverage.status !== 'VERIFIED_COMPLETE'
        || ruleCoverage.year !== year || ruleCoverage.serverReviewed !== true
        || !positiveText(ruleCoverage.ruleSetVersion, 90))
        return blocked('COMPLETE_OFFICIAL_RULE_COVERAGE_NOT_ESTABLISHED', {provenance});
      return ready('DETERMINISTIC_ELIGIBILITY_ENGINE', {provenance,
        boundary:'ONLY_SERVER_REVIEWED_RULE_ENGINE_MAY_RETURN_ELIGIBILITY'});
    default:
      return blocked('UNKNOWN_INTENT');
  }
}

/**
 * Compare mock observations only within a verified-comparable provider native scale.
 * Cross-provider and cross-cohort data are never silently converted or ranked.
 * Do not infer learning gains or admission chances from this descriptive delta.
 */
export function compareMockObservations(observations) {
  if (!Array.isArray(observations) || observations.length !== 2)
    return blocked('EXACTLY_TWO_OBSERVATIONS_REQUIRED');
  const [a,b]=observations;
  if ([a,b].some(x=>!x||typeof x!=='object'||Array.isArray(x)))
    return blocked('INVALID_OBSERVATION');
  const keys=['providerCode','examGroup','gradeCode','metricCode','scaleCode',
    'scaleVersion','populationCode','subjectCode'];
  if (keys.some(k=>!positiveText(a[k],90) || !positiveText(b[k],90)))
    return blocked('METRIC_PROVENANCE_INCOMPLETE');
  if (keys.some(k=>a[k]!==b[k]))
    return blocked('INCOMPARABLE_PROVIDER_OR_METRIC_CONTEXT');
  if (a.comparabilityReviewed !== true || b.comparabilityReviewed !== true)
    return blocked('CROSS_EVENT_COMPARABILITY_NOT_REVIEWED');
  if (!positiveText(a.eventCode,120)||!positiveText(b.eventCode,120)
    || a.eventCode===b.eventCode) return blocked('DISTINCT_EXAM_EVENTS_REQUIRED');
  if (!/^14\d{2}\/\d{2}\/\d{2}$/.test(a.examDate)
    || !/^14\d{2}\/\d{2}\/\d{2}$/.test(b.examDate)
    || a.examDate>=b.examDate) return blocked('CHRONOLOGY_NOT_VALID');
  if (![a.value,b.value].every(Number.isFinite)) return blocked('INVALID_METRIC_VALUE');
  if (a.metricCode==='SUBJECT_PERCENT' && [a.value,b.value].some(v=>v<0||v>100))
    return blocked('PERCENT_OUT_OF_RANGE');
  if (a.metricCode==='RANK' && [a.value,b.value].some(v=>!Number.isSafeInteger(v)||v<1))
    return blocked('RANK_OUT_OF_RANGE');
  if (!['SUBJECT_PERCENT','MOCK_TAZ','RANK'].includes(a.metricCode))
    return blocked('METRIC_COMPARISON_NOT_SUPPORTED');
  const delta=Math.round((b.value-a.value)*10000)/10000;
  return Object.freeze({version:JR_EI_VERSION,status:'DESCRIPTIVE_COMPARISON_ONLY',
    metricCode:a.metricCode,firstValue:a.value,lastValue:b.value,delta,
    interpretation:delta===0?'NO_NUMERICAL_CHANGE':
      a.metricCode==='RANK'?(delta<0?'LOWER_RANK_NUMBER':'HIGHER_RANK_NUMBER'):
      delta>0?'HIGHER_REPORTED_VALUE':'LOWER_REPORTED_VALUE',
    evidenceLevel:'PROVIDER_NATIVE_USER_OR_REVIEWED_DATA',
    note:'Numerical change does not establish learning improvement, national rank or admission probability.',
    predictionEnabled:false,modelMayOverride:false});
}
