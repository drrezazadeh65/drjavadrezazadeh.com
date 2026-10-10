import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';

// Server-side reference implementation. Never import into browser bundles or Cloudflare Workers.
// Cloudflare production implementation must use Web Crypto and durable, atomic storage.
export function newOpaqueToken() {
  return randomBytes(32).toString('base64url');
}
export function hashToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('invalid_token');
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
export function tokenRecord({token, purpose, accountId, now = Date.now(), ttlMs = 15 * 60_000}) {
  if (!['verify_email', 'reset_password'].includes(purpose)) throw new Error('invalid_purpose');
  if (typeof accountId !== 'string' || !accountId.trim()) throw new Error('invalid_account');
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 60_000 || ttlMs > 60 * 60_000) throw new Error('invalid_ttl');
  return {tokenHash:hashToken(token),purpose,accountId,expiresAt:now+ttlMs,consumedAt:null};
}
export function canConsumeToken(record, token, purpose, now = Date.now()) {
  if (!record || record.purpose !== purpose || record.consumedAt !== null || !Number.isFinite(record.expiresAt) || now >= record.expiresAt) return false;
  let candidate;
  try { candidate=Buffer.from(hashToken(token),'hex'); } catch { return false; }
  const expected=Buffer.from(record.tokenHash || '', 'hex');
  return expected.length===candidate.length && timingSafeEqual(expected,candidate);
}
// IMPORTANT: canConsumeToken is only a predicate. Production must atomically mark a token
// consumed in D1 before accepting it; a separate check-and-update is race-prone.
