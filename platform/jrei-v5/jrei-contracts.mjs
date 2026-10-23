// JREI shared constants and helpers. No network, DB, file I/O or timers except withTimeout().
export const EVIDENCE_LABELS = Object.freeze([
  'OFFICIAL_FACT', 'SOURCE_REVIEWED_FACT', 'DESCRIPTIVE_ANALYSIS',
  'STUDENT_SELF_REPORT', 'HYPOTHESIS', 'INSUFFICIENT_INFORMATION'
]);
export const FACT_LABELS = Object.freeze(['OFFICIAL_FACT', 'SOURCE_REVIEWED_FACT']);

export const SOURCE_STATUS = Object.freeze({
  DISCOVERED: 'DISCOVERED',
  PENDING_POLICY_REVIEW: 'PENDING_POLICY_REVIEW',
  APPROVED: 'APPROVED',
  RESTRICTED: 'RESTRICTED',
  UNAVAILABLE: 'UNAVAILABLE',
  REVOKED: 'REVOKED'
});

export const AUTONOMY_LEVEL = Object.freeze({
  OBSERVE: 0,
  CONTROLLED_ACQUISITION: 1,
  KNOWLEDGE_PREPARATION: 2,
  EVALUATED_UPDATES: 3,
  ASSISTED_REASONING: 4,
  GOVERNED_OPTIMISATION: 5
});

export const ERR = Object.freeze({
  KILL_SWITCH: 'KILL_SWITCH',
  AUTONOMY_DENIED: 'AUTONOMY_DENIED',
  NOT_APPROVED: 'NOT_APPROVED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  TOOL_UNKNOWN: 'TOOL_UNKNOWN',
  TOOL_DISABLED: 'TOOL_DISABLED',
  TOOL_NOT_IMPLEMENTED: 'TOOL_NOT_IMPLEMENTED',
  AUTH_MISSING: 'AUTH_MISSING',
  CONSENT_MISSING: 'CONSENT_MISSING',
  GUARDIAN_MISSING: 'GUARDIAN_MISSING',
  INPUT_INVALID: 'INPUT_INVALID',
  OUTPUT_INVALID: 'OUTPUT_INVALID',
  EVIDENCE_INVALID: 'EVIDENCE_INVALID',
  SOURCE_NOT_APPROVED: 'SOURCE_NOT_APPROVED',
  POLICY_INVALID: 'POLICY_INVALID',
  ROBOTS_DISALLOWED: 'ROBOTS_DISALLOWED',
  TARGET_BLOCKED: 'TARGET_BLOCKED',
  TRANSITION_DENIED: 'TRANSITION_DENIED'
});

export const fail = (code, message, details) =>
  ({ ok: false, code, message, ...(details !== undefined ? { details } : {}) });

export const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export async function withTimeout(fn, ms, code = ERR.TIMEOUT) {
  const ctl = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      ctl.abort();
      reject(Object.assign(new Error('timeout'), { code, retryable: true }));
    }, ms);
  });
  try {
    return await Promise.race([fn(ctl.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Kill switch + autonomy ceiling. Default ceiling is 0 (observe only): the owner must raise it.
// `isSuspended(subsystem)` must read live server-side state (e.g. a DB flag) on every call.
export function createGovernance({ maxLevel = 0, isSuspended = () => false } = {}) {
  return Object.freeze({
    canRun(subsystem, requiredLevel) {
      if (isSuspended('*') || isSuspended(subsystem)) {
        return fail(ERR.KILL_SWITCH, `Subsystem ${subsystem} is suspended`);
      }
      if (requiredLevel > maxLevel) {
        return fail(ERR.AUTONOMY_DENIED, `Level ${requiredLevel} exceeds approved level ${maxLevel}`);
      }
      return { ok: true };
    }
  });
}