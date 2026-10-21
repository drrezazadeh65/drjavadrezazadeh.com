/**
 * JR Educational Intelligence V3 — bounded public catalogue tool-call compiler.
 * Pure, non-executing contract for untrusted proposed tool arguments.
 * It does NOT authenticate the caller, validate official sources, query PHP,
 * authorise access to learner records, or enable an LLM in production.
 * The existing PHP /api/konkur/programmes route remains the authority for
 * source-reviewed rows and enforces its own SQL and approval restrictions.
 */
export const PUBLIC_CATALOGUE_TOOL = 'SOURCE_REVIEWED_CATALOGUE_QUERY';
export const PUBLIC_TOOL_CONTRACT_VERSION = '3.0.1-public-read';
const ROUTE = '/api/konkur/programmes';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const onlyKeys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));
const denied = reason => Object.freeze({
  contractVersion: PUBLIC_TOOL_CONTRACT_VERSION, status: 'BLOCKED', reason,
  method: null, path: null, relativeUrl: null, modelMayOverride: false,
  admissionPredictionEnabled: false, officialApplicationSubmitted: false,
});

/**
 * Compiles exactly one PUBLIC, READ-ONLY tool call. Private, predictive,
 * eligibility, assessment and mutation tools are deliberately unavailable.
 * Never forward free-form learner conversations into GET query parameters.
 */
export function compilePublicCatalogueToolCall(call) {
  if (!plain(call) || !onlyKeys(call, ['tool', 'arguments']) ||
      !own(call, 'tool') || !own(call, 'arguments')) return denied('INVALID_TOOL_ENVELOPE');
  if (call.tool !== PUBLIC_CATALOGUE_TOOL) return denied('TOOL_NOT_PUBLICLY_ALLOWLISTED');
  const args = call.arguments;
  if (!plain(args) || !onlyKeys(args, ['year', 'group', 'q', 'limit', 'page']) ||
      !own(args, 'year')) return denied('INVALID_TOOL_ARGUMENT_SCHEMA');
  if (!Number.isInteger(args.year) || args.year < 1300 || args.year > 1499)
    return denied('INVALID_ADMISSION_YEAR');
  if (own(args, 'group') && (typeof args.group !== 'string' ||
      !/^[A-Z0-9_]{2,60}$/.test(args.group))) return denied('INVALID_EXAMINATION_GROUP');
  if (own(args, 'limit') && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50))
    return denied('INVALID_LIMIT');
  if (own(args, 'page') && (!Number.isInteger(args.page) || args.page < 1 || args.page > 999))
    return denied('INVALID_PAGE');
  const limit = own(args, 'limit') ? args.limit : 20;
  const page = own(args, 'page') ? args.page : 1;
  if ((page - 1) * limit > 5000) return denied('PAGE_OUT_OF_RANGE');
  let q = '';
  // Normalize only for detection: Persian/Arabic numerals must not evade the
  // basic public-URL identifier guard. The original search text is preserved.
  const asciiDigits = value => value.replace(/[۰-۹٠-٩]/gu, digit => {
    const n = digit.codePointAt(0);
    return String.fromCharCode(48 + (n >= 0x6f0 ? n - 0x6f0 : n - 0x660));
  });
  if (own(args, 'q')) {
    if (typeof args.q !== 'string') return denied('INVALID_SEARCH');
    q = args.q.trim();
    // The PHP endpoint accepts a search term, not a conversation or personal file.
    // This is a limited hygiene check, not a guarantee of PII detection.
    const screened = asciiDigits(q);
    if ([...q].length > 80 || /[\x00-\x1f\x7f\u2028\u2029]/u.test(q) ||
        /(?:https?:\/\/|www\.|\S+@\S+|\+?\d[\d\s-]{8,}\d|\d{9,})/iu.test(screened))
      return denied('SEARCH_NOT_SUITABLE_FOR_PUBLIC_URL');
  }
  const params = new URLSearchParams({year: String(args.year), limit: String(limit), page: String(page)});
  if (own(args, 'group')) params.set('group', args.group);
  if (q) params.set('q', q);
  const relativeUrl = ROUTE + '?' + params.toString();
  return Object.freeze({
    contractVersion: PUBLIC_TOOL_CONTRACT_VERSION,
    status: 'READY_FOR_PUBLIC_READ', method: 'GET', path: ROUTE, relativeUrl,
    // This contract is not an authorisation token or an evidence certificate.
    requiresTrustedBackendResponse: true, requiresCatalogueAdapter: true,
    modelMayOverride: false, admissionPredictionEnabled: false,
    officialApplicationSubmitted: false, privateLearnerDataPermitted: false,
    note: 'Public catalogue lookup only; PHP source approval and amendments remain authoritative.',
  });
}
