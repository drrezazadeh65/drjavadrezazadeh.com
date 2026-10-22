/**
 * JR educational ecosystem — versioned, evidence-gated interchange contract.
 * Pure functions. No network, storage, personal identifiers, inference, or side effects.
 * Consumers must independently authorize the current user and enforce entitlements.
 */
export const JR_EDUCATIONAL_EXCHANGE_VERSION = '1.0.0';
export const JR_EDUCATIONAL_ENGINES = Object.freeze([
  'golden-talent', 'rcas', 'bahar', 'golden-path', 'admission-intelligence', 'choice-studio'
]);
const SOURCES = new Set(JR_EDUCATIONAL_ENGINES);
const STATUSES = new Set(['research', 'reviewed', 'validated']);
const LEVELS = new Set(['descriptive', 'decision-support']);
const MAX_EVIDENCE = 40;
const clean = (value, limit=240) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const freezeDeep = value => {
  if (Array.isArray(value)) { value.forEach(freezeDeep); return Object.freeze(value); }
  if (isObject(value)) { Object.values(value).forEach(freezeDeep); return Object.freeze(value); }
  return value;
};
/**
 * Strictly descriptive evidence envelope: no scores, names, identifiers, probability
 * or personally identifiable information cross this boundary.
 * @param {object} raw caller-provided metadata, never directly from untrusted documents
 * @returns {{ok:boolean, value?:object, errors?:string[]}}
 */
export function normalizeEducationalEvidence(raw) {
  const errors = [];
  if (!isObject(raw)) return {ok:false, errors:['Evidence must be an object']};
  const engine = clean(raw.engine,60);
  if (!SOURCES.has(engine)) errors.push('Unknown engine');
  const status = clean(raw.status,20);
  if (!STATUSES.has(status)) errors.push('Invalid review status');
  const purpose = clean(raw.purpose,50);
  if (!LEVELS.has(purpose)) errors.push('Unsupported purpose');
  const version = clean(raw.version,40);
  if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version)) errors.push('Invalid version');
  const consent = raw.consent === true;
  if (!consent) errors.push('Explicit consent required');
  const approved = raw.approvedForExchange === true;
  if (!approved) errors.push('Evidence has not been approved for exchange');
  if (!Array.isArray(raw.evidence) || raw.evidence.length > MAX_EVIDENCE) errors.push('Invalid evidence list');
  const evidence = [];
  if (Array.isArray(raw.evidence) && raw.evidence.length <= MAX_EVIDENCE) {
    for (const item of raw.evidence) {
      if (!isObject(item)) {errors.push('Invalid evidence item');continue;}
      const title=clean(item.title,180), source=clean(item.source,240), limitation=clean(item.limitation,300);
      if (!title || !source || !limitation) {errors.push('Evidence needs title, source and limitation');continue;}
      evidence.push({title,source,limitation});
    }
  }
  if (errors.length) return {ok:false,errors};
  return {ok:true,value:freezeDeep({
    schema:'jr.educational-evidence.v1',engine,status,purpose,version,
    approvedForExchange:true,consent:true,evidence
  })};
}
/**
 * Only vetted, explicitly consented evidence may be summarized for Choice Studio.
 * Research-stage evidence remains clearly labeled and cannot assert eligibility.
 */
export function prepareChoiceStudioEvidence(raw) {
  const normalized=normalizeEducationalEvidence(raw);
  if (!normalized.ok) return normalized;
  const v=normalized.value;
  if (v.engine==='choice-studio') return {ok:false,errors:['Studio cannot self-certify evidence']};
  return {ok:true,value:freezeDeep({
    schema:'jr.choice-studio-context.v1',origin:v.engine,version:v.version,
    status:v.status,scope:v.purpose,
    disclaimer:v.status==='research'
      ? 'Research-stage evidence; not validated for predictive or diagnostic decisions.'
      : 'Descriptive supporting evidence; verify eligibility against current official rules.',
    evidence:v.evidence
  })};
}
