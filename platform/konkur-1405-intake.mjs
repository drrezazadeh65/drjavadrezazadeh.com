/* JR Konkur 1405 official-source intake v2: staging only, never an eligibility authority.
 *
 * The Sanjesh issuer is acknowledged. Extracted text and five-digit tokens are NOT verified
 * programme rows: nothing here can set sourcePageVerified, reviewerApproved or
 * eligibleForPublicCatalog to true. Those need a human reviewing the source page.
 *
 * Pure and fail-closed. A malformed manifest, row or text never throws out of the batch audit
 * and never turns into a pass: it turns into an explicit issue.
 */
import manifest from './konkur-1405-sources.json' with { type: 'json' };

export { manifest as officialAdmissionSources1405 };
export const INTAKE_VERSION = '2.0.0';
export const INTAKE_AUDIT_SCHEMA = 'konkur-intake-audit-v2';

const CYCLE = 1405;
const MAX_ROWS = 20000;
const MAX_TEXT = 300;
const MAX_CAPACITY = 10000;
const MAX_PAGE = 100000;
const MAX_EXTRACTED_TEXT = 5_000_000;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const EDGE_MARKS = /^[\s\u200b\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+|[\s\u200b\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+$/g;
const DIGIT_CLASS = /[۰-۹٠-٩０-９]/g;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const goodText = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXT && !CONTROL_CHARS.test(v);

function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

function canonical(v, depth = 0) {
  if (depth > 8) return '"[DEPTH]"';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '"[NONFINITE]"';
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x, depth + 1)).join(',') + ']';
  if (typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
  return '"[UNSUPPORTED]"';
}
/** FNV-1a 64-bit fingerprint for provenance. Not a security hash. */
function digest(value) {
  const s = canonical(value);
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) h = ((h ^ BigInt(s.charCodeAt(i))) * 0x100000001b3n) & 0xffffffffffffffffn;
  return 'fnv1a64:' + h.toString(16).padStart(16, '0');
}

/* ---------- normalisation ---------- */

/** Persian, Arabic-Indic and fullwidth digits to ASCII. Codes are strings: numbers are never coerced. */
export function normalizePersianDigits(value) {
  if (typeof value !== 'string') throw new TypeError('Codes are strings; never coerce numbers');
  return value.replace(DIGIT_CLASS, (c) => {
    const n = c.codePointAt(0);
    if (n >= 0xff10) return String(n - 0xff10);
    return String(n >= 0x6f0 ? n - 0x6f0 : n - 0x660);
  });
}

/** Five ASCII digits after digit normalisation and edge-trimming of whitespace and bidi marks, else null. */
export function normalizeProgrammeCode(value) {
  const code = normalizePersianDigits(value).replace(EDGE_MARKS, '');
  return /^[0-9]{5}$/.test(code) ? code : null;
}

