/**
 * JREI adaptive learning v1 — source-only, deterministic and fail-closed.
 *
 * Learning means comparing two versions on the SAME independently reviewed
 * held-out educational cases, then proposing an accountable policy update.
 * This kernel cannot edit code, alter model weights, consume learner records,
 * certify official admissions data, change payments or deploy itself.
 *
 * Low-risk retrieval tuning MAY be auto-promoted by a future authenticated
 * mother-DB coordinator ONLY after explicit owner enablement, independent
 * held-out evaluation, an atomic version check and a reversible rollback
 * record. Defaults remain OFF. All other changes require human review.
 *
 * Expected runtime: Node.js on an approved worker; no I/O in this module.
 */
import { createHash } from 'node:crypto';

export const LEARNING_PROTOCOL = 'jr.jrei.adaptive-learning.v1';
export const LEARNING_MODES = Object.freeze({
  RETRIEVAL_TUNING: 'RETRIEVAL_TUNING',
  EVIDENCE_REFRESH: 'EVIDENCE_REFRESH',
  PROMPT_POLICY: 'PROMPT_POLICY',
  MODEL_VERSION: 'MODEL_VERSION',
  EDUCATIONAL_RULE: 'EDUCATIONAL_RULE',
  SCIENTIFIC_SCORING: 'SCIENTIFIC_SCORING'
});
export const DECISIONS = Object.freeze({
  BLOCKED: 'BLOCKED',
  REJECTED: 'REJECTED',
  OWNER_REVIEW: 'OWNER_REVIEW',
  ELIGIBLE_LOW_RISK: 'ELIGIBLE_LOW_RISK'
});

const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const plain = (x) => x !== null && typeof x === 'object' &&
  Object.getPrototypeOf(x) === Object.prototype;
const positiveInt = (x, min=0, max=1e9) =>
  Number.isSafeInteger(x) && x >= min && x <= max;
const digest = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hash = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const modelId = (v) => typeof v === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(v);
const dateKey = (v) => typeof v === 'string' && /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v) &&
  !Number.isNaN(Date.parse(v+'T00:00:00Z')) &&
  new Date(v+'T00:00:00Z').toISOString().startsWith(v);
const EVALUATION_KEYS = Object.freeze([
  'runDay','datasetSha256','evidenceSha256','evaluationVersion',
  'modelVersion','heldOut','sourceApproved','sampleCount','correctCount',
  'unsupportedCount','abstentionCount','privacyIncidentCount',
  'fairnessGapBps','p95LatencyMs'
]);
const forbiddenField = /(?:name|email|phone|address|prompt|message|transcript|student|national.?id|password|token|secret|raw|answerText|questionText)/i;

function cleanEvaluation(raw) {
  if (!plain(raw)) return null;
  if (Object.keys(raw).some(k => !EVALUATION_KEYS.includes(k)||forbiddenField.test(k)))
    return null;
  for (const k of EVALUATION_KEYS) if (!own(raw,k)) return null;
  if (!dateKey(raw.runDay)||!hash(raw.datasetSha256)||!hash(raw.evidenceSha256)||
    !modelId(raw.evaluationVersion)||!modelId(raw.modelVersion)||
    raw.heldOut !== true || raw.sourceApproved !== true ||
    !positiveInt(raw.sampleCount,1,1e6)||
    !positiveInt(raw.correctCount,0,raw.sampleCount)||
    !positiveInt(raw.unsupportedCount,0,raw.sampleCount)||
    !positiveInt(raw.abstentionCount,0,raw.sampleCount)||
    !positiveInt(raw.privacyIncidentCount,0,raw.sampleCount)||
    !positiveInt(raw.fairnessGapBps,0,10000)||
    !positiveInt(raw.p95LatencyMs,0,300000)) return null;
  // Counts are disjoint except fairness/latency metrics.
  if(raw.correctCount+raw.unsupportedCount+raw.abstentionCount>raw.sampleCount)
    return null;
  return Object.freeze({...raw});
}

/**
 * Only a small bounded BM25 configuration is eligible for automatic learning.
 * These are ranking coefficients, NEVER admissions rules, prices, legal notices
 * or source authority status. There is no arbitrary executable value.
 */
