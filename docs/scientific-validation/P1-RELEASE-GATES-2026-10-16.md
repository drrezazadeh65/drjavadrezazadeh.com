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


## Mandatory scientific and master-design governance (owner directive, 2026-10-16)
Before EACH development change (backend, UI, instrument, consent, reporting, dashboard, PDF, email, certificate, and print output), review the current repository master plan and design system. Primary references:
- `docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md` (integrated execution/release governance)
- `foundation/DESIGN-SYSTEM.md` (frozen semantic design baseline)
- `foundation/MASTER-ECOSYSTEM-ROADMAP.md` (ecosystem architecture and dependencies)
- `docs/superpowers/specs/2026-10-13-cinematic-bilingual-mobile-first-experience-design.md` (approved experience specification)
- `identity/brand-governance.md` and `identity/OFFICIAL_DOCUMENTS_REGISTRY.md` (identity and official artifacts)
- `assets/css/jr-ecosystem-design-v2.css` (implementation tokens; inspect current usage before changing)
Read the relevant documents at the current branch head and record in each PR/change description: consulted paths and versions, affected components, token reuse, bilingual/RTL/LTR behavior, accessibility checks, and regression evidence. Resolve conflicts through established governance rather than creating competing visual systems.

Scientific review must be traceable to authoritative primary research and current measurement standards (e.g., AERA/APA/NCME Standards for Educational and Psychological Testing, COSMIN where appropriate, and relevant ethical/privacy frameworks). Treat standards as applicability-dependent, not as a substitute for instrument-specific evidence. For each construct, document its conceptual definition, intended inference and use, population, item-content rationale, response processes, internal structure, relationships with external variables, reliability/precision, fairness, translation/adaptation, interpretive limits, and prospective validation protocol. Distinguish proposed hypotheses from established findings. Include citations with bibliographic identifiers and human scholarly review. No psychometric approval without actual study data and documented review.

Design and science are joint release gates: academic rigor must be visible in explanatory language, evidence-status labels, uncertainty, consent readability, and non-stigmatizing interpretation, while preserving the existing premium, restrained, human-centred visual identity. No production changes without explicit release authorization.
