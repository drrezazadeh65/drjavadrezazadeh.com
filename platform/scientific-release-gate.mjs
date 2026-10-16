/**
 * Non-diagnostic, versioned scientific release gate for Golden Talent / RCAS / BAHAR.
 * Pure policy: caller MUST supply authenticated, persisted server-side evidence.
 * No client-supplied approval, score, or validation claim is authoritative.
 */
export const SCIENTIFIC_GATE_VERSION = '1.1.0-preproduction';
export const SCIENTIFIC_STATES = Object.freeze(['RESEARCH', 'PILOT', 'VALIDATED_FOR_SPECIFIED_USE', 'RETIRED']);
const allowed = new Set(SCIENTIFIC_STATES);
const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;
const deny = (reason) => Object.freeze({ allowed: false, reason });
const permit = () => Object.freeze({ allowed: true, reason: 'SCIENTIFIC_RELEASE_REQUIREMENTS_MET' });
const exact = (a,b) => nonEmpty(a) && a === b;

/**
 * Approve a descriptive report or validated-use claim only for a precise purpose/population.
 * Never infer validation from status labels alone: evidence is required.
 */
export function evaluateScientificRelease({ instrument, administration, claim = 'DESCRIPTIVE_REPORT', now = new Date().toISOString() } = {}) {
  if (!instrument || !administration || !['DESCRIPTIVE_REPORT', 'VALIDATED_USE_CLAIM'].includes(claim))
    return deny('INVALID_REQUEST');
  if (!allowed.has(instrument.status) || instrument.status === 'RETIRED')
    return deny('UNAVAILABLE_INSTRUMENT');
  if (!exact(instrument.code, administration.instrument_code) ||
      !exact(instrument.version, administration.instrument_version) ||
      !exact(instrument.item_bank_checksum, administration.item_bank_checksum) ||
      !exact(instrument.scoring_version, administration.scoring_version))
    return deny('VERSION_OR_CONTENT_MISMATCH');
  if (!exact(instrument.locale, administration.locale))
    return deny('LOCALE_MISMATCH');
  if (administration.persisted !== true || administration.consent_verified !== true ||
      administration.authorisation_verified !== true)
    return deny('CONSENT_OR_ACCESS_NOT_VERIFIED');
  if (administration.review_state !== 'RELEASED' || administration.reviewer_verified !== true)
    return deny('HUMAN_REVIEW_REQUIRED');
  // A reviewed descriptive narrative is still protected learner information.
  // Its release must use a server-verified, subject-scoped safeguarding state
  // no weaker than the free-first assessment access policy. No UI checkbox
  // or age_band/self-declaration supplies these facts.
  const safe=administration.safeguarding_context;
  const releaseTime=Date.parse(now);
  if (!safe || safe.record_source!=='TRUSTED_BACKEND' ||
      !exact(administration.subject_id,safe.subject_id) ||
      safe.age_attestation_state!=='VERIFIED' ||
      !['ADULT','MINOR'].includes(safe.age_classification) ||
      !Number.isFinite(releaseTime) ||
      !Number.isFinite(Date.parse(safe.age_attestation_expires_at)) ||
      Date.parse(safe.age_attestation_expires_at)<=releaseTime)
    return deny('VERIFIED_AGE_AND_SUBJECT_SCOPE_REQUIRED');
  if (safe.age_classification==='MINOR' &&
      (safe.guardian_relationship_state!=='VERIFIED' ||
       safe.learner_assent_state!=='VERIFIED' ||
       !nonEmpty(safe.learner_assent_notice_version) ||
       !/^[a-f0-9]{64}$/.test(safe.learner_assent_notice_sha256||'') ||
       !Number.isFinite(Date.parse(safe.learner_assent_expires_at)) ||
       Date.parse(safe.learner_assent_expires_at)<=releaseTime))
    return deny('CURRENT_GUARDIAN_AND_LEARNER_ASSENT_REQUIRED');
  if (!['SELF','GUARDIAN'].includes(administration.release_audience))
    return deny('RELEASE_AUDIENCE_NOT_VERIFIED');
  if (administration.release_audience==='GUARDIAN' &&
      (safe.age_classification!=='MINOR' ||
       safe.parent_visibility_consent_state!=='GRANTED'))
    return deny('PARENT_VISIBILITY_CONSENT_REQUIRED');

  if (claim === 'DESCRIPTIVE_REPORT')
    return permit();
  if (instrument.status !== 'VALIDATED_FOR_SPECIFIED_USE')
    return deny('INSUFFICIENT_VALIDATION_STATUS');
  const evidence = instrument.validation_evidence;
  if (!evidence || evidence.independent_review_approved !== true ||
      !nonEmpty(evidence.review_reference) || !nonEmpty(evidence.target_population) ||
      !nonEmpty(evidence.intended_use) || !nonEmpty(evidence.validity_dossier_reference) ||
      !nonEmpty(evidence.precision_dossier_reference) || !nonEmpty(evidence.fairness_review_reference))
    return deny('INCOMPLETE_VALIDATION_EVIDENCE');
  if (!exact(evidence.target_population, administration.target_population) ||
      !exact(evidence.intended_use, administration.intended_use))
    return deny('OUT_OF_SCOPE_VALIDATION');
  const expiry = Date.parse(evidence.valid_until);
  const current = Date.parse(now);
  if (!Number.isFinite(expiry) || !Number.isFinite(current) || expiry <= current)
    return deny('EXPIRED_VALIDATION');
  return permit();
}