export function normalizeRetrievalPolicy(policy) {
  if(!plain(policy))return null;
  const keys=Object.keys(policy).sort();
  if(keys.join(',') !== 'b,k1,maxEvidence') return null;
  const {b,k1,maxEvidence}=policy;
  if(!Number.isFinite(b)||b<0.2||b>0.9||
     !Number.isFinite(k1)||k1<0.8||k1>2.2||
     !positiveInt(maxEvidence,8,40)) return null;
  return Object.freeze({b:Number(b.toFixed(3)),
    k1:Number(k1.toFixed(3)),maxEvidence});
}

const blocked=(reason)=>Object.freeze({
  protocol:LEARNING_PROTOCOL,decision:DECISIONS.BLOCKED,
  reason,canPublish:false,autoPromote:false
});
const rejected=(reason)=>Object.freeze({
  protocol:LEARNING_PROTOCOL,decision:DECISIONS.REJECTED,
  reason,canPublish:false,autoPromote:false
});

/**
 * Compare same-day independently reviewed aggregate holdout performance.
 * Fields must be supplied by trusted internal evaluation code; this pure
 * function cannot attest a source's actual authenticity.
 */
export function assessLearningCandidate({
  mode,baseline,challenger,currentPolicy,candidatePolicy,controls,
  expectedRunDay,expectedActivePolicySha256
}={}) {
  const b=cleanEvaluation(baseline),c=cleanEvaluation(challenger);
  if(!b||!c||!dateKey(expectedRunDay))
    return blocked('EVALUATION_UNVERIFIED');
  if(!plain(controls)||controls.learningEnabled!==true||
    controls.killSwitch!==false)
    return blocked('LEARNING_DISABLED');
  if(!Object.values(LEARNING_MODES).includes(mode))
    return blocked('UNREGISTERED_CHANGE_TYPE');
  if(b.runDay!==expectedRunDay||c.runDay!==expectedRunDay||
    b.datasetSha256!==c.datasetSha256 ||
    b.evidenceSha256!==c.evidenceSha256 ||
    b.evaluationVersion!==c.evaluationVersion ||
    b.sampleCount!==c.sampleCount)
    return blocked('NONCOMPARABLE_EVIDENCE');
  if(b.sampleCount<200)return blocked('INSUFFICIENT_HELD_OUT_CASES');
  if(b.modelVersion===c.modelVersion&&mode===LEARNING_MODES.MODEL_VERSION)
    return blocked('MODEL_VERSION_UNCHANGED');

  const active=normalizeRetrievalPolicy(currentPolicy);
  const proposed=normalizeRetrievalPolicy(candidatePolicy);
  if(mode===LEARNING_MODES.RETRIEVAL_TUNING&&(!active||!proposed))
    return blocked('RETRIEVAL_POLICY_INVALID');
  if(mode===LEARNING_MODES.RETRIEVAL_TUNING&&
     (!hash(expectedActivePolicySha256)||
      digest(active)!==expectedActivePolicySha256))
    return blocked('STALE_ACTIVE_POLICY');
  if(mode===LEARNING_MODES.RETRIEVAL_TUNING&&digest(active)===digest(proposed))
    return rejected('NO_POLICY_CHANGE');

  // No observed privacy incident is an absolute requirement for proposals.
  if(c.privacyIncidentCount>0) return rejected('PRIVACY_REGRESSION');
  if(c.unsupportedCount>b.unsupportedCount)
    return rejected('UNSUPPORTED_CLAIM_REGRESSION');
  if(c.correctCount<b.correctCount)
    return rejected('EVIDENCE_QUALITY_REGRESSION');
  if(c.fairnessGapBps>b.fairnessGapBps)
    return rejected('FAIRNESS_REGRESSION');
  if(c.p95LatencyMs>b.p95LatencyMs*1.5)
    return rejected('LATENCY_REGRESSION');
  const improvement=c.correctCount>b.correctCount ||
    (c.correctCount===b.correctCount&&c.p95LatencyMs<b.p95LatencyMs*0.95);
  if(!improvement)return rejected('NO_DEMONSTRATED_IMPROVEMENT');
  const lowRisk=mode===LEARNING_MODES.RETRIEVAL_TUNING&&
    c.unsupportedCount===0&&c.fairnessGapBps<=250 &&
    c.sampleCount>=500&&c.privacyIncidentCount===0;
  const auto=lowRisk&&controls.autoPromoteLowRisk===true &&
    controls.ownerHasExplicitlyEnabledAutoPromotion===true;
  // Even eligible changes must undergo server-side authenticated CAS,
  // atomic prior-version archive and rollback before publication.
  const proposal=Object.freeze({
    protocol:LEARNING_PROTOCOL,
    decision:auto?DECISIONS.ELIGIBLE_LOW_RISK:DECISIONS.OWNER_REVIEW,
    canPublish:false,autoPromote:auto,
    reason:auto?'READY_FOR_ATOMIC_SERVER_GATES':'REQUIRES_OWNER_REVIEW',
    changeType:mode,runDay:expectedRunDay,
    datasetSha256:b.datasetSha256,
    evidenceSha256:b.evidenceSha256,
    evaluationVersion:b.evaluationVersion,
    activePolicySha256:mode===LEARNING_MODES.RETRIEVAL_TUNING
      ?expectedActivePolicySha256:null,
    proposedPolicy:mode===LEARNING_MODES.RETRIEVAL_TUNING?proposed:null,
    proposedPolicySha256:mode===LEARNING_MODES.RETRIEVAL_TUNING
      ?digest(proposed):null,
    metrics:Object.freeze({
      baselineCorrect:b.correctCount,candidateCorrect:c.correctCount,
      baselineUnsupported:b.unsupportedCount,
      candidateUnsupported:c.unsupportedCount,
      baselineAbstentions:b.abstentionCount,
      candidateAbstentions:c.abstentionCount,
      baselineP95Ms:b.p95LatencyMs,candidateP95Ms:c.p95LatencyMs,
      baselineFairnessGapBps:b.fairnessGapBps,
      candidateFairnessGapBps:c.fairnessGapBps,
      sampleCount:c.sampleCount
    })
  });
  return proposal;
}

/** Human-readable, data-free daily plan, not a self-executing background job. */
export function planDailyLearning({runDay,learningEnabled,workerStatus,
  approvedEvaluationCount=0,unreviewedSourceCount=0}={}) {
  if(!dateKey(runDay))return blocked('INVALID_RUN_DAY');
  if(learningEnabled!==true)return blocked('LEARNING_DISABLED');
  const reachable=['ONLINE','BUSY','DEGRADED'].includes(workerStatus);
  if(!reachable)return Object.freeze({
    protocol:LEARNING_PROTOCOL,runDay,status:'WAIT_FOR_APPROVED_WORKER',
    canPublish:false,items:[],reason:'WORKER_OFFLINE_OR_MAINTENANCE'
  });
  return Object.freeze({
    protocol:LEARNING_PROTOCOL,runDay,status:'PREPARE_EVIDENCE_AND_EVALUATE',
    canPublish:false,
    items:Object.freeze([
      'CHECK_OFFICIAL_SOURCE_FRESHNESS_AND_REVOKED_AMENDMENTS',
      'CHECK_PERMISSION_AND_CONSENT_SCOPE',
      'EVALUATE_EXISTING_APPROVED_HELD_OUT_CASES',
      'COMPARE_ONLY_MATCHED_BASELINE_AND_CHALLENGER',
      'STAGE_REVERSIBLE_RETRIEVAL_PROPOSAL',
      'REPORT_UNRESOLVED_QUALITY_AND_FAIRNESS_GAPS'
    ]),
    approvedEvaluationCount:positiveInt(approvedEvaluationCount)?approvedEvaluationCount:0,
    unreviewedSourceCount:positiveInt(unreviewedSourceCount)?unreviewedSourceCount:0,
    reason:'NO_PUBLICATION_OR_MODEL_WEIGHT_CHANGES'
  });
}

/** Independent owner approval for changes outside tiny retrieval coefficients. */
export function requiresHumanApproval(changeType) {
  return changeType!==LEARNING_MODES.RETRIEVAL_TUNING;
}
