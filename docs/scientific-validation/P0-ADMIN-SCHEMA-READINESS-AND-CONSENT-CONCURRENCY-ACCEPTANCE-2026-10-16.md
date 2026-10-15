# P0 Admin Schema Readiness and Consent Concurrency — Engineering Acceptance
**Date:** 2026-10-16  
**Repository/branch:** drrezazadeh65/drjavadrezazadeh.com / work/p1-scientific-validation-20261016  
**Governance:** frozen foundation/DESIGN-SYSTEM.md; foundation/MASTER-ECOSYSTEM-ROADMAP.md; existing bilingual master SEO baseline; docs/scientific-validation/P1-RELEASE-GATES-2026-10-16.md  
**Status:** isolated-development acceptance; **NO DEPLOYMENT**, **NO LIVE BERTINA INVENTORY**, **NO NEW PRIVATE ASSESSMENT WORKFLOW**, **NO PSYCHOMETRIC VALIDATION**.

## 1. Runtime implementation on the scientific branch

### Protected read-only technical inspection
The existing authenticated operations router now includes:
`GET /api/admin/operations/scientific/schema-readiness`

The endpoint uses the existing verified administrator role, verified account, fresh MFA and same-origin session infrastructure, which run **before** the new route. It enforces rate limiting (6 requests/300 seconds per identity/IP bucket), private `no-store` response headers and an operations-audit event for each completed read. A GET does not create or change learner data. The audit event is the only deliberate write.

The source of the fixed SQL allowlist is `api/operations-scientific-schema.php` (direct-HTTP guarded and included in the sanitized public deploy package). The old `platform/bertina-scientific-schema-readiness.php` is a research-only alias to prevent competing implementations.

The inspection runs `SELECT [approved columns] FROM [approved table] LIMIT 0` for **4** identity/guardian/consent tables, **8** assessment/report tables, and **5** BAHAR tables. It returns exact table-name compatibility failures to the MFA-protected owner, but **no student row, score, consent decision, account ID, DB connection string, password, live record count or personal payload**. Modules with missing columns are incompatible, not silently considered complete.

Strictly **NOT** established by these probes: live database engine/version, InnoDB isolation level or indexes, FKs, installed migration receipts, age-verification source, actual user consent, data retention, backups, human review, science validation, paid access or production operation.

### Bilingual dashboard section, design-system safe
`fa/app/admin/index.html` and `en/account/admin/index.html` add a discrete expandable technical-science section, **within the existing hidden MFA workspace**, after the existing four summary statistics; 36 existing operational report sections remain untouched.

`assets/js/operations-scientific-schema.js` fetches only on disclosure or explicit refresh, `credentials:'same-origin'`, `cache:'no-store'`, strict schema/state allowlist. Its generated DOM uses `textContent` and reusable `ops-panel`, `ops-grid`, `ops-card`, `ops-pass/ops-fail` classes and frozen design tokens. Unknown or invalid response never displays a readiness badge. Closing the protected workspace aborts pending requests, collapses the disclosure and erases its last content. UI in Persian RTL and English LTR, without changing canonical URLs or adding indexable pages.

This is **database table/column compatibility**, NOT the independently planned professional SEO/Schema.org markup-management section.

## 2. Actual existing private guardian routes strengthened
`api/golden-talent.php` now requires `PDO::inTransaction()` for both guardian-subject and BAHAR guardian overview helpers. Candidate subject reads and scoped consent event queries use MySQL/MariaDB `FOR UPDATE` locks inside the pre-existing transaction and audit-before-commit response lifecycle. Read queries still use strict bounded 1025-history logic and the unique packaged canonical projection in `api/golden-talent-consent.php`. Existing private route paths and payload shapes remain unchanged, as do free/paid gates and absent learner-write/report features.

**Concurrency guarantee is CONDITIONAL.** Existing row mutations cannot proceed while the guardian read holds those rows; future consent writers should acquire the same `eco_subjects` lock in a specified global lock order before appending decisions and correctly handle deadlocks, retries and ambiguous timestamps. No complete production writer implementation exists; therefore no claim of universally instantaneous revocation or prevented phantoms is made. There is no disclosure of submitted assessments or unreleased reports.

## 3. Isolated tests and evidence

- `tests/operations-security.php`: synthetic in-memory SQLite fixture for unauthorised/no-MFA/expired cases, GET-only, owner audit and both compatible/missing-column signatures. It inserts a **fictional SENTINEL_PRIVATE_LEARNER** to prove the structural endpoint does not read or emit stored personal rows.
- `tests/bertina-guardian-transaction-lock-mysql.php`: exact loopback `operations_fixture` DSN plus explicit `SCIENTIFIC_LOCK_FIXTURE_ENABLED=1`; creates a random disposable schema, opens **two independent PDO sessions**, tests locked guardian read versus concurrent `withdrawn_at` mutation (expected InnoDB timeout 1205), next-request denial after commit and shared subject lock for future consent writers; drops the disposable schema.
- `tests/bahar-guardian-mysql.php`: existing guardian BAHAR synthetic projection and audit now requires enclosing transaction and locks.
- `tests/bertina-public-consent-assembly.mjs`: sanitized Bertina archive contains both guarded API dependencies, FA/EN admin HTML and scientific schema UI JavaScript, while platform/foundation/scripts/tests/database remain excluded.
- `tests/operations-scientific-schema-browser.spec.js`: Playwright tests FA and EN lazy loading, explicit refresh, clearing on workspace lock, MFA denial and hostile/malformed readiness rejection.
- `.github/workflows/scientific-free-stage-policy-qa.yml`: all tests are on the scientific working branch with no deployment steps. Existing operations dashboard Playwright regression suite is run alongside the new panel to guard against visual/functionality regressions.

Verified before this document: [CI run 38823644633](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38823644633) passed both isolated MySQL 8 and MariaDB 10.11 concurrency fixtures (five assertions per engine), existing guardian and BAHAR privacy fixtures and admin/API checks. [CI run 38824126674](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38824126674) passed all jobs including four new FA/EN Chromium browser cases. Any subsequent broadened regression run must be confirmed separately before claiming success.

## 4. Explicit remaining NO-GO gates

1. **Owner review + approved release** before this branch can be merged or deployed. Never auto-deploy protected learner functionality.
2. **Actual schema verification**: one authenticated MFA-only use of diagnostic on the intended server, with no private data export; record only module flags and migration fingerprints.
3. **Guardian authority**: independently verified child/age classification plus guardian powers and appropriate child assent. Existing `age_band` is not legal-proof.
4. **Consent writer**: append/withdraw policy, serialisation lock order, same consent notice/language/hash authority, database transactions, retry and fail-closed triggers; concurrent creation/update/regrant and isolation-level tests.
5. **Actual assessment workflow and dashboards**: versioned instruments, secure submissions, consent-scoped read models for both customer and private admin, separate immutable human report approval, PARENT_VISIBILITY guardian permission.
6. **Scientific evidence**: version × language × age/population × intended-use validation dossier; PREVALIDATION remains the honest instrument status.
7. **Release quality**: staging/backup restore, cash/payment scope, Core Web Vitals, SEO/404/bilingual paths, a11y and authorized signoff; no change to the frozen design and SEO standards.

**Decision:** P0 protected *structural inspection* and locked-guardian-read **implementation/test contracts** advanced; full scientific-tool activation remains blocked. This document is an evidence-bearing checkpoint, not a frozen final Super Master Plan.
