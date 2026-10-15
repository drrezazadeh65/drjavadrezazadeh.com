# Customer and Admin Dashboard Privacy Contract — Scientific Prototype Acceptance

**Date:** 2026-10-16  
**Status:** DRAFT — isolated PHP/JS contract tests, no production routes enabled; not the final Super Master Plan  
**Canonical identity/database:** Bertina existing customer_accounts + proposed eco_* SQL, subject to actual installed-schema verification  
**Design authority:** foundation/DESIGN-SYSTEM.md, foundation/MASTER-ECOSYSTEM-ROADMAP.md, the frozen bilingual SEO baseline, the cinematic mobile-first spec

## 1. Why there are two separate view contracts

The main customer dashboard (assets/js/customer-dashboard.js) presently loads auth and commerce health, verified account state and limited support health. It does **not** load an authoritative Golden Talent / RCAS / BAHAR assessment-report API. The BAHAR guardian overview is a distinct read-only consent-scoped API with counts only. The admin-engine-dashboard.js is labelled public-safe engineering status; it is **not** a private student record console. Do not promote either as an active assessment analytics dashboard.

The new isolated contract files formalise distinct, minimal read models, without replacing the existing public UI or creating a second account database:

- platform/bertina-dashboard-projections.php — **customer and administrator server-side pure projections**, with no routes or database connection
- tests/bertina-dashboard-projections.php — synthetic privacy/consent/scoping and suppression scenarios
- assets/js/talent-dashboard-view-model.mjs — **Persian/English presentation-only** mapping to fixed, honest states
- tests/talent-dashboard-view-model.test.mjs — bilingual state validation, no raw-data or fabricated clinical/paid access
- .github/workflows/scientific-free-stage-policy-qa.yml — nondeploy CI

## 2. Read-only customer contract v1

Call from **future verified backend only**, not directly from user-provided JSON. The PHP pure function first invokes the MySQL-native free-stage authorisation for **each** module. For a minor's guardian it additionally requires a verified, complete, independent PARENT_VISIBILITY consent history; an ASSESSMENT grant is not sufficient for disclosure.

The **whitelisted response** has three modules in stable order (GOLDEN_TALENT, RCAS, BAHAR) with `freeStage`, `paidStage`, `report` state. Unknown/pending records remain **UNKNOWN**; they are never inferred from missing database rows. Stage completion requires an identified trusted event and immutable instrument version. Paid state remains NOT_VERIFIED. Report state remains NOT_CONNECTED until a separate reviewed, version-pinned release workflow has passed. No learner IDs, answers, scores, profile narratives, child identities, private URLs, payment identifiers or supporting document locations are projected.

The JS presentation adapter rejects unknown schema versions and inconsistent stage/permission claims. It returns text-only localized copy, not HTML; a future UI should render using `textContent` and the reusable design-system components. It deliberately never offers an active report-download or paid-stage-start action based on this preproduction DTO.

Example whitelisted body **using fictional unknown states**, not real user data:

```json
{
  "ok": true,
  "schema": "talent-customer-overview-v1",
  "viewerScope": "VERIFIED_SELF",
  "modules": [
    {"module":"GOLDEN_TALENT","freeStage":{"code":"ORIENTATION","state":"UNKNOWN","paymentRequired":false},"paidStage":{"state":"NOT_VERIFIED"},"report":{"state":"NOT_CONNECTED","scientificStatus":"PREVALIDATION"}},
    {"module":"RCAS","freeStage":{"code":"CONTEXT_REFLECTION","state":"UNKNOWN","paymentRequired":false},"paidStage":{"state":"NOT_VERIFIED"},"report":{"state":"NOT_CONNECTED","scientificStatus":"PREVALIDATION"}},
    {"module":"BAHAR","freeStage":{"code":"STARTER_PLAN","state":"UNKNOWN","paymentRequired":false},"paidStage":{"state":"NOT_VERIFIED"},"report":{"state":"NOT_CONNECTED","scientificStatus":"PREVALIDATION"}}
  ],
  "hasPrivateEvidence":false,
  "normativeScoresAvailable":false,
  "reportDownloadAvailable":false
}
```

## 3. Administrator contract v1

