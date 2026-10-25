/**
 * Sanitize Node.js HTTPS failure diagnostics for owner-visible Windows logs.
 * NEVER return raw exception messages, URLs, IP addresses, response bodies,
 * tokens, filesystem paths, TLS peer details, or private configuration.
 * Zero dependencies. No network calls or side effects.
 */
const APPROVED=/^[A-Z0-9_]{3,80}$/;
const TLS_CODES=new Set([
  'CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_SSL_WRONG_VERSION_NUMBER','ERR_TLS_CERT_ALTNAME_INVALID'
]);
const DNS_CODES=new Set(['ENOTFOUND','EAI_AGAIN','EAI_FAIL']);
const TIMEOUT_CODES=new Set(['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT']);
const CONNECT_CODES=new Set(['ECONNREFUSED','ECONNRESET','EHOSTUNREACH',
  'ENETUNREACH','EPIPE','UND_ERR_SOCKET','UND_ERR_CONNECT']);
function knownCauseCode(error){
  // Node fetch often uses TypeError("fetch failed") + cause.code;
  // AggregateError may include multiple well-known transient causes.
  const values=[error?.cause?.code,error?.code];
  if(Array.isArray(error?.cause?.errors))
    for(const e of error.cause.errors.slice(0,8))values.push(e?.code);
  if(Array.isArray(error?.errors))
    for(const e of error.errors.slice(0,8))values.push(e?.code);
  for(const value of values){
    if(typeof value!=='string')continue;
    if(TLS_CODES.has(value))return 'WORKER_TLS_VERIFICATION_FAILED';
    if(DNS_CODES.has(value))return 'WORKER_DNS_RESOLUTION_FAILED';
    if(TIMEOUT_CODES.has(value))return 'WORKER_HTTPS_TIMEOUT';
    if(CONNECT_CODES.has(value))return 'WORKER_NETWORK_CONNECT_FAILED';
  }
  return null;
}
export function workerSafeErrorCode(error){
  const message=typeof error?.message==='string'?error.message:'';
  // First preserve explicitly authored privacy-safe domain error codes.
  if(APPROVED.test(message))return message;
  const known=knownCauseCode(error);
  if(known)return known;
  if(error?.name==='AbortError'||error?.name==='TimeoutError')
    return 'WORKER_HTTPS_TIMEOUT';
  if(error instanceof SyntaxError)return 'WORKER_RESPONSE_JSON_INVALID';
  if(error instanceof TypeError)return 'WORKER_HTTPS_TRANSPORT_FAILED';
  return 'TEMPORARILY_UNAVAILABLE';
}
