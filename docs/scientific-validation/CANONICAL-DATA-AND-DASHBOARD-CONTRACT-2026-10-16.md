# Canonical Data and Dashboard Contract — Research Draft
Date: 2026-10-16
Status: DRAFT / schema source inspected, live database not queried / no production activation

## Authority and design sources
foundation/DESIGN-SYSTEM.md (frozen); foundation/MASTER-ECOSYSTEM-ROADMAP.md; docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md; docs/superpowers/specs/2026-10-13-cinematic-bilingual-mobile-first-experience-design.md; database/unified/README.md.
Bertina PHP/MySQL/MariaDB is canonical. Do NOT execute PostgreSQL prototype migrations against Bertina. The eco_* schema is a proposal until installed and certified.

## Existing canonical tables, based on checked SQL files
| Domain | Existing/proposed table in database/unified | Mandatory authority |
| --- | --- | --- |
| Accounts | customer_accounts | Existing verified account/session, never new identity |
| Subject and guardian | eco_subjects, eco_subject_relationships | Resource-scoped, active verified relationship and expiry |
| Consent | eco_consent_notices, eco_consent_records | Purpose-specific, current notice and latest decision; revocation wins |
| Instrument/version | eco_assessment_instruments, eco_instrument_versions | Immutable version and approved use |
| Administration | eco_assessment_sessions, eco_assessment_responses | Persisted subject, consent and instrument version |
| Scoring and reports | eco_scoring_models, eco_score_runs, eco_assessment_reports, eco_assessment_reviews | Human review and scoped release, never inferred validity |
| Golden Talent | eco_talent_evidence, eco_talent_evidence_reviews, eco_talent_profiles, eco_talent_profile_revisions | Evidence provenance, descriptive limitations |
| RCAS | eco_rcas_route_runs, eco_rcas_route_evidence | Contextual route evidence, not diagnostic classification |
| BAHAR | eco_bahar_portfolios, eco_bahar_baselines, eco_bahar_weekly_cycles, eco_bahar_learning_evidence, eco_bahar_reviews | Longitudinal formative progress and human review |
| Orders and entitlements | existing commerce_orders plus eco_entitlements when certified | Provider-verified paid access; free stages require none |
| Auditing | eco_audit_events | Minimal, private, no raw learner answers in logs |

## Contract v0: read-only customer overview
Endpoint location MUST be resolved against the existing api/golden-talent.php route dispatcher and current customer-dashboard.js; do not invent a public URL or enable endpoint until tests pass.
Request: authenticated same-origin GET, no subject ID trusted without relationship recheck.
Response: {schema:'talent-customer-overview-v1',modules:[{module,freeStage:{state},paidStage:{state},report:{state,reviewState,scientificStatus},updatedAt}],consent:{assessmentState},hasPrivateData:false}.
Only server-derived states; never include child records in a parent's response without separate PARENT_VISIBILITY consent and verified guardian link. No raw evidence or scores in overview. Cache-Control:no-store, X-Robots-Tag:noindex.

## Contract v0: admin operations overview
Authenticated, MFA and capability-scoped; no global raw student listing. Response aggregates by module and workflow state: pending scientific review, release/withdrawal queue, consent/schema incidents, error counts, payment reconciliation exceptions. Every detailed case read requires assigned capability, subject relationship, purpose and audit. Aggregates suppress low-count identifiable groups.

## Contract v0: first-stage write
Authenticated POST, CSRF-protected, idempotency key and server-generated opaque IDs; subject ID validated against canonical relationship. PHP loads current persisted assessment consent and instrument version in transaction. Free stages are GOLDEN_TALENT/ORIENTATION, RCAS/CONTEXT_REFLECTION, BAHAR/STARTER_PLAN; no payment required. Other stages require separate verified entitlement. Save only declared formative fields; no automatic diagnostic score or report release. Return server-created receipt and a dashboard projection, not raw table rows. Reject stale versions, withdrawn consent, duplicate replay, forged guardian, and mismatched subject.

## Open contract conflicts / release blockers
1. api/golden-talent.php currently exposes readiness and guardian-scoped BAHAR counts; it explicitly reports learnerSubmissionEnabled:false and professionalReviewApiActive:false. No claim of full operational persistence.
2. The existing PHP consent queries use eco_consent_records.granted_at with latest two rows and notice effective/retired dates; platform/currentConsent uses persisted sequence and decided_at. These are DIFFERENT models. Define an authoritative MySQL adapter and reconcile timestamp ties, withdrawal representation, notice retirement, and later grants before invoking JS policy from PHP.
3. A consent flag supplied by a client or a partial decision list is never authority. Server queries must be complete enough to determine the latest applicable decision and handle concurrent withdrawal.
4. database/unified/README.md records historic Stage14 consultation consentSchema=false; this does not establish the present state and is NOT assessment consent.
5. Verify actual installed tables/columns, API dispatcher routes, user/admin permissions, migration ownership and operational backups before any DDL or write.

## Acceptance evidence before Super Master Plan freeze
Read-only production schema inventory (with no personal data); PHP/MySQL consent adapter tests including revocation and timestamp ties; account/guardian/role isolation; payment idempotency; version-pinned scientific output; bilingual RTL/LTR visual review; live-data-free test fixtures; staging E2E for both dashboards; tested rollback; owner-approved release dossier. Nothing here authorizes deployment.
