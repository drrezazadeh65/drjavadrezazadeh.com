/* Konkur 1405 candidate intake preflight v1.
 *
 * Pure and fail-closed. No DB writes, no predictions, no approvals, no activation.
 * It decides only one thing: which candidate rows are well-formed enough to be handed to an
 * independent human source-page reviewer. Acceptance here is never approval.
 *
 * Guarantees: input rows are never mutated; output is deeply frozen and deterministic;
 * a malformed, hostile or null row rejects that row, it never crashes the batch; if the
 * upstream audit is unavailable or malformed, every row is rejected rather than waved through.
 */
import { auditCandidateRows, normalizeProgrammeCode } from './konkur-1405-intake.mjs';

export const PREFLIGHT_VERSION = '1.0.0';
export const PREFLIGHT_SCHEMA = 'jr-konkur-1405-batch-preflight-v2';

const MAX_ROWS = 20000;
const MAX_TEXT = 300;
const REQUIRED = ['year', 'code', 'sourceFileId', 'page', 'university', 'programme', 'examinationGroup', 'admissionMethod'];
const TEXT_FIELDS = ['sourceFileId', 'university', 'programme', 'examinationGroup', 'admissionMethod'];
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

/** FNV-1a 64-bit over canonical JSON: a reproducibility fingerprint, not a security hash. */
function canonical(v, depth = 0) {
  if (depth > 6) return '"[DEPTH]"';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '"[NONFINITE]"';
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x, depth + 1)).join(',') + ']';
  if (typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
  return '"[UNSUPPORTED]"';
}
function digest(value) {
  const s = canonical(value);
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) h = ((h ^ BigInt(s.charCodeAt(i))) * 0x100000001b3n) & 0xffffffffffffffffn;
  return 'fnv1a64:' + h.toString(16).padStart(16, '0');
}

const asYear = (v) => {
  if (Number.isSafeInteger(v)) return v;
  if (typeof v === 'string' && /^\d{4}$/.test(v.trim())) return Number(v.trim());
  return null;
};
const goodText = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXT && !CONTROL_CHARS.test(v);

