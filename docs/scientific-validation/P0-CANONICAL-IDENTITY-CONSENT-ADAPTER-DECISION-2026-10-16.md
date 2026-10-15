# P0 canonical identity, guardian and consent adapter — decision record
Date: 2026-10-16
Status: RESEARCH DECISION / PURE POLICY PROTOTYPE ONLY
Scope: Golden Talent, RCAS, BAHAR free-first authenticated private journey
Source: database/unified/001_core_governance.sql; api/golden-talent.php; platform/free-first-stage-policy.mjs; platform/golden-talent-phase12-gates.mjs.

## Nonnegotiable constraints
- Bertina PHP/MySQL/MariaDB is canonical; use existing customer_accounts and account session; do NOT create new user identities or run PostgreSQL prototype migrations.
- No automatic deploy. This document and pure policies do not activate routes, modify data or certify readiness.
- A passing CI fixture does NOT prove that eco_* tables exist in live Bertina or that guardian and consent data is available.
- Existing browser-only RCAS reflections remain non-diagnostic; no private responses are currently stored.

## Schema-to-policy reconciliation (confirmed from proposed source SQL)
| Responsibility | Real proposed MySQL column(s) | Pure JS expectation | Required server adapter |
|---|---|---|---|
| Subject id | eco_subjects.id | subject.id | Direct id |
| Self/owner account | eco_subjects.owner_account_id | student_account_id | Trusted owner mapping only |
| Guardian id | eco_subjects.guardian_account_id | guardian_account_id | Direct, but verify separate active relationship |
| Guardian link | eco_subject_relationships.related_account_id, relationship_code, verification_status, expires_at, verified_by_account_id | actor_id, type, state, capabilities | Only a server-verified currently active guardian link confers guardian authority. No capabilities column exists in the inspected SQL. Do not invent DB capabilities. |
| Minor/adult | eco_subjects.age_band (descriptive) | subject.is_minor boolean | NO reliable age proof in inspected DDL. Unknown MUST deny. Age classification requires independent verified source, jurisdiction context, minimisation and review. |
| Consent purpose | eco_consent_notices.purpose_code | events.purpose | Exact purpose; ASSESSMENT is separate from PARENT_VISIBILITY and growth contact marketing consent |
| Version/content | eco_consent_notices.version_label, notice_sha256, locale, effective_at, retired_at | policy_version | Full notice identity, effective state, retirement and language retained |
| Consent decision | eco_consent_records.decision, granted_at, withdrawn_at, id | decision, sequence, decided_at | Sequence is NOT available in proposed MySQL; reconcile by strict UTC event timestamps, fail on ambiguous ties and check both explicit WITHDRAWN and withdrawn_at mutation |
| Authenticated actor | customer_accounts + actual session | actor.session_verified | Derive only from server session; browser is never authority |
| Free tier | No payment required | FREE_STAGE_* | GOLDEN_TALENT/ORIENTATION, RCAS/CONTEXT_REFLECTION, BAHAR/STARTER_PLAN only |

## Implemented isolated policy artifacts
- platform/bertina-consent-projection.php: strict UTC DATETIME(3) handling, latest revocation, regrant and notice checks.
- tests/bertina-consent-projection.php: reproducible synthetic fixture suite, no database.
- platform/bertina-free-stage-authorisation.php: pure MySQL-native account/guardian/age-verification/consent adapter, refusing unknown age and untrusted or partial history.
- tests/bertina-free-stage-authorisation.php: synthetic cross-account, expiry, revocation, paid/free and age-proof checks.
- platform/free-first-stage-policy.mjs and its tests: unknown age must deny; guardian-only private start for minors pending independent assent design.
- .github/workflows/scientific-free-stage-policy-qa.yml: all isolated checks run as nondeploy CI on scientific branch and pull requests.
These are reference implementations; the production PHP API intentionally remains unchanged.

## Proposed trusted query shape (illustrative; requires review against live schema)
The backend joins all consent decisions and notices for ONE already-authorised actor and subject (not a client-selected relationship), never using LIMIT 2 to claim complete history:

```sql
SELECT c.id, c.account_id, c.subject_id, c.notice_id,
       c.decision, c.granted_at, c.withdrawn_at,
       n.purpose_code, n.version_label, n.locale, n.notice_sha256,
       n.effective_at, n.retired_at
FROM eco_consent_records AS c
JOIN eco_consent_notices AS n ON n.id = c.notice_id
WHERE c.subject_id = :trusted_subject_id
  AND c.account_id = :authenticated_actor_id
  AND n.purpose_code = 'ASSESSMENT'
ORDER BY c.granted_at DESC, c.id DESC;
```

For writes, use a transaction with explicit consistent locks on canonical subject/guardian/consent serialization resources so concurrent revocation cannot be overlooked. Ensure all consent writers respect the same lock order and idempotency constraints. The SQL above alone does NOT guarantee write-level serialization.

## Pending material decisions
1. **Verified legal age state**: choose minimised independent age-classification evidence and re-verification policy, including jurisdiction and parent/guardian authority. Current MySQL eco_subjects.age_band cannot substitute. Do not collect government IDs/DOBs without necessity and approved retention/privacy policy.
2. **Assent**: define when and how capable minor learners assent, object, or request deletion; parental permission does not automatically establish child assent.
3. **Complete history + concurrency**: define append-only and mutable withdrawal semantics, timestamp ties, retention, pagination limit and clock precision; protect all writers with a single transactional contract.
4. **Signed/reviewed consent notice**: preserve version, SHA-256, locale, effective/retired date; invalidate grants based on retired or replaced notices according to approved policy.
5. **Role and entitlement**: authenticated user and active relationship are necessary but not sufficient for paid modules and report visibility; professional release and payments remain independent checks.
6. **Schema proof**: first read information_schema via authorised read-only operation and record table/column evidence (no personal records); only then propose additive, rollback-tested migrations, if any.
7. **Runtime wiring**: integrate via existing api/golden-talent.php dispatcher only after source authority, PHP/MySQL integration tests, CSRF, rate limits, logging, TTL/no-store and E2E checks are complete.

## Dashboard integration boundary
- Customer overview: show one server-derived state per module (not a promised report), with legitimate user scope; don't show raw responses, fabricated completion or hidden items.
- Guardian BAHAR overview: existing separate GET requires ASSESSMENT and PARENT_VISIBILITY, not merely free-stage consent. Keep this boundary.
- Admin overview: MFA, assigned case capability, audit and redacted aggregates; never treat generic admin access as permission for sensitive learner evidence.
- Scientific report: only version-pinned released and reviewed descriptive interpretation; never assert validated constructs without documented intended-use evidence.

## Acceptance decision
Current result: **PASS for isolated deterministic policy regression**, **BLOCK for production integration and scientific claims**. Next evidence: read-only installed-schema inventory, identity/age/consent-source provenance, transaction tests on isolated MySQL, complete PHP API and bilingual dashboard E2E, psychometric validation programme. Follow the frozen DESIGN-SYSTEM.md, MASTER-ECOSYSTEM-ROADMAP.md and bilingual master SEO baseline.
