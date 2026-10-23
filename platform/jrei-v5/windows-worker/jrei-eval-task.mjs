/**
 * JREI LOCAL WINDOWS EVALUATION THREAD — deliberately narrow allowlist.
 *
 * Loaded only by jrei-worker.mjs. No remote commands, plugins, dynamic import,
 * Windows registry access, outbound HTTP, user account data or model training.
 * The dataset is a *separately reviewed public educational holdout* already
 * available as a local owner-approved JSON file. No server sends raw content.
 */
import { workerData, parentPort } from 'node:worker_threads';
import { open, lstat } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import {
  fingerprintReviewedRetrievalCorpus,
  compareReviewedRetrieval
} from '../jrei-reviewed-retrieval-evaluator.mjs';

const MAX_DATASET_BYTES = 8 * 1024 * 1024;
const HEX = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{1,64}$/;
const TASK = 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION';

async function loadReviewedFixture(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.length > 500)
    throw Error('LOCAL_DATASET_PATH_INVALID');
  const absolute = resolve(path);
  // A process must not be tricked into opening an unexpected symlink.
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 ||
      stat.size > MAX_DATASET_BYTES)
    throw Error('LOCAL_DATASET_FILE_INVALID');
  const handle = await open(absolute, 'r');
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== stat.size ||
        opened.size > MAX_DATASET_BYTES)
      throw Error('LOCAL_DATASET_CHANGED_DURING_READ');
    const input = Buffer.alloc(opened.size);
    let count = 0;
    while (count < input.length) {
      const { bytesRead } = await handle.read(input, count, input.length-count, count);
      if (bytesRead === 0) throw Error('LOCAL_DATASET_SHORT_READ');
      count += bytesRead;
    }
    const data = JSON.parse(input.toString('utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object' ||
        Object.keys(data).sort().join(',') !== 'heldOutCases,reviewedEvidence' ||
        !Array.isArray(data.reviewedEvidence) ||
        !Array.isArray(data.heldOutCases))
      throw Error('LOCAL_PUBLIC_CORPUS_FORMAT_INVALID');
    return data;
  } finally { await handle.close(); }
}

async function evaluate() {
  const { job, localDataset } = workerData ?? {};
  if (!job || typeof job !== 'object' ||
      job.taskType !== TASK || !ID.test(job.datasetId ?? '') ||
      job.datasetId !== localDataset?.id ||
      !HEX.test(job.datasetSha256 ?? '') ||
      !HEX.test(job.evidenceSha256 ?? '') ||
      job.datasetSha256 !== localDataset.datasetSha256 ||
      job.evidenceSha256 !== localDataset.evidenceSha256 ||
      job.evaluationVersion !== localDataset.evaluationVersion)
    throw Error('TASK_OR_DATASET_NOT_OWNER_APPROVED');
  const fixture = await loadReviewedFixture(localDataset.path);
  const digest = fingerprintReviewedRetrievalCorpus(fixture);
  if (digest.datasetSha256 !== job.datasetSha256 ||
      digest.evidenceSha256 !== job.evidenceSha256)
    throw Error('LOCAL_CORPUS_DIGEST_MISMATCH');
  if (digest.caseCount < 200)
    throw Error('INSUFFICIENT_APPROVED_HOLDOUTS');
  const now = new Date().toISOString().slice(0, 10);
  const comparison = compareReviewedRetrieval({
    reviewedEvidence: fixture.reviewedEvidence,
    heldOutCases: fixture.heldOutCases,
    currentPolicy: job.currentPolicy,
    candidatePolicy: job.candidatePolicy,
    expectedRunDay: now,
    evaluationVersion: job.evaluationVersion,
    independentSourceReview: true,
    controls: { learningEnabled: true, killSwitch: false,
      autoPromoteLowRisk: false, ownerHasExplicitlyEnabledAutoPromotion: false },
    expectedActivePolicySha256: localDataset.activePolicySha256
  });
  if (comparison.datasetSha256 !== job.datasetSha256 ||
      comparison.evidenceSha256 !== job.evidenceSha256 ||
      comparison.caseCount !== digest.caseCount ||
      comparison.modelTrained !== false ||
      comparison.learningPublished !== false ||
      comparison.measuredWorkerLatency !== false)
    throw Error('REVIEW_COMPARISON_CONTRACT_INVALID');
  // Strict insertion order matches the existing signed Bertina result schema.
  // Worker-generated aggregate data is NOT independently attested at receipt;
  // every result goes to the owner's review queue, never to public learners.
  return {
    schema: comparison.schema,
    datasetSha256: comparison.datasetSha256,
    evidenceSha256: comparison.evidenceSha256,
    caseCount: comparison.caseCount,
    baselineCorrect: comparison.baselineCorrect,
    candidateCorrect: comparison.candidateCorrect,
    baselineAbstained: comparison.baselineAbstained,
    candidateAbstained: comparison.candidateAbstained,
    decision: comparison.decision,
    reason: comparison.reason,
    measuredWorkerLatency: false
  };
}

try {
  const result = await evaluate();
  parentPort?.postMessage({ok:true,result});
} catch (error) {
  // Only fixed error codes are returned, never learner examples, local
  // paths, source excerpts, stack traces or personally identifying data.
  const code = error?.message;
  const allowed = new Set([
    'LOCAL_DATASET_PATH_INVALID','LOCAL_DATASET_FILE_INVALID',
    'LOCAL_DATASET_CHANGED_DURING_READ','LOCAL_DATASET_SHORT_READ',
    'LOCAL_PUBLIC_CORPUS_FORMAT_INVALID','TASK_OR_DATASET_NOT_OWNER_APPROVED',
    'LOCAL_CORPUS_DIGEST_MISMATCH','INSUFFICIENT_APPROVED_HOLDOUTS',
    'REVIEW_COMPARISON_CONTRACT_INVALID',
    'REVIEWED_EVIDENCE_COLLECTION_INVALID',
    'REVIEWED_HOLDOUT_COLLECTION_INVALID',
    'INDEPENDENT_SOURCE_REVIEW_REQUIRED'
  ]);
  parentPort?.postMessage({ok:false,code:allowed.has(code)
    ?code:'LOCAL_EVALUATION_REQUIRES_OWNER_REVIEW'});
}
