/* JR Konkur AI v1: safe end-to-end analysis orchestration.
 *
 * Pure computation only: no persistence, payments, uploads, network, clock or randomness,
 * and no model-generated admission odds. Fail-closed: any problem produces a structured,
 * explained status, never an exception and never a guess.
 *
 * Standing invariants, true of every output:
 *   admissionProbability = null, officialEligibilityEstablished = false, publicReady = false.
 */
import { normalizeCandidateScorecard, scorecardToReasonerCandidate } from './konkur-scorecard-normalizer.mjs';
import { evaluateAdmissionChoices, ADMISSION_REASONER_VERSION } from './konkur-admission-reasoner.mjs';

export const ADMISSION_PIPELINE_VERSION = '1.0.0';
export const KONKUR_ANALYSIS_SCHEMA = 'jr-konkur-analysis-v2';

export const PIPELINE_STATUS = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_SCORECARD: 'INVALID_SCORECARD',
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  AWAITING_VERIFIED_CATALOGUE: 'AWAITING_VERIFIED_CATALOGUE',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
});

const MAX_OFFERINGS = 500;
const MAX_RULES = 100;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

/** Fields every output carries, regardless of status. */
const invariants = () => ({
  admissionProbability: null,
  officialEligibilityEstablished: false,
  publicReady: false,
});

const BASE_NOTICES = [
  'Decision support only; not an official Sanjesh decision.',
  'Mock-exam rank is never treated as official admission rank.',
  'No statistical admission probability is available without a validated model.',
];

function envelope(status, extra = {}) {
  return deepFreeze({
    schema: KONKUR_ANALYSIS_SCHEMA,
    version: ADMISSION_PIPELINE_VERSION,
    status,
    ...extra,
    ...invariants(),
  });
}

/**
 * How well does the supplied catalogue fit this candidate? Surfaces the common silent failure:
 * a catalogue for the wrong year or group, where every row is rejected for the same reason.
 */
function catalogueDiagnostics(normalized, offerings, rules) {
  let sameYear = 0;
  let sameGroup = 0;
  let sameContext = 0;
  let withRule = 0;
  for (const o of offerings) {
    if (!isObj(o)) continue;
    const y = o.year === normalized.year;
    const g = o.examinationGroup === normalized.examinationGroup;
    if (y) sameYear++;
    if (g) sameGroup++;
    if (y && g) sameContext++;
    if (rules.some((r) => isObj(r) && r.year === o.year && r.admissionTrack === o.admissionTrack)) withRule++;
  }
  return {
    offerings: offerings.length,
    rules: rules.length,
    matchingYear: sameYear,
    matchingExaminationGroup: sameGroup,
    matchingYearAndGroup: sameContext,
    withCandidateRuleForTrack: withRule,
  };
}

function summarise(results) {
  const counts = { requirementsSatisfied: 0, requirementsNotSatisfied: 0, insufficientEvidence: 0 };
  const tiers = { SAFER: 0, TARGET: 0, REACH: 0, INELIGIBLE: 0, UNASSESSED: 0 };
  const issueHistogram = new Map();
  for (const r of results) {
    if (r.status === 'REQUIREMENTS_SATISFIED') counts.requirementsSatisfied++;
    else if (r.status === 'REQUIREMENTS_NOT_SATISFIED') counts.requirementsNotSatisfied++;
    else counts.insufficientEvidence++;
    if (r.tier in tiers) tiers[r.tier]++;
    for (const code of new Set((r.issues || []).map((i) => String(i).split(':')[0]))) {
      issueHistogram.set(code, (issueHistogram.get(code) || 0) + 1);
    }
  }
  // Sorted by frequency, then code, so output is deterministic.
  const topBlockers = [...issueHistogram.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([code, choices]) => ({ code, choices }));
  return { counts, tiers, topBlockers };
}

/**
 * Builds an analyser. Dependencies are injectable so the pipeline is testable in isolation
 * and so a stricter normaliser or reasoner can be swapped in without touching this file.
 *
 * officialRankProviders: providers whose rank may be treated as an official, verified rank.
 *   Default is EMPTY (fail-closed): a rank from any other provider is downgraded to
 *   unverified before it reaches the reasoner, so mock-exam ranks can never satisfy an
 *   EXAM-track choice, whatever the normaliser claimed.
 */
export function createKonkurAnalyser({
  normalize = normalizeCandidateScorecard,
  toCandidate = scorecardToReasonerCandidate,
  evaluate = evaluateAdmissionChoices,
  reasonerVersion = ADMISSION_REASONER_VERSION,
  officialRankProviders = [],
  reasonerOptions,
} = {}) {
  // A caller-provided provider list is not independent attestation. Kept for API compatibility only.
  void officialRankProviders;

  return function analyseKonkurChoices({ scorecard, offerings = [], rules = [] } = {}) {
    /* 1. shape of the request: never throw to the caller */
    const inputIssues = [];
    if (!Array.isArray(offerings)) inputIssues.push('OFFERINGS_NOT_ARRAY');
    else if (offerings.length > MAX_OFFERINGS) inputIssues.push('TOO_MANY_OFFERINGS');
    if (!Array.isArray(rules)) inputIssues.push('RULES_NOT_ARRAY');
    else if (rules.length > MAX_RULES) inputIssues.push('TOO_MANY_RULES');
    if (inputIssues.length) {
      return envelope(PIPELINE_STATUS.INVALID_INPUT, { issues: inputIssues, results: [] });
    }

    try {
      /* 2. scorecard normalisation */
      const normalized = normalize(scorecard);
      if (!isObj(normalized) || normalized.valid !== true) {
        return envelope(PIPELINE_STATUS.INVALID_SCORECARD, {
          issues: Array.isArray(normalized?.issues) ? normalized.issues : ['SCORECARD_NORMALISATION_FAILED'],
          results: [],
        });
      }

      /* 3. candidate for the reasoner, with the official-rank guard */
      const produced = toCandidate(normalized);
      if (!isObj(produced)) {
        return envelope(PIPELINE_STATUS.PIPELINE_ERROR, { issues: ['CANDIDATE_CONVERSION_FAILED'], results: [] });
      }
      const candidate = { ...produced };
      const notices = [...BASE_NOTICES];
      let rankDowngraded = scorecard?.rankVerified === true;
      if (candidate.rankSourceVerified === true) {
        candidate.rankSourceVerified = false;
        rankDowngraded = true;
        notices.push('Client-provided rank verification claims are never authoritative. Independent server-side verification is required.');
      }

      /* 4. no catalogue yet: say so plainly */
      const base = {
        provider: normalized.provider,
        year: normalized.year,
        examinationGroup: normalized.examinationGroup,
        rankAcceptedAsOfficial: candidate.rankSourceVerified === true,
        rankDowngradedToUnverified: rankDowngraded,
      };
      if (offerings.length === 0) {
        return envelope(PIPELINE_STATUS.AWAITING_VERIFIED_CATALOGUE, {
          ...base,
          counts: { requirementsSatisfied: 0, requirementsNotSatisfied: 0, insufficientEvidence: 0 },
          results: [],
          notices,
        });
      }

      /* 5. reasoner */
      const analysis = evaluate({ candidate, offerings, rules, options: reasonerOptions });
      if (!isObj(analysis) || !Array.isArray(analysis.results) || analysis.results.length !== offerings.length || analysis.results.some(r => !isObj(r) || !['INSUFFICIENT_EVIDENCE','REQUIREMENTS_SATISFIED','REQUIREMENTS_NOT_SATISFIED'].includes(r.status) || r.admissionProbability !== null)) {
        return envelope(PIPELINE_STATUS.PIPELINE_ERROR, { issues: ['INVALID_REASONER_CONTRACT'], results: [] });
      }
      const { counts, tiers, topBlockers } = summarise(analysis.results);
      const diagnostics = catalogueDiagnostics(normalized, offerings, rules);

      if (counts.insufficientEvidence > 0) {
        notices.push(`${counts.insufficientEvidence} of ${offerings.length} choices lack verified evidence; no conclusion was drawn for them.`);
      }
      if (diagnostics.matchingYearAndGroup === 0) {
        notices.push('No offering in the catalogue matches this candidate\'s year and examination group.');
      }

      return envelope(PIPELINE_STATUS.ANALYSIS_COMPLETE, {
        ...base,
        counts,
        tiers,
        topBlockers,
        catalogue: diagnostics,
        portfolio: analysis.portfolio ?? null,
        results: analysis.results,
        provenance: {
          reasonerVersion,
          reasonerBatchDigest: analysis.batchDigest ?? null,
        },
        notices,
      });
    } catch (err) {
      // Only the error class is surfaced: messages may echo input.
      return envelope(PIPELINE_STATUS.PIPELINE_ERROR, {
        issues: ['UNEXPECTED_FAILURE:' + (err && err.name ? err.name : 'Error')],
        results: [],
      });
    }
  };
}

/** Default analyser: trusts no provider's rank as official until you say which ones are. */
export const analyseKonkurChoices = createKonkurAnalyser();