# P0 — Existing Private Read Consent Hardening and Scientific Schema Preflight
**Date:** 2026-10-16  
**Branch:** work/p1-scientific-validation-20261016  
**Status:** Developed, nondeploying. No production credentials, SQL migration, learner record or real account was accessed. **NOT a production/psychometric release certificate.**

## Implementation changes, not just proposals

### Existing authenticated guardian API hardened
`api/golden-talent.php` is an existing public-API PHP module with two authenticated read-only private routes. Their guardian and consent checks already existed but previously fetched `LIMIT 2` recent consent rows and used a simplified grant check. A later `withdrawn_at` mutation on an older grant could therefore be missed by the last-two-row model.

- Both scoped consent read queries now select `id, account_id, subject_id, notice_id, decision, withdrawn_at, granted_at` plus joined `purpose_code, version_label, locale, notice_sha256, effective_at, retired_at`.
- Both query up to **1025** decisions per trusted subject/account/purpose; the one extra row acts as a fail-closed overflow sentinel. This is deliberately not a complete-history attestation for arbitrarily long accounts; more than 1024 matching decisions denies.
- Both use `goldenTalentPurposeConsentCurrent`, which delegates to one canonical PHP projection and denies missing/invalid notice metadata, ambiguous timestamp ties, future events, explicit withdrawals and later mutations of earlier grants.
- Comparison clock uses `microtime(true)` so a current MySQL DATETIME(3) grant is not treated as a future grant merely because `time()` truncates the current second.
- No new API routes, assessment writes, report downloads, anonymous disclosure or entitlement grants were enabled. Existing endpoint shapes, authentication, rate-limiting and audit-before-response logic are preserved.

### Publish-package dependency repaired before deployment
The Bertina builder `scripts/build-public-site.mjs` explicitly excludes `platform/`. Therefore importing `platform/bertina-consent-projection.php` at runtime would fail in the sanitized deployment, even if isolated PHP tests passed.

**Single source of truth now lives in `api/golden-talent-consent.php`.** Its guarded functions have no I/O. Direct standalone HTTP requests are rejected without the internal bootstrap constant. The internal `platform/bertina-consent-projection.php` file is only a research alias requiring that same API file; it contains no duplicate implementation.

`tests/bertina-public-consent-assembly.mjs` runs after constructing `.public-site` and asserts the guarded library and API are actually included and forbidden internal directories are absent. The CI workflow has a separate nondeploying release-assembly job.

### Backward compatibility and SQL regression
- `tests/golden-talent-guardian.php` now tests both real guardian read methods using the canonical projection, notice identity/hash, future/retired versions, three-event regrant sequences and earlier-grant withdrawal after newer grant.
- `tests/bahar-guardian-mysql.php` still tests the existing BAHAR authorised alias/count projection and audit, but temporary consent-notice tables now contain the real proposed metadata, and revocation/regrant mutation behaviour is covered. This test runs on both MySQL 8 and MariaDB 10.11.
- `tests/bertina-consent-projection.php`, `tests/bertina-free-stage-authorisation.php`, `tests/bertina-dashboard-projections.php`, free-stage Node tests and bilingual DTO tests remain additive regression coverage.

## Read-only planned schema compatibility preflight
`platform/bertina-scientific-schema-readiness.php` implements `bertinaScientificSchemaContract(PDO)` for trusted callers. It issues only fixed-allowlist `SELECT column... FROM table LIMIT 0` probes. No personal row is selected or returned. It groups column compatibility into three signals: consent/guardian, scientific assessment, and BAHAR portfolio/cycle.

`tests/bertina-free-stage-mysql.php` checks that synthetic **temporary** core tables pass the consent/guardian projection, while omitted assessment and BAHAR domains are *correctly* shown as structurally incompatible, and preflight never pretends to be a production certification.

**Important limits:** no real installed Bertina schema has been inspected by this code in this conversation; a zero-row column probe does not verify foreign keys, indices, uniqueness, grants, UTC server settings, historical migrations, backup restorability or age/guardian evidence. MySQL temporary fixtures are evidence of query compatibility only.

## Trust-boundary and release conditions still open
1. Read-only on-server inventory of installed tables, columns, migration checksums and deployment package fingerprint.
2. Independently verified minority/adulthood status — `eco_subjects.age_band` is not legal-age proof; define ethical evidence minimisation and retention before attempting private assessments.
3. Child assent/delegation policy and purpose-specific guardian permission.
4. Consent writers and readers in one transactional revocation/notice lifecycle, including concurrent withdraw/regrant tests and backend audits.
5. Customer and admin dashboard server **read model** integration via the actual PDO and role/MFA framework; separate restricted report delivery; no child evidence without distinct visibility consent.
6. Independent, instrument-version/language/population/use-specific scientific evidence dossier; PREVALIDATION remains the only supported claim.
7. Staging end-to-end, bilingual accessibility/privacy, noindex, no broken links, security review, rollback verification and **explicit owner authorization for any deployment**.

## CI evidence
[Run 38822212452](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38822212452) tests four nondeploying areas: sanitized API dependency packaging, PHP/JS consent and dashboard policies, and guardian BAHAR synthetic read/revocation queries on both MySQL 8 and MariaDB 10.11. Check workflow completion before asserting all four have passed.
