# P1 Scientific validation release gates — Golden Talent / RCAS / BAHAR

Status: implementation specification; not a psychometric validation certificate.
Branch: work/p1-scientific-validation-20261016. Never deploy directly to production.

## Mandatory release invariants
1. Each administration persists instrument_code, immutable semantic instrument_version, item-bank checksum, scoring-algorithm version, language, consent-policy version, timestamps and provenance. Reject unknown or retired versions; historical sessions remain bound to their original versions.
2. Registry distinguishes RESEARCH, PILOT, VALIDATED_FOR_SPECIFIED_USE, RETIRED. VALIDATED requires recorded population, purpose, reliability estimates with uncertainty, validity evidence, fairness/DIF and measurement-invariance review as applicable, sample and review date, independent approval and expiry/reassessment policy. No generic 'scientifically validated' badge.
3. Scoring rules are version-controlled, item-direction and missingness policies explicit, unit-tested against locked fixtures. UNKNOWN, NA, skipped and inaccessible are never scored as zero. Do not publish norms, cutoffs, rankings, diagnoses, or automated talent determinations without purpose-specific supporting evidence.
4. Guardian verification and purpose-specific, revocable informed consent precede minor assessment; log the exact information sheet, assent when appropriate, guardian identity and time. Separate assessment, guardian visibility, teacher observation, adviser review, and research reuse. Withdrawal blocks new collection and downstream visibility as required, with a documented retention/deletion workflow.
5. All access uses authenticated backend identity and record-scoped authorization. No client-side claim can grant permission. Student, verified guardian, assigned teacher and adviser receive separate least-privilege projections; audit all sensitive reads and writes.
6. Results are first saved as DRAFT/UNREVIEWED; human-reviewed RELEASED results alone appear in the customer dashboard. Dashboard displays purpose, version, evidence coverage, uncertainty, contextual strengths, limits, date, next actions and correction route in Persian/English. No raw private evidence or cross-child leakage.
7. BAHAR is longitudinal formative planning, not diagnostic scoring; RCAS is contextual descriptive evidence pending validation; D1-D6 are not presented as validated psychometric tests until independently evidenced.
8. Errors fail closed without exposing personal information. Idempotent submissions, replay prevention, optimistic concurrency, audit events, accessibility and RTL/LTR checks are required.
9. Test gates: consent withdrawal mid-session, minor without guardian, duplicate responses, unknown instrument version, missing answers, cross-account access, payment/role spoofing, concurrent updates, inaccessible evidence, translation equivalence, and dashboard suppression of unreleased results.
10. Production gate requires migration review, reproducible automated test report, security review, sample report approval and explicit human release authorization. A passing build does not prove psychometric validity.

## Work status
Existing implementation inspected: platform/golden-talent-phase12-gates.mjs, platform/rcas-evidence-bridge.mjs, platform/bahar-engine.mjs. These already contain fail-closed authorization primitives, missing-value safeguards and PREVALIDATION declarations. Preserve them; do not duplicate or silently replace.
Pending: full repository dependency trace, database/API/dashboard integration verification, test execution, empirical validation studies and controlled release.
