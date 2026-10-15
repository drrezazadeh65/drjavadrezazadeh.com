# P0 — Transactional Consent Withdrawal: Internal Service Acceptance

**Date:** 2026-10-16  
**Status:** PASS — isolated code / fixtures; **NO PUBLIC WITHDRAWAL ROUTE; NO PRODUCTION ACTIVATION**  
**Branch:** work/p1-scientific-validation-20261016  
**Sources of architectural authority:** database/unified/001_core_governance.sql, api/golden-talent.php, api/golden-talent-consent.php, frozen design/SEO and privacy rules.

## 1. Implemented code

**api/golden-talent-consent-write.php** implements the internal-only PHP function `goldenTalentInternalWithdrawConsent(PDO, authenticatedAccountId, subjectId, purpose, commandId)`.

- The caller is required to derive the actor account from the trusted server session. It is never an untrusted input accepted from a browser, and NO HTTP route currently invokes the function.
- Exactly two separate purpose codes are accepted: `ASSESSMENT` and `PARENT_VISIBILITY`. Marketing, growth, research export and payment consent are not interchangeable.
- Valid UUIDs, verified active actor account and an actual canonical subject are mandatory. A recorded grant belongs to the same account/subject/purpose; a stranger cannot withdraw someone else's grant.
- Deliberately, an account's recorded consent may be withdrawn after the guardian relationship expires: expired guardian authority must not trap an existing consent against withdrawal. This is not permission to see student data or create new grants.
- New `GRANTED`, `REGRANTED`, guardian-registration or child-assent writes are **not implemented**.
- Existing `eco_consent_records` and `eco_consent_notices` columns from the proposed MySQL/MariaDB governance DDL are reused. No additional tables, schema migration, API URL, account system or new payment flow were created.

## 2. Transaction model and concurrency boundaries

1. `BEGIN` a new database transaction; reject an already active transaction.
2. Lock the `eco_subjects` primary-key row `FOR UPDATE` as the shared authorisation mutex (the same primary mutex used by existing guardian reads).
3. Lock/check the authenticated account row, then read up to 1025 purpose-scoped historical consent events `FOR UPDATE`. Fail closed above 1024 rows.
4. For a repeated command UUID, prove the existing event belongs to the same actor/subject/purpose and is a previous internal withdrawal. Return `ALREADY_APPLIED`, without a new row.
5. Otherwise compute current consent through the **same** `api/golden-talent-consent.php` canonical read-policy as the existing guardian API. Refuse malformed, ambiguous, future or inconsistent historical events.
6. Read MySQL `UTC_TIMESTAMP(3)`. If it is not later than the most recent consent/withdrawal event, deny rather than fabricate a decision order. A valid active grant becomes an append-only `WITHDRAWN` event recording its original notice, `granted_at`, `withdrawn_at` and source code.
7. In that **same** transaction, append a privacy-minimised account-scoped `GT_CONSENT_WITHDRAWN` audit entry. Audit failure rolls back the consent write; after success, COMMIT.
8. No raw answer, minor identity, subject ID, report content or learner pseudonym is placed in audit entries. `ALREADY_UNAVAILABLE` is an explicit no-op for already invalidated/retired decisions, not a new grant.

The serialization guarantee is not yet universal: all **future** grant, regrant, guardian and consent writers must take the identical subject-first mutex and implement an agreed retry/deadlock policy. The existing private readers hold subject and consent row locks until audit/commit. This service cannot guarantee instantaneous revocation after a read already committed, nor any legal status of a guardian.

## 3. Actual isolated regression evidence

- `tests/bertina-consent-withdrawal-mysql.php` uses **temporary MySQL/MariaDB tables** with fictional accounts, subjects and notices: **26 checks per engine**. Covers invalid purpose, cross-account denial, nested transaction rejection, single withdrawal, idempotent repeat, already unavailable, independent parent-visibility withdrawal, cross-purpose command reuse, audit minimisation, history retention, immediate read denial, disabled/unverified account and roll-back when audit storage fails.
- `tests/bertina-consent-withdrawal-concurrency-mysql.php` creates a random temporary **schema** in a loopback database fixture and exercises **two independent InnoDB connections**: guarded parent read holds the subject lock, withdrawal writer waits and times out, retries after COMMIT, then succeeds; later guardian read denies. Exactly one withdrawal and audit row after contention. **7 checks per engine**.
- Existing `tests/bertina-guardian-transaction-lock-mysql.php` independently checks mutation locking against the guardian read path.
- `tests/bertina-public-consent-assembly.mjs` requires the guarded writer file to be present in the sanitised API package but **asserts the live Golden Talent router does not include or invoke it**.
- `.github/workflows/scientific-free-stage-policy-qa.yml` runs unit/fixture, MySQL 8, MariaDB 10.11, package inspection, admin MFA and 45 bilingual/admin Chromium tests without deploying.

**CI evidence:** [Scientific free-stage policy QA run 38825343607](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38825343607) passed all **six nondeploying jobs**, including MySQL and MariaDB. The previous run [38825218699](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38825218699) also passed the 26-check fixture on both database engines. Repeated fixtures are not independent participant data or scientific validation.

## 4. No-go dependencies before public self-service consent

- Independent verified minor/adult classification, guardianship authority and appropriate child assent. Do not infer legal age from `eco_subjects.age_band`.
- Approved policy for who can revoke whose legal consent, on what lawful basis, including revoked accounts, deleted accounts, minors, guardianship changes and emergency safeguarding. In this prototype a disabled/unverified actor cannot call the service because it is not exposed; a reviewed privacy-request process may be needed for those cases.
- Standardised notice-version/retirement handling and a valid, legally reviewed bilingual notice and explicit confirmation/withdrawal UI.
- Live installed-schema/engine/migration check, account/subject permission source, accurate duplicate-command lifecycle and all consent writers using one serialization lock order.
- HTTP POST workflow only with server-authenticated account, CSRF/origin, session and step-up permissions, idempotency token generated/verified by backend, rate limits, secure anti-replay, auditing and actionable refusal errors.
- End-to-end browser tests with realistic consent revoke/regrant/guardian/report access; operational backup/rollback and security review; explicit owner release authorisation.

**Decision:** safe-to-keep as **internal isolated development code**; NOT approved to bind to a public path, activate student assessment submissions, issue scientific reports or deploy.