A future verified **admin-only** API must first authenticate account and fresh TOTP/MFA, resolve an *explicit* `ASSESSMENT_OPERATIONS_SUMMARY` capability and audit scoped access. It must not reuse a public admin-engine-dashboard.js feed, and being an ordinary admin/organization member must not confer access to learner data.

A pure aggregate projection is available with `GOLDEN_TALENT`, `RCAS` and `BAHAR` only. Per-module counts cover `in_progress`, `review_pending`, `released`. If a module contains a nonzero count below 5, **all** its counts are suppressed, preventing simple total/complement arithmetic disclosure. Unknown aggregates are UNAVAILABLE, not zero. Repeated-query differencing, demographic slicing and dataset updates create additional disclosure risks: production would also require rate-limited fixed periods, cohort-bound queries, minimum population, permissioned logs and a formal disclosure-control review.

This summary **never** authorizes case detail, exports, scores, direct messaging or cross-account report reads.

## 4. Acceptance and unresolved dependencies

| Check | Evidence | Status |
| --- | --- | --- |
| Pure PHP consent and free-stage policy | Synthetic PHP unit tests | PASS in isolated CI |
| MySQL 8 and MariaDB 10.11 relation/consent joins | Synthetic temporary-table CI | PASS in isolated CI |
| PHP customer/guardian DTO: child visibility, withdrawal, unknown ≠ zero, data minimization | tests/bertina-dashboard-projections.php | PASS: 38 isolated PHP checks in GitHub Actions run 38818492557 |
| PHP administrator DTO: MFA, summary capability, k=5 suppression, no detail | tests/bertina-dashboard-projections.php | PASS: 38 isolated PHP checks in GitHub Actions run 38818492557 |
| FA/EN presentation mapping and invalid-state rejection | tests/talent-dashboard-view-model.test.mjs | PASS: 5 Node subtests, included in 22 successful JS tests in GitHub Actions run 38818492557 |
| Actual installed Bertina table/column provenance | Read-only production inventory | BLOCKED / not verified |
| Real age-classification verification and child assent | Privacy and legal/ethical design | BLOCKED / not implemented |
| Transactional consent revocation across request boundaries | Isolated concurrent integration + accepted writer contract | BLOCKED |
| Actual read-only PHP API endpoints, audit and no-store | No route currently wired | BLOCKED |
| Staging customer and admin browser E2E with real server-derived fixtures | Playwright, RTL/LTR, WCAG, mobile/desktop | BLOCKED |
| Empirical instrument reliability, validity and fairness dossiers | Real approved studies | NOT DEMONSTRATED |

## 5. Next authorised engineering sequence (without deployment)

1. Get read-only evidence of **installed** Bertina schema and migration revisions; no learner records and no changes.
2. Define legally/ethically appropriate age classification and minor assent, with approved evidence source and retention policy.
3. Reconcile consent writers, notice lifecycle, UTC ordering and concurrency, with MySQL transaction fixtures.
4. Add account/guardian/consent-safe API read routes under existing api/golden-talent.php only after a real backend reader passes role and row-scope tests.
5. Wire bilingual customer dashboard to scoped v1 projection; separately create a truly private admin operations panel with MFA. Preserve frozen visual tokens, no SEO route changes, no 404s, no indexation of private views.
6. Introduce human-reviewed descriptive report lifecycle separately, only when scientific-release records are independently verified and purpose-scoped.
7. Stage/test/rollback/owner-signoff: production release remains prohibited absent explicit authorization.

**No new protected user journey has been activated by these prototype files. No live personal data was accessed.**

## CI evidence obtained after drafting

[Scientific free-stage policy QA run 38818492557](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38818492557) passed all three jobs. The logs confirm 29 PHP consent checks, 25 PHP free-stage authorisation checks, 38 PHP customer/admin dashboard DTO checks, 22 Node policy/presentation subtests, and 16 MySQL 8 plus 16 MariaDB 10.11 temporary-table checks. **146 passing test executions total, of which the database 16 scenarios were repeated on two engines.** These are synthetic, bounded contracts only and do not prove that the proposed eco_* tables are installed, that live consent is lawful, or that the instruments are psychometrically validated. The frontend view model is not wired to public pages.
