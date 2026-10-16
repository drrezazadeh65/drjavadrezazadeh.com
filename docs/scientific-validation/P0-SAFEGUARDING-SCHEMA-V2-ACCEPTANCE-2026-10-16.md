# P0 — Safeguarding Schema v2: Structural Readiness without False Release

**Date:** 2026-10-16  
**Working branch:** `work/p1-scientific-validation-20261016`  
**Decision:** **PASS — isolated database/UI security and compatibility tests only.**  
**Production status:** **NOT DEPLOYED, NOT MIGRATED, NO LIVE BERTINA SCHEMA INSPECTED, NOT SCIENTIFICALLY VALIDATED.**

## 1. Structural risk closed

The original read-only scientific schema preflight and bilingual admin UI had three domains:

1. consent and guardian governance;
2. assessments and reports;
3. BAHAR longitudinal evidence.

After introducing independently reviewed age attestations and learner assent, those three domains could have been structurally compatible while **both child-safeguarding tables were missing**. The admin could then have seen an unjustified all-green structural message. This is a version-contract bug, not an endorsement of deploying the proposed safeguards.

The scientific preflight now uses **`scientific-structural-preflight-v2`**. Its fourth mandatory domain, **`safeguarding`**, requires the two specific candidate table signatures:

| Required table | Minimal provenance / integrity fields | Purpose |
| --- | --- | --- |
| `eco_subject_age_attestations` | learner subject, adult/minor classification, jurisdiction, policy version, source code, dual reviewer IDs, evidence digest, reviewed/expiry/revocation times | A *candidate* independently reviewed classification; does not store birth date or identity document |
| `eco_minor_assent_records` | learner subject, guardian account, pinned notice version/hash, reviewed decision, source/reviewer, assent time, expiry, withdrawal | Distinct learner agreement or refusal; parental permission alone is not enough |

Both are defined in **`database/unified/006a_age_attestation_PROPOSAL_NOT_APPLIED.sql`**, which is NOT an executable approved migration. No database changes are performed by the preflight.

### Readiness language

The field `modules.safeguarding.columnProjectionReady` means **only** that a fixed allowlist of column names can be projected with `SELECT ... LIMIT 0`. It never means that actual guardian credentials, legal consent, reviewer authority, evidence provenance, FK/index state, data-retention policy, or ethical approval has been established.

Every reply explicitly carries:
- `personalRowsRead: false`;
- `realProductionCertified: false`;
- `operationalWriteApproved: false`.

The function never reads actual learner records or stores DOB/ID data. The MFA-protected admin route creates one scoped operations audit event, as already implemented.

## 2. Concrete code and UX changes

- `api/operations-scientific-schema.php`: fixed four-domain allowlist with exact required age and assent columns; upgrades schema version from v1 to v2.
- `api/operations.php`: changes the successful audit reference to `scientific-structural-preflight-v2`. Existing administrator membership, MFA, rate limiter, response handling and read-only route shape remain unchanged.
- `assets/js/operations-scientific-schema.js`: refuses v1, missing or malformed v2 domains; provides localized Persian RTL / English LTR labels for the new safeguarding domain and clear warnings that *matching structure ≠ lawful operational readiness*. Renders safe text nodes, not HTML.
- `fa/app/admin/index.html` and `en/account/admin/index.html`: both use a distinct v2 JavaScript query version to invalidate stale cached frontend code after the new mandatory contract. No public URLs or SEO navigation change.
- `tests/operations-security.php`: verifies missing both candidate tables => unavailable; only an age table without learner assent => unavailable; both with full signature => *column-projection-ready only*. Fictional learner and evidence sentinel strings must never leave the route.
- `tests/operations-scientific-schema-browser.spec.js`: requires **four domain cards**, refuses old v1 payloads and missing safeguarding, tests hostile data, verifies a fully matching fixture still displays a non-certification disclaimer.
- `tests/bertina-free-stage-mysql.php`: repeats missing and present safeguarding structural checks on MySQL 8 and MariaDB 10.11 with temporary tables.
- `tests/bertina-public-consent-assembly.mjs`: enforces packaging of the v2 API and v2 JS assets; rejects stale v1 HTML asset version and missing safeguarding modules in the sanitized `.public-site` build.

## 3. Exact proposed DDL compatibility — not a production migration

The new **`tests/bertina-safeguarding-migration-dry-run-mysql.php`** does not merely construct simplified temporary tables. With a *hardcoded loopback operations_fixture DSN* and explicit CI-only opt-in it:

1. Creates a random disposable MySQL/MariaDB schema.
2. Creates only fictional, minimal canonical `customer_accounts` and `eco_subjects` parent tables.
3. Extracts exactly the **two CREATE TABLE statements** from the *nonapplied* candidate SQL file and executes them in the disposable schema.
4. Verifies InnoDB storage, **six canonical foreign-key links**, subject-time indexes, and that raw DOB/ID/scan/contact fields are absent.
5. Confirms zero-row column queries are compatible.
6. Drops the disposable schema in a `finally` block.

**Observed CI evidence:** [run 38854450219](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38854450219) succeeded in all six jobs: **18 candidate-DDL dry-run checks each on MySQL 8 and MariaDB 10.11**, **28 temporary-table guardian/consent and preflight checks per engine**, **48 Chromium operations UI tests** (existing 36-report workflows preserved), plus PHP MFA/policy, privacy and sanitized packaging checks. Duplicate scenarios across engines are compatibility evidence, *not two independent scientific studies*.

## 4. No-go gates remaining

**DO NOT** install `006a_age_attestation_PROPOSAL_NOT_APPLIED.sql` on live Bertina merely because synthetic DDL passed. Before approval:

1. Use the deployed, authenticated MFA-only private diagnostic *after* a separate owner-approved release to inspect **installed** schema; collect only structural flags, no learner data.
2. Independently approve jurisdiction/age/guardian/capacity and assent/refusal/withdrawal ethics, safeguarding and retention policy, including a separate privacy-request procedure for accounts that have been disabled.
3. Check real customer_accounts / eco_subjects column types, charset, storage engine, actual FKs/indexes, key uniqueness, migration bookkeeping, backup restore and rollback.
4. Establish independent verifier capabilities, dual-control, notice versions, source authority, evidence assurance and safe expiry/revocation; a digest alone never proves age.
5. Build, review and connect a trusted server-side account/subject/assent/consent reader, the legal write workflows and private customer/admin reports with audit, CSRF, MFA where relevant, session checks, role scoping and end-to-end tests.
6. Complete validation studies for specified instrument versions, languages, learner populations and interpretations. **`PREVALIDATION`** remains the scientific status until empirical evidence is accepted.
7. Freeze one evidence-based Super Master Plan only after the remaining governance and operational decisions are resolved. Never confuse CI success with live site publication.

**No regression permitted:** the existing core admin design, 36 operations reports, SEO canonical URLs, Persian/English routing, healthy customer logins and existing private BAHAR paths must be preserved.