export function createKonkurBatchPreflight({
  audit = auditCandidateRows,
  normalizeCode = normalizeProgrammeCode,
  expectedYear = 1405,
  allowedExaminationGroups = null, // e.g. ['MATHEMATICS', ...]; null = no restriction
  maxRows = MAX_ROWS,
} = {}) {
  const allowedGroups = allowedExaminationGroups ? new Set(allowedExaminationGroups) : null;

  /** Field-level checks for one row. Never throws. Returns {problems, year, code}. */
  function checkRow(row) {
    const problems = [];
    if (!isObj(row)) return { problems: ['ROW_NOT_AN_OBJECT'], year: null, code: null };

    const missing = REQUIRED.some((f) => row[f] === undefined || row[f] === null);
    if (missing) problems.push('REQUIRED_FIELD_MISSING');

    const year = asYear(row.year);
    if (row.year !== undefined && row.year !== null) {
      if (year === null) problems.push('YEAR_INVALID');
      else if (expectedYear !== null && year !== expectedYear) problems.push('YEAR_NOT_EXPECTED');
    }

    for (const f of TEXT_FIELDS) {
      if (row[f] !== undefined && row[f] !== null && !goodText(row[f])) problems.push('FIELD_INVALID_TEXT');
    }
    if (row.page !== undefined && row.page !== null && !(Number.isSafeInteger(row.page) && row.page > 0)) problems.push('PAGE_INVALID');
    if (allowedGroups && goodText(row.examinationGroup) && !allowedGroups.has(row.examinationGroup)) problems.push('EXAMINATION_GROUP_NOT_ALLOWED');

    let code = null;
    if (row.code !== undefined && row.code !== null) {
      if (typeof row.code !== 'string') problems.push('CODE_NOT_A_STRING');
      else {
        try {
          const c = normalizeCode(row.code);
          if (typeof c === 'string' && c.length > 0) code = c;
          else problems.push('CODE_UNNORMALISABLE');
        } catch {
          problems.push('CODE_UNNORMALISABLE');
        }
      }
    }
    return { problems, year, code };
  }

  return function prepareKonkurBatch(rows) {
    if (!Array.isArray(rows) || rows.length > maxRows) {
      throw new TypeError(`Expected at most ${maxRows} candidate rows`);
    }

    /* upstream audit, indexed once (the original scanned it per row: O(n²)) */
    const auditIssues = new Map();
    let auditAvailable = true;
    try {
      const a = audit(rows);
      if (!isObj(a) || !Array.isArray(a.invalid) || a.count !== rows.length || a.manifest?.valid !== true) auditAvailable = false;
      else {
        for (const x of a.invalid) {
          if (!isObj(x) || !Number.isSafeInteger(x.index)) { auditAvailable = false; break; }
          const list = auditIssues.get(x.index) || [];
          if (Array.isArray(x.issues)) list.push(...x.issues.map(String));
          else list.push('AUDIT_INVALID_ROW');
          auditIssues.set(x.index, list);
        }
      }
    } catch {
      auditAvailable = false;
    }

    /* pass 1: per-row checks and duplicate grouping */
    const checks = rows.map((row) => checkRow(row));
    const groups = new Map();
    checks.forEach((c, index) => {
      if (c.year === null || c.code === null || !isObj(rows[index]) || !goodText(rows[index].examinationGroup)) return; // unkeyable rows never collide
      const key = `${c.year}/${rows[index].examinationGroup.trim().toUpperCase()}/${c.code}`;
      (groups.get(key) || groups.set(key, []).get(key)).push(index);
    });
    const signature = (r) => [r.sourceFileId, r.page, r.university, r.programme, r.admissionMethod].join('\u0001');
    const dupIssue = new Map(); // index -> {issue, of}
    for (const idxs of groups.values()) {
      if (idxs.length < 2) continue;
      const sigs = new Set(idxs.map((i) => signature(rows[i])));
      if (sigs.size === 1) idxs.slice(1).forEach((i) => dupIssue.set(i, { issue: 'DUPLICATE_INPUT_CODE', of: idxs[0] }));
      else idxs.forEach((i) => dupIssue.set(i, { issue: 'CONFLICTING_DUPLICATE_INPUT_CODE', of: idxs[0] }));
    }

    /* pass 2: verdicts */
    const acceptedForReview = [];
    const rejected = [];
    const histogram = new Map();
    const perFile = new Map();
    const bump = (m, k, f) => m.set(k, { ...(m.get(k) || { accepted: 0, rejected: 0 }), [f]: ((m.get(k) || {})[f] || 0) + 1 });

    rows.forEach((row, index) => {
      const { problems, code } = checks[index];
      const all = [...problems];
      if (!auditAvailable) all.push('AUDIT_UNAVAILABLE');
      else if (auditIssues.has(index)) all.push(...auditIssues.get(index));
      const dup = dupIssue.get(index);
      if (dup) all.push(dup.issue);
      const fileId = isObj(row) && goodText(row.sourceFileId) ? row.sourceFileId : '(unknown)';

      if (all.length) {
        const issues = [...new Set(all)].sort();
        issues.forEach((i) => histogram.set(i, (histogram.get(i) || 0) + 1));
        const entry = { index, issues };
        if (dup && dup.of !== index) entry.duplicateOfIndex = dup.of;
        rejected.push(entry);
        bump(perFile, fileId, 'rejected');
      } else {
        acceptedForReview.push({
          index,
          sourceFileId: row.sourceFileId,
          page: row.page,
          code: row.code,
          programmeCodeNormalized: code,
          reviewState: 'AWAITING_INDEPENDENT_SOURCE_PAGE_REVIEW',
        });
        bump(perFile, fileId, 'accepted');
      }
    });

    /* reviewers work file by file, page by page: give them that order */
    const reviewQueue = [...acceptedForReview]
      .sort((a, b) => cmp(a.sourceFileId, b.sourceFileId) || a.page - b.page || a.index - b.index)
      .map((r) => r.index);

    return deepFreeze({
      schema: PREFLIGHT_SCHEMA,
      version: PREFLIGHT_VERSION,
      inputCount: rows.length,
      acceptedForReview,
      rejected,
      reviewQueue,
      summary: {
        accepted: acceptedForReview.length,
        rejected: rejected.length,
        auditAvailable,
        issueHistogram: [...histogram.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).map(([code, rows]) => ({ code, rows })),
        bySourceFile: [...perFile.entries()].sort((a, b) => cmp(a[0], b[0])).map(([sourceFileId, v]) => ({ sourceFileId, accepted: v.accepted || 0, rejected: v.rejected || 0 })),
      },
      inputDigest: digest(rows),
      publicOfferingsCreated: 0,
      databaseWrites: 0,
      probabilityEstimates: 0,
      requiresIndependentPageReview: true,
      automaticActivation: false,
    });
  };
}

export const prepareKonkurBatch = createKonkurBatchPreflight();