// FINAL-ONLY tests. Owner explicitly prohibits running these before source completion.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  LEARNING_MODES,DECISIONS,normalizeRetrievalPolicy,
  assessLearningCandidate,planDailyLearning,requiresHumanApproval
} from '../platform/jrei-v5/jrei-learning-loop.mjs';
import {createHash} from 'node:crypto';

const sha=(x)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const basePolicy=normalizeRetrievalPolicy({k1:1.5,b:0.75,maxEvidence:20});
const trialPolicy=normalizeRetrievalPolicy({k1:1.4,b:0.72,maxEvidence:20});
const baseline={
  runDay:'2026-10-23',datasetSha256:'a'.repeat(64),
  evidenceSha256:'b'.repeat(64),evaluationVersion:'eval-v1',
  modelVersion:'jrei-v5',heldOut:true,sourceApproved:true,
  sampleCount:500,correctCount:450,unsupportedCount:0,
  abstentionCount:50,privacyIncidentCount:0,fairnessGapBps:100,
  p95LatencyMs:8000
};
const challenger={...baseline,correctCount:452,abstentionCount:48,p95LatencyMs:7000};
const controls={learningEnabled:true,killSwitch:false,
  autoPromoteLowRisk:true,ownerHasExplicitlyEnabledAutoPromotion:true};
const ask=(overrides={})=>assessLearningCandidate({
  mode:LEARNING_MODES.RETRIEVAL_TUNING,
  baseline,challenger,currentPolicy:basePolicy,
  candidatePolicy:trialPolicy,controls,
  expectedRunDay:'2026-10-23',expectedActivePolicySha256:sha(basePolicy),
  ...overrides
});

test('source-evaluated low-risk retrieval change is eligible only, not published',()=>{
  const r=ask();
  assert.equal(r.decision,DECISIONS.ELIGIBLE_LOW_RISK);
  assert.equal(r.autoPromote,true);
  assert.equal(r.canPublish,false);
  assert.equal(r.metrics.sampleCount,500);
});
test('no explicit independent owner permission means review, never autopromote',()=>{
  const r=ask({controls:{...controls,ownerHasExplicitlyEnabledAutoPromotion:false}});
  assert.equal(r.decision,DECISIONS.OWNER_REVIEW);
  assert.equal(r.autoPromote,false);
  assert.equal(r.canPublish,false);
});
test('unreviewed or unmatched holdout never learns',()=>{
  assert.equal(ask({challenger:{...challenger,sourceApproved:false}}).decision,DECISIONS.BLOCKED);
  assert.equal(ask({challenger:{...challenger,datasetSha256:'c'.repeat(64)}}).reason,
    'NONCOMPARABLE_EVIDENCE');
  assert.equal(ask({baseline:{...baseline,sampleCount:20},
    challenger:{...challenger,sampleCount:20}}).reason,'INSUFFICIENT_HELD_OUT_CASES');
});
test('rejects unsafe evidence gains, fairness and privacy regressions',()=>{
  assert.equal(ask({challenger:{...challenger,privacyIncidentCount:1}}).reason,'PRIVACY_REGRESSION');
  assert.equal(ask({challenger:{...challenger,unsupportedCount:1,abstentionCount:47}})
    .reason,'UNSUPPORTED_CLAIM_REGRESSION');
  assert.equal(ask({challenger:{...challenger,fairnessGapBps:200}})
    .reason,'FAIRNESS_REGRESSION');
});
test('rejects raw answers, user messages and arbitrary policy keys',()=>{
  assert.equal(ask({challenger:{...challenger,questionText:'someone private'}})
    .reason,'EVALUATION_UNVERIFIED');
  assert.equal(ask({candidatePolicy:{...trialPolicy,command:'execute arbitrary JS'}})
    .reason,'RETRIEVAL_POLICY_INVALID');
  assert.equal(ask({expectedActivePolicySha256:'f'.repeat(64)})
    .reason,'STALE_ACTIVE_POLICY');
});
test('suspended engine plans no work and offline worker claims no learning',()=>{
  assert.equal(planDailyLearning({runDay:'2026-10-23',learningEnabled:false,workerStatus:'ONLINE'})
    .decision,DECISIONS.BLOCKED);
  assert.equal(planDailyLearning({runDay:'2026-10-23',learningEnabled:true,workerStatus:'OFFLINE'})
    .status,'WAIT_FOR_APPROVED_WORKER');
});
test('official admission/scientific rules remain human approved',()=>{
  assert.equal(requiresHumanApproval(LEARNING_MODES.SCIENTIFIC_SCORING),true);
  assert.equal(requiresHumanApproval(LEARNING_MODES.EDUCATIONAL_RULE),true);
  assert.equal(requiresHumanApproval(LEARNING_MODES.RETRIEVAL_TUNING),false);
});