/** Comparison-only text form: unify Arabic/Persian letter variants, drop ZWNJ and bidi marks, collapse spaces. */
export function normalizeComparableText(value) {
  return normalizePersianDigits(String(value))
    .normalize('NFKC')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeYear(v) {
  if (Number.isSafeInteger(v)) return v;
  if (typeof v === 'string') {
    const t = normalizePersianDigits(v).replace(EDGE_MARKS, '');
    if (/^\d{4}$/.test(t)) return Number(t);
  }
  return null;
}

/* ---------- manifest ---------- */

/** Validates the sources manifest once. Ambiguous or malformed entries are excluded, never guessed at. */
export function indexManifest(m) {
  const issues = [];
  const index = new Map();
  if (!isObj(m) || !Array.isArray(m.sources)) {
    return { valid: false, issues: ['MANIFEST_MALFORMED'], index, digest: null, sourceCount: 0 };
  }
  const counts = new Map();
  for (const s of m.sources) if (isObj(s) && goodText(s.fileId)) counts.set(s.fileId, (counts.get(s.fileId) || 0) + 1);
  for (const s of m.sources) {
    if (!isObj(s) || !goodText(s.fileId)) { issues.push('MANIFEST_ENTRY_INVALID'); continue; }
    if (counts.get(s.fileId) > 1) { issues.push('MANIFEST_DUPLICATE_FILE_ID:' + s.fileId); continue; }
    index.set(s.fileId, s);
  }
  if (index.size === 0) issues.push('MANIFEST_HAS_NO_USABLE_SOURCES');
  return { valid: index.size > 0 && issues.length === 0, issues: [...new Set(issues)].sort(), index, digest: digest(m), sourceCount: index.size };
}

/* ---------- token staging ---------- */

/**
 * Finds distinct five-digit tokens in extracted text. They are NOT programme codes until a
 * human confirms them against the PDF table. Accepts one string or an array of per-page strings
 * (then each token carries the first page it appeared on, still unverified).
 */
export function candidateFiveDigitTokens(extractedText, { limit = 500 } = {}) {
  const pages = Array.isArray(extractedText) ? extractedText : [extractedText];
  if (!pages.length || !pages.every((p) => typeof p === 'string')) throw new TypeError('Bounded text required');
  if (pages.reduce((n, p) => n + p.length, 0) > MAX_EXTRACTED_TEXT) throw new TypeError('Bounded text required');
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new RangeError('Invalid token limit');

  const paged = Array.isArray(extractedText);
  const re = /(?<![0-9۰-۹٠-٩０-９])[0-9۰-۹٠-٩０-９]{5}(?![0-9۰-۹٠-٩０-９])/g;
  const byToken = new Map();
  pages.forEach((text, i) => {
    for (const match of text.matchAll(re)) {
      const code = normalizePersianDigits(match[0]);
      const hit = byToken.get(code);
      if (hit) hit.occurrences++;
      else byToken.set(code, { token: code, kind: 'UNCLASSIFIED_FIVE_DIGIT_TOKEN', page: paged ? i + 1 : null, occurrences: 1, verification: 'NEEDS_PDF_TABLE_REVIEW' });
    }
  });
  const all = [...byToken.values()];
  return deepFreeze({
    status: 'STAGING_ONLY',
    tokens: all.slice(0, limit),
    distinctTokensFound: all.length,
    truncated: all.length > limit,
    programmeRecordsVerified: 0,
  });
}

/* ---------- audit ---------- */

function auditRecord(record, manifestIndex, manifestOk) {
  const issues = [];
  const year = normalizeYear(record.year);
  if (year !== CYCLE) issues.push('WRONG_ADMISSION_CYCLE');

  const sourceFileId = goodText(record.sourceFileId) ? record.sourceFileId : null;
  const source = sourceFileId && manifestOk ? manifestIndex.get(sourceFileId) : undefined;
  if (!source) issues.push('SOURCE_NOT_IN_VERIFIED_INVENTORY');
  else if (source.year !== undefined && normalizeYear(source.year) !== CYCLE) issues.push('SOURCE_WRONG_CYCLE');

  let code = null;
  if (typeof record.code === 'string') {
    try { code = normalizeProgrammeCode(record.code); } catch { code = null; }
  }
  if (!code) issues.push('INVALID_FIVE_DIGIT_PROGRAMME_CODE');

  for (const field of ['university', 'programme', 'examinationGroup', 'admissionMethod']) {
    const v = record[field];
    if (typeof v !== 'string' || !v.trim()) issues.push('MISSING_' + field.toUpperCase());
    else if (v.length > MAX_TEXT || CONTROL_CHARS.test(v)) issues.push('INVALID_TEXT_' + field.toUpperCase());
  }
  if (typeof record.admissionMethod === 'string' && /^(unknown|نامشخص)$/i.test(record.admissionMethod.trim())) {
    issues.push('ADMISSION_METHOD_UNKNOWN');
  }

  const pageOk = Number.isSafeInteger(record.page) && record.page >= 1 && record.page <= MAX_PAGE;
  if (!pageOk) issues.push('MISSING_OR_INVALID_PAGE');
  else if (source && Number.isSafeInteger(source.pdfPageCount) && record.page > source.pageCount) issues.push('PAGE_OUT_OF_RANGE');

  if (record.capacity !== null && record.capacity !== undefined) {
    if (!Number.isSafeInteger(record.capacity) || record.capacity < 0) issues.push('INVALID_CAPACITY');
    else if (record.capacity > MAX_CAPACITY) issues.push('IMPLAUSIBLE_CAPACITY');
  }

  // Page anchors, publisher and human sign-off cannot be derived from raw text.
  return {
    year,
    code,
    sourceFileId,
    sourceCategory: source && typeof source.category === 'string' ? source.category : null,
    page: pageOk ? record.page : null,
    status: 'AWAITING_INDEPENDENT_SOURCE_PAGE_REVIEW',
    issues: [...new Set(issues)].sort(),
    sourcePageVerified: false,
    reviewerApproved: false,
    eligibleForPublicCatalog: false,
  };
}

export function createKonkurIntake({ manifest: m = manifest } = {}) {
  const indexed = indexManifest(m);

  function auditProposedProgramme(record) {
    if (!isObj(record)) throw new TypeError('Programme proposal object required');
    return deepFreeze(auditRecord(record, indexed.index, indexed.valid));
  }

  function auditCandidateRows(rows) {
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new TypeError('Bounded intake array required');
    const firstByKey = new Map();
    const duplicates = [];
    const invalid = [];
    const histogram = new Map();
    const signature = (r) => [r.sourceFileId, r.page, r.university, r.programme, r.admissionMethod].map((x) => normalizeComparableText(x ?? '')).join('\u0001');

    rows.forEach((row, index) => {
      if (!isObj(row)) {
        invalid.push({ index, issues: ['ROW_NOT_AN_OBJECT'] });
        histogram.set('ROW_NOT_AN_OBJECT', (histogram.get('ROW_NOT_AN_OBJECT') || 0) + 1);
        return;
      }
      const audited = auditRecord(row, indexed.index, indexed.valid);
      if (audited.issues.length) {
        invalid.push({ index, issues: audited.issues });
        for (const i of audited.issues) histogram.set(i, (histogram.get(i) || 0) + 1);
      }
      if (audited.code && audited.year !== null && goodText(row.examinationGroup)) {
        const key = [audited.year, normalizeComparableText(row.examinationGroup), audited.code].join('/');
        const first = firstByKey.get(key);
        if (first === undefined) firstByKey.set(key, index);
        else {
          const same = signature(rows[first]) === signature(row);
          duplicates.push({ firstIndex: first, duplicateIndex: index, kind: same ? 'EXACT_DUPLICATE' : 'CONFLICTING_DUPLICATE_OR_AMENDMENT' });
        }
      }
    });

    return deepFreeze({
      schema: INTAKE_AUDIT_SCHEMA,
      version: INTAKE_VERSION,
      count: rows.length,
      pendingHumanReview: rows.length,
      pendingWellFormedRows: rows.length - invalid.length,
      publishedCount: 0,
      duplicates,
      invalid,
      issueHistogram: [...histogram.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).map(([code, rows]) => ({ code, rows })),
      manifest: { valid: indexed.valid, usableSources: indexed.sourceCount, issues: indexed.issues, digest: indexed.digest },
      automaticActivation: false,
    });
  }

  return { auditProposedProgramme, auditCandidateRows };
}

const defaultIntake = createKonkurIntake();
export const auditProposedProgramme = defaultIntake.auditProposedProgramme;
export const auditCandidateRows = defaultIntake.auditCandidateRows;