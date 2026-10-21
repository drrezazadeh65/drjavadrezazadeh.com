/* JR Admission Intelligence v1: deterministic, explainable, evidence-gated choice analysis.
 *
 * What this is:   a decision-support core. Every output is reproducible from its inputs
 *                 and carries the findings, audit steps and input digest that explain it.
 * What it is not: a trained or statistical prediction model. admissionProbability is
 *                 ALWAYS null. Competitiveness is descriptive (where a verified value sits
 *                 against verified historical cut-offs), never a probability.
 * Guarantees:     no I/O, no clock, no randomness, no external services, no mutation of
 *                 inputs, no personal identifiers accepted, no automated admission.
 */

export const ADMISSION_REASONER_VERSION = '1.0.0';
export const ADMISSION_REASONER_SCHEMA = 'jr-admission-reasoner-v2';

export const STATUS = Object.freeze({
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  REQUIREMENTS_SATISFIED: 'REQUIREMENTS_SATISFIED',
  REQUIREMENTS_NOT_SATISFIED: 'REQUIREMENTS_NOT_SATISFIED',
});

export const TIER = Object.freeze({
  SAFER: 'SAFER',
  TARGET: 'TARGET',
  REACH: 'REACH',
  INELIGIBLE: 'INELIGIBLE',
  UNASSESSED: 'UNASSESSED',
});

const TRACKS = new Set(['EXAM', 'RECORDS_BASED']);
const REQUIREMENT_STATUSES = new Set(['MET', 'NOT_MET', 'UNKNOWN']);
const PII_KEY = /^(?:(?:student|candidate|guardian|parent|person|user|applicant)[_-]?)?(?:name|first[_-]?name|last[_-]?name|full[_-]?name|national[_-]?(?:id|code)|nid|phone|mobile|email|address|dob|birth[_-]?date|passport|ssn|student[_-]?id)$/i;

const DEFAULTS = Object.freeze({
  minHistoryYears: 2,
  maxHistoryYears: 5,
  maxOfferings: 500,
  maxRules: 100,
  maxRequirements: 200,
  maxScanNodes: 5000,
});

/* ---------- small utilities ---------- */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPosInt = (v) => Number.isSafeInteger(v) && v > 0;
const isPosNum = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

function resolveOptions(options) {
  const o = isObj(options) ? options : {};
  const pick = (k) => (Number.isSafeInteger(o[k]) && o[k] > 0 ? o[k] : DEFAULTS[k]);
  return {
    minHistoryYears: pick('minHistoryYears'),
    maxHistoryYears: Math.max(pick('maxHistoryYears'), pick('minHistoryYears')),
    maxOfferings: pick('maxOfferings'),
    maxRules: pick('maxRules'),
    maxRequirements: pick('maxRequirements'),
    maxScanNodes: pick('maxScanNodes'),
  };
}

/** Canonical JSON: sorted keys, bounded depth, stable for equal inputs. */
function canonical(v, depth = 0) {
  if (depth > 12) return '"[DEPTH]"';
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '"[NONFINITE]"';
  if (v === undefined) return 'null';
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x, depth + 1)).join(',') + ']';
  if (typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
  }
  return '"[UNSUPPORTED]"';
}

/** FNV-1a 64-bit. An audit fingerprint for reproducibility, NOT a security hash. */
function digest(value) {
  const s = canonical(value);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return 'fnv1a64:' + h.toString(16).padStart(16, '0');
}

/** Bounded scan for personal-identifier keys anywhere in the inputs. */
function scanForIdentifiers(root, label, limit) {
  const hits = [];
  let nodes = 0;
  let truncated = false;
  const walk = (v, path, depth) => {
    if (truncated || v === null || typeof v !== 'object') return;
    if (++nodes > limit || depth > 8) { truncated = true; return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
    for (const k of Object.keys(v)) {
      if (PII_KEY.test(k)) hits.push(`${path}.${k}`);
      walk(v[k], `${path}.${k}`, depth + 1);
    }
  };
  walk(root, label, 0);
  return { hits, truncated };
}

function median(sorted) {
  const n = sorted.length;
  const mid = n >> 1;
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round4 = (x) => Math.round(x * 10000) / 10000;

/* ---------- findings / audit ---------- */

function createLedger() {
  const blocking = [];
  const unmet = [];
  const advisory = [];
  const audit = [];
  const push = (list, code, path, subject) =>
    list.push(subject === undefined ? { code, path } : { code, path, subject });
  return {
    block: (code, path, subject) => push(blocking, code, path, subject),
    unmet: (code, path, subject) => push(unmet, code, path, subject),
    note: (code, path, subject) => push(advisory, code, path, subject),
    step: (name, outcome, detail) => audit.push(detail === undefined ? { step: name, outcome } : { step: name, outcome, detail }),
    blocking, unmetList: unmet, advisory, audit,
    blockingCount: () => blocking.length,
  };
}

const issueString = (f) => (f.subject === undefined ? f.code : `${f.code}:${f.subject}`);
const sortedFindings = (list) =>
  [...list].sort((a, b) => (issueString(a) < issueString(b) ? -1 : issueString(a) > issueString(b) ? 1 : 0));

/* ---------- competitiveness (descriptive, evidence-gated) ---------- */

/**
 * Compares a verified candidate value with verified historical cut-offs.
 * metric 'rank': lower is better. metric 'score': higher is better.
 */
function assessCompetitiveness({ metric, value, history, offeringYear, opts }) {
  const key = metric === 'rank' ? 'lastAdmittedRank' : 'lastAdmittedScore';
  const seen = new Set();
  const usable = [];
  for (const h of Array.isArray(history) ? history : []) {
    if (!isObj(h) || h.sourceVerified !== true || h.sourcePageVerified !== true || h.independentReviewStatus !== 'APPROVED') continue;
    if (h.admissionTrack !== opts.admissionTrack || h.examinationGroup !== opts.examinationGroup || h.quotaKey !== opts.quotaKey) continue;
    if (!isNonEmptyStr(h.sourceFileId) || !isPosInt(h.sourcePage)) continue;
    if (!Number.isSafeInteger(h.year) || h.year >= offeringYear || h.year < offeringYear - opts.maxHistoryYears || seen.has(h.year)) continue;
    if (!isPosNum(h[key])) continue;
    seen.add(h.year);
    usable.push({ year: h.year, cutoff: h[key] });
  }
  usable.sort((a, b) => b.year - a.year);
  const window = usable.slice(0, opts.maxHistoryYears);

  if (window.length < opts.minHistoryYears) {
    return { tier: TIER.UNASSESSED, band: 'INSUFFICIENT_HISTORY', historyYears: window.map((w) => w.year).sort((a, b) => a - b), required: opts.minHistoryYears };
  }

  const sign = metric === 'rank' ? -1 : 1; // normalise so higher is always better
  const v = sign * value;
  const cs = window.map((w) => sign * w.cutoff);
  const strictest = Math.max(...cs); // hardest year to clear
  const easiest = Math.min(...cs);
  const med = median([...cs].sort((a, b) => a - b));

  let band, tier, yearsCleared;
  yearsCleared = cs.filter((c) => v >= c).length;
  if (v >= strictest) { band = 'CLEARS_ALL_RECORDED_CUTOFFS'; tier = TIER.SAFER; }
  else if (v < easiest) { band = 'CLEARS_NO_RECORDED_CUTOFF'; tier = TIER.REACH; }
  else { band = 'CLEARS_SOME_RECORDED_CUTOFFS'; tier = TIER.TARGET; }

  return {
    tier,
    band,
    metric,
    value,
    yearsCleared,
    yearsConsidered: window.length,
    historyYears: window.map((w) => w.year).sort((a, b) => a - b),
    marginVsMedian: round4((v - med) / Math.abs(med)), // positive = better than median cut-off
    note: 'Descriptive position against verified historical cut-offs; not a probability and not a guarantee.',
  };
}

/* ---------- core evaluation ---------- */

function evaluate(candidate, offering, rule, opts, preFindings = []) {
  const L = createLedger();
  const base = { candidate, offering, rule };
  const inputDigest = digest(base);

  const finish = (status, extra = {}) => {
    const blocking = sortedFindings(L.blocking);
    const result = {
      schema: ADMISSION_REASONER_SCHEMA,
      version: ADMISSION_REASONER_VERSION,
      status,
      eligible: null,
      admissionProbability: null,
      rank: null,
      tier: TIER.UNASSESSED,
      issues: [...new Set(blocking.map(issueString))],
      findings: blocking,
      evidence: [...new Set(sortedFindings(L.unmetList).map(issueString))].map((s) => 'UNMET_REQUIREMENT:' + s),
      advisories: sortedFindings(L.advisory),
      competitiveness: null,
      audit: L.audit,
      inputDigest,
      decisionAuthority: 'INPUT_CLAIMS_ONLY',
      officialEligibilityEstablished: false,
      publicReady: false,
      ...extra,
    };
    return deepFreeze(result);
  };

  /* 1. structure */
  for (const [name, v, code] of [['candidate', candidate, 'MISSING_CANDIDATE'], ['offering', offering, 'MISSING_OFFERING'], ['rule', rule, 'MISSING_RULE']]) {
    if (!isObj(v)) L.block(code, name);
  }
  for (const f of preFindings) L.block(f.code, f.path, f.subject);
  if (L.blockingCount()) {
    L.step('STRUCTURE', 'FAIL');
    return finish(STATUS.INSUFFICIENT_EVIDENCE, { explanation: 'Required inputs are missing or ambiguous; nothing can be concluded.' });
  }
  L.step('STRUCTURE', 'PASS');

  /* 2. privacy gate: refuse personal identifiers outright */
  const scan = scanForIdentifiers({ candidate, offering, rule }, 'input', opts.maxScanNodes);
  for (const p of scan.hits) L.block('PERSONAL_IDENTIFIER_PRESENT', p);
  if (scan.truncated) L.block('INPUT_TOO_LARGE_TO_SCREEN', 'input');
  if (L.blockingCount()) {
    L.step('PRIVACY', 'FAIL');
    return finish(STATUS.INSUFFICIENT_EVIDENCE, { explanation: 'Inputs must be de-identified. Remove personal identifiers and resubmit.' });
  }
  L.step('PRIVACY', 'PASS');

  /* 3. independent verification of the sources */
  if (!TRACKS.has(offering.admissionTrack)) L.block('UNSUPPORTED_ADMISSION_TRACK', 'offering.admissionTrack');
  if (offering.reviewState !== 'APPROVED') L.block('OFFERING_NOT_INDEPENDENTLY_VERIFIED', 'offering.reviewState', 'reviewState');
  if (offering.sourcePageReviewed !== true) L.block('OFFERING_NOT_INDEPENDENTLY_VERIFIED', 'offering.sourcePageReviewed', 'sourcePageReviewed');
  if (offering.conditionsReviewed !== true) L.block('OFFERING_NOT_INDEPENDENTLY_VERIFIED', 'offering.conditionsReviewed', 'conditionsReviewed');
  if (offering.documentApproved !== true) L.block('OFFERING_NOT_INDEPENDENTLY_VERIFIED', 'offering.documentApproved', 'documentApproved');
  if (rule.reviewState !== 'APPROVED') L.block('RULE_NOT_INDEPENDENTLY_VERIFIED', 'rule.reviewState', 'reviewState');
  if (rule.sourceVerified !== true) L.block('RULE_NOT_INDEPENDENTLY_VERIFIED', 'rule.sourceVerified', 'sourceVerified');
  if (!(isNonEmptyStr(rule.version) || Number.isFinite(rule.version))) L.block('RULE_VERSION_MISSING', 'rule.version');
  L.step('SOURCE_VERIFICATION', L.blockingCount() ? 'FAIL' : 'PASS');

  /* 4. context consistency */
  const before = L.blockingCount();
  if (candidate.examYear !== offering.year || rule.year !== offering.year) L.block('YEAR_MISMATCH', 'year');
  if (candidate.examinationGroup !== offering.examinationGroup) L.block('EXAMINATION_GROUP_MISMATCH', 'examinationGroup');
  if (rule.admissionTrack !== offering.admissionTrack) L.block('RULE_TRACK_MISMATCH', 'rule.admissionTrack');
  if (rule.examinationGroup !== undefined && rule.examinationGroup !== offering.examinationGroup) L.block('RULE_GROUP_MISMATCH', 'rule.examinationGroup');
  L.step('CONTEXT_MATCH', L.blockingCount() > before ? 'FAIL' : 'PASS');

  /* 5. candidate evidence for the track */
  const beforeEvidence = L.blockingCount();
  let verifiedValue = null;
  let metric = null;
  if (offering.admissionTrack === 'EXAM') {
    metric = 'rank';
    if (!isPosInt(candidate.rank)) L.block('NO_VERIFIED_RANK', 'candidate.rank');
    if (candidate.rankSourceVerified !== true) L.block('RANK_SOURCE_UNVERIFIED', 'candidate.rankSourceVerified');
    if (isPosInt(candidate.rank) && candidate.rankSourceVerified === true) verifiedValue = candidate.rank;
  } else if (offering.admissionTrack === 'RECORDS_BASED') {
    metric = 'score';
    if (candidate.academicRecordStatus !== 'VERIFIED') L.block('ACADEMIC_RECORD_NOT_VERIFIED', 'candidate.academicRecordStatus');
    if (rule.minimumRecordScore !== undefined) {
      if (!isPosNum(rule.minimumRecordScore)) L.block('RULE_MINIMUM_SCORE_INVALID', 'rule.minimumRecordScore');
      else if (!isPosNum(candidate.recordScore)) L.block('RECORD_SCORE_MISSING', 'candidate.recordScore');
      else if (candidate.recordScore < rule.minimumRecordScore) L.unmet('MINIMUM_RECORD_SCORE', 'candidate.recordScore', 'MINIMUM_RECORD_SCORE');
    }
    if (candidate.academicRecordStatus === 'VERIFIED' && isPosNum(candidate.recordScore)) verifiedValue = candidate.recordScore;
  }
  L.step('CANDIDATE_EVIDENCE', L.blockingCount() > beforeEvidence ? 'FAIL' : 'PASS');

  /* 6. requirements */
  const beforeReq = L.blockingCount();
  if (!Array.isArray(offering.requirements)) {
    L.block('REQUIREMENTS_NOT_REVIEWED', 'offering.requirements');
  } else if (offering.requirements.length > opts.maxRequirements) {
    L.block('TOO_MANY_REQUIREMENTS', 'offering.requirements');
  } else {
    const codes = new Set();
    offering.requirements.forEach((req, i) => {
      const path = `offering.requirements[${i}]`;
      if (!isObj(req) || !isNonEmptyStr(req.code) || !REQUIREMENT_STATUSES.has(req.status)
          || (req.mandatory !== undefined && typeof req.mandatory !== 'boolean')) {
        L.block('INVALID_REQUIREMENT', path);
        return;
      }
      if (codes.has(req.code)) { L.block('DUPLICATE_REQUIREMENT', path, req.code); return; }
      codes.add(req.code);
      const mandatory = req.mandatory !== false;
      if (req.status === 'UNKNOWN') {
        if (mandatory) L.block('UNRESOLVED_REQUIREMENT', path, req.code);
        else L.note('OPTIONAL_REQUIREMENT_UNRESOLVED', path, req.code);
      } else if (req.status === 'NOT_MET') {
        if (mandatory) L.unmet('UNMET_REQUIREMENT', path, req.code);
        else L.note('OPTIONAL_REQUIREMENT_NOT_MET', path, req.code);
      }
    });
    if (rule.requiredRequirementCodes !== undefined) {
      if (!Array.isArray(rule.requiredRequirementCodes)) L.block('RULE_REQUIRED_CODES_INVALID', 'rule.requiredRequirementCodes');
      else for (const code of rule.requiredRequirementCodes) {
        if (!codes.has(code)) L.block('MISSING_REQUIRED_REQUIREMENT', 'offering.requirements', String(code));
      }
    }
  }
  L.step('REQUIREMENTS', L.blockingCount() > beforeReq ? 'FAIL' : 'PASS');

  /* gate: any blocking finding means no conclusion */
  if (L.blockingCount()) {
    return finish(STATUS.INSUFFICIENT_EVIDENCE, {
      explanation: 'Evidence is incomplete or unverified; no eligibility conclusion is drawn.',
      ruleVersion: Number.isFinite(rule.version) || isNonEmptyStr(rule.version) ? String(rule.version) : null,
    });
  }

  const eligible = L.unmetList.length === 0;
  const common = {
    eligible,
    ruleVersion: String(rule.version),
    offeringId: isNonEmptyStr(offering.id) ? offering.id : null,
  };

  if (!eligible) {
    L.step('COMPETITIVENESS', 'SKIPPED', 'not eligible');
    return finish(STATUS.REQUIREMENTS_NOT_SATISFIED, {
      ...common,
      tier: TIER.INELIGIBLE,
      explanation: 'At least one verified mandatory requirement is not met.',
    });
  }

  /* 7. descriptive competitiveness, only when verified history exists */
  const historyContext = { ...opts, admissionTrack: offering.admissionTrack, examinationGroup: offering.examinationGroup, quotaKey: candidate.quotaKey };
  const comp = isNonEmptyStr(candidate.quotaKey) && offering.quotaKey === candidate.quotaKey
    ? assessCompetitiveness({ metric, value: verifiedValue, history: offering.cutoffHistory, offeringYear: offering.year, opts: historyContext })
    : { tier: TIER.UNASSESSED, band: 'QUOTA_CONTEXT_NOT_VERIFIED', historyYears: [] };
  L.step('COMPETITIVENESS', comp.tier === TIER.UNASSESSED ? 'SKIPPED' : 'PASS', comp.band);
  return finish(STATUS.REQUIREMENTS_SATISFIED, {
    ...common,
    tier: comp.tier,
    competitiveness: comp,
    explanation: 'Known verified requirements are satisfied; admission is not guaranteed.',
  });
}

/* ---------- public API ---------- */

export function evaluateAdmissionChoice({ candidate, offering, rule, options } = {}) {
  return evaluate(candidate, offering, rule, resolveOptions(options));
}

function selectRule(rules, offering) {
  if (!isObj(offering)) return { rule: undefined, findings: [] };
  const matches = rules.filter((r) => isObj(r) && r.year === offering.year && r.admissionTrack === offering.admissionTrack
    && (r.examinationGroup === undefined || r.examinationGroup === offering.examinationGroup));
  if (matches.length > 1) return { rule: undefined, findings: [{ code: 'AMBIGUOUS_RULE', path: 'rules', subject: String(matches.length) }] };
  return { rule: matches[0], findings: [] };
}

export function evaluateAdmissionChoices({ candidate, offerings, rules, options } = {}) {
  const opts = resolveOptions(options);
  if (!Array.isArray(offerings) || offerings.length > opts.maxOfferings || !Array.isArray(rules) || rules.length > opts.maxRules) {
    throw new TypeError('Bounded offerings and rules arrays required');
  }

  const idCounts = new Map();
  for (const o of offerings) if (isObj(o) && isNonEmptyStr(o.id)) idCounts.set(o.id, (idCounts.get(o.id) || 0) + 1);

  const results = offerings.map((offering) => {
    const { rule, findings } = selectRule(rules, offering);
    const pre = [...findings];
    if (isObj(offering) && isNonEmptyStr(offering.id) && idCounts.get(offering.id) > 1) {
      pre.push({ code: 'DUPLICATE_OFFERING', path: 'offering.id', subject: offering.id });
    }
    return evaluate(candidate, offering, rule, opts, pre);
  });

  const tiers = { SAFER: 0, TARGET: 0, REACH: 0, INELIGIBLE: 0, UNASSESSED: 0 };
  const statuses = { INSUFFICIENT_EVIDENCE: 0, REQUIREMENTS_SATISFIED: 0, REQUIREMENTS_NOT_SATISFIED: 0 };
  for (const r of results) { tiers[r.tier]++; statuses[r.status]++; }

  const assessed = tiers.SAFER + tiers.TARGET + tiers.REACH;
  const portfolioAdvisories = [];
  if (offerings.length && assessed === 0) portfolioAdvisories.push('NO_ASSESSABLE_CHOICE');
  if (assessed > 0 && tiers.SAFER === 0) portfolioAdvisories.push('NO_SAFER_OPTION');
  if (assessed > 0 && tiers.REACH === assessed) portfolioAdvisories.push('ALL_ASSESSED_CHOICES_ARE_REACH');
  if (offerings.length && tiers.UNASSESSED / offerings.length > 0.5) portfolioAdvisories.push('MAJORITY_UNASSESSED');
  if (statuses.INSUFFICIENT_EVIDENCE > 0) portfolioAdvisories.push('SOME_CHOICES_LACK_VERIFIED_EVIDENCE');

  return deepFreeze({
    schema: ADMISSION_REASONER_SCHEMA,
    version: ADMISSION_REASONER_VERSION,
    results,
    portfolio: {
      total: offerings.length,
      statuses,
      tiers,
      advisories: portfolioAdvisories,
      note: 'Advisory summary only. Tiers describe position against verified history; they do not rank or recommend choices.',
    },
    batchDigest: digest({ candidate, offerings, rules }),
    probabilityModelTrained: false,
    automatedAdmission: false,
    personalDataPersisted: false,
  });
}