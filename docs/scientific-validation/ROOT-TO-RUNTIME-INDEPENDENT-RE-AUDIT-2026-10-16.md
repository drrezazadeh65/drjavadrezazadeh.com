# Root-to-Runtime Independent Re-Audit — Golden Talent / RCAS / BAHAR
Date: 2026-10-16
State: REVIEWED WORKING AUDIT; **NOT** the frozen Super Master Plan; **NOT** deployment approval.
Repository: drrezazadeh65/drjavadrezazadeh.com
Audit branch: work/p1-scientific-validation-20261016
Scope: scientific defensibility, actual API/backend and Bertina SQL contracts, customer/admin integration, free-first stages, privacy and consent, design/SEO/revenue, release policy.

## Executive finding
**NO-GO for activation of new private assessments, validated-score claims, paid digital reports, or unified live BAHAR tracking.** Software policy tests are not empirical psychometric validation or an end-to-end production integration certificate. Preserve existing working public site, storefront, account, and limited authorised read-only surfaces.

The code is more mature than a blank project: existing protected PHP routes, guardian-scoped BAHAR read-only counts, version registry, pure policy primitives, longitudinal formative engines, full design system, standard SEO baseline, and isolated test pipelines. The missing part is canonical runtime integration and purpose-specific empirical evidence, not another independent UI framework.

## Evidence levels
- **Directly checked repository source:** file code/DDL/readme, not proof the proposed SQL has been installed.
- **CI checked:** GitHub Actions Scientific free-stage policy QA succeeded on push runs 38814597169, 38814922191 and 38815002564. The last run explicitly succeeded on syntax, isolated PHP projection, and Node policy tests. Follow-up isolated checks for consent date validation also passed on GitHub Actions run 38815603892 (commit ef29b0e). This is limited to the repository's declared checks, not staging or production certification.
- **Not verified:** live Bertina schema, current consent data, live operational health, private authenticated flows, payment settlement, current SEO rankings, psychometric samples. Direct web access to site health was unavailable at this review.
- **Externally confirmed research standards:** AERA/APA/NCME *Standards for Educational and Psychological Testing* (2014, NCME distribution); ITC *Guidelines for Translating and Adapting Tests* (2017); ITC/ATP *Guidelines for Technology-Based Assessment* (updated July 2025); Mokkink et al., *Journal of Clinical Epidemiology* 2025, DOI 10.1016/j.jclinepi.2025.111879 (content validity relevance/comprehensiveness/comprehensibility; adapt COSMIN principles carefully outside health measurement).

## Confirmed audit findings (severity, evidence, consequence, required action)
| ID | Priority | Confirmed source observation | Risk / decision |
| --- | --- | --- | --- |
| A01 | P0 | api/golden-talent.php health contract describes privateAssessmentApiActive:false, profilePersistenceActive:false, professionalReleaseApiActive:false, weeklyCycleAndEvidenceApiActive:false; routes primarily health, my-subjects, my-bahar-overview. | No full customer assessment lifecycle despite code artifacts. Build real backend only after canonical schema, consent, permission and release tests. |
| A02 | P0 | database/unified/README.md describes 198 eco_* proposed tables, NOT applied to production; historical PostgreSQL platform/db/migrations not compatible with Bertina MySQL. | Do not execute prototype migrations; read-only production table/column/migration inventory required, then selective additive migrations with rollback. |
| A03 | P0 | api/golden-talent.php derives current consent from latest MySQL granted_at rows + notice effective/retired status, while platform/golden-talent-phase12-gates.mjs currentConsent requires sequence + decided_at; eco_consent_records has granted_at but no sequence. | One canonical Bertina consent decision policy is needed. Distinguish logical decision time from grants; handle withdrawal and timestamp ambiguity, locale-specific notice, expiry, concurrent writes, history completeness; PHP remains actual enforcement boundary. |
| A04 | P0 | platform/free-first-stage-consent-adapter.mjs requires canonical guardian relation type/state/capabilities; eco_subject_relationships stores relationship_code/verification_status/expiry, NO capabilities. eco_subjects stores age_band but NO is_minor property. | Explicit, tested server-side DTO mapper is required; cannot simply query raw SQL row and feed JS helper. Jurisdiction-sensitive verified minor/guardian status must never be inferred from age_band. |
| A05 | P0 | assets/js/customer-dashboard.js fetches auth/health, commerce/health, auth/me and student-support/health, not a Golden Talent/RCAS/BAHAR private overview; assets/js/bahar-guardian-overview.js uses separate scoped GET. | The common customer dashboard has no verified unified reports/assessment API integration; require small permissioned, versioned projections, no duplicate account system. |
| A06 | P1 | platform/golden-talent-instrument-registry.v1.json RCAS-CORE version is start-1.1-browser-preview, assets/js/rcas-start.js writes preview revision start-1.2; English bridge expects start-en-pilot-1. | Distinguish genuinely different locale editions or reconcile exact compatible version records. Never silently merge responses or interpret across versions. |
| A07 | P0 science | Registry scientific_policy.validation_status is PREVALIDATION, RCAS is browser-only, D1-D6 entries are not frozen/content verified; BAHAR_MODEL.status=PREVALIDATION. | No norms, percentile, composite talent/career destiny claim, diagnostic score or scientific validation badge. AERA/ITC-aligned purpose/population/locale-specific evidence study protocol required. |
| A08 | P1 | platform/scientific-release-gate.mjs uses scope, independent approval booleans and dossier-reference strings as policy inputs, but no demonstrated verifiable external dossier binding. | A gate's success is not proof of scientific evidence. Reference immutable reviewed dossiers, signoffs and external verification; require tests for forged/expired review status and scope mismatches. |
| A09 | P1 | platform/free-first-stage-policy.mjs trusts an injected persisted/is_current marker and pure adapters are not API security boundaries. | Assess current consent on every protected API read/write, in correct transaction; never accept caller/client claims. |
| A10 | P1 | platform/bertina-consent-projection.php (isolated, no runtime wire-up) originally accepted date rollovers because PHP DateTime may warn yet return value. | Patch warning/error handling and regression tests in branch; separately test timezone, precision, revoked notice and simultaneous decisions. CI is not live acceptance. |
| A11 | P1 | Existing free-first stage semantics named GOLDEN_TALENT/ORIENTATION, RCAS/CONTEXT_REFLECTION and BAHAR/STARTER_PLAN but no authenticated server-backed completion contract. | Keep free previews useful and honest; distinguish public anonymous reflection from server-backed authenticated free account journey and optional paid human review. Never request payment for free stage. |
| A12 | P1 | Stage14 growth consultation consent records are not assessment or parent visibility consent; historic growth/health consentSchema:false cited in database/unified/README.md. | Verify current Stage14 health separately, without treating historic observation as current outage; never conflate consent purposes. |
| A13 | P1 | frozen foundation/DESIGN-SYSTEM.md, frozen foundation/MASTER-ECOSYSTEM-ROADMAP.md and documented master SEO standard; newer scientific master plan is still a working draft. | Reference those frozen foundations; do not substitute a new incompatible visual/SEO framework, change URLs or release without approval. |
| A14 | P2 | docs/scientific-validation/UNIFIED-SCIENCE-DESIGN-SEO-REVENUE-MASTER-PLAN-2026-10-16.md contains research-intent and revenue hypotheses but has no verified current GSC country baseline, conversion cohort evidence or live revenues. | Prioritise truthful educational discovery and ethical paid interpretation; validate market data before revenue forecasts or canonical page changes. |

## Canonical architecture after this audit
1. Existing customer_accounts and commerce_orders stay the sole first-party identity/order sources.
2. New eco_* subject/consent/assessment/evidence/read model domains are *planned* schema until proven installed. Prefer small additive certified migrations over wholesale 198-table activation.
3. Backend PHP enforces authentication, account/subject/guardian links, purpose-scoped consent, expiry, entitlement and release; JS/Node remains a pure reference/testing implementation unless an explicitly secured service is introduced.
4. Free public browser reflections may remain stateless/unlinked. Authenticated persisted free-first stages require explicit consent, stable subject identity, version-pinned immutable administration and safe private dashboard projection.
5. Golden Talent = formative integrator, RCAS = contextual evidence, BAHAR = longitudinal development cycle. Shared evidence portfolio retains source/time/context/unknowns; no pseudo-scientific total score.
6. Report states separate DRAFT, REVIEW_REQUIRED, RELEASED, WITHDRAWN and REVOKED; scientific statuses RESEARCH, PILOT, VALIDATED_FOR_SPECIFIED_USE and RETIRED refer to *defined claims and populations*, not global platform quality.
7. Customer/admin dashboard contracts must be separate, least-privilege read-model projections; no direct frontend table access or analytics records containing minors' responses.
8. Preserve premium academic bilingual design, fa RTL/en LTR, WCAG-aligned accessibility, same reusable templates for reports/forms/infographics and search-safe public/strictly private page boundary.
9. Deployment only after evidence-based gate and explicit owner approval. Never publish this audit branch automatically.

## Research protocol required before any score interpretation
For EACH instrument × version × language × population × intended use: construct definition and source synthesis; item-construct map; expert content review; child/guardian cognitive interviews and accessibility testing; bounded formative pilot; response process; internal structure *if a scale is truly proposed*; appropriate reliability/precision and uncertainty; convergent/discriminant or outcome evidence only when scientifically justified; differential item functioning/equivalence when sample size permits; adverse effects/fairness; independent review; limitations and revalidation triggers. Pre-register design and sample plan. No made-up sample size, alpha, norms or thresholds. For BAHAR process evaluation, longitudinal usability/fidelity and real development indicators are appropriate; do not automatically force psychometric scale analyses on every module.

## Required staged acceptance (gates, not estimated completion percentages)
- G0: Latest branch/CI inventory, test outcomes, no automatic deployment, frozen foundations read and accepted.
- G1: Read-only Bertina live schema/API inventory and backup/rollback verified; exact consent, subject, relationship and version DTOs approved.
- G2: PHP consent/guardian/revocation/transaction/cross-subject tests and request-level E2E, with no leakage in logs or caching.
- G3: Version-pinned free-first authenticated journey independently tested for all three modules, including useful results with no payment.
- G4: Safe report workflow, human scientific release check and minimum data retention/deletion lifecycle.
- G5: Connected bilingual customer/admin dashboards, end-to-end real-service fixtures, accessible visual QA and no regressions.
- G6: Scientific dossier sign-off per intended use; honest disclosures and document provenance.
- G7: Controlled staging, SEO/404/redirect regression, payments/refunds, support/incident drill, then explicit owner release sign-off.

## Reconciliation with previous progress messages
The earlier statement 'tests have not been run' is superseded: GitHub Actions proved all three earlier policy workflow runs succeeded. That confirms *isolated code checks only*. The previously described consent timestamp issue was partly addressed by converting MySQL milliseconds to PHP microseconds; a date-rollover validation patch was added in branch during this re-audit. GitHub Actions run 38815603892 completed successfully on commit ef29b0e, including the expanded PHP consent-date regression. No runtime API or DB compatibility test is implied.

## Not yet frozen; minimum remaining before final Super Master Plan
Resolve A01–A05 by exact canonical API/SQL/runtime mapping, reach agreement on A06 version taxonomy, capture scientific evidence matrix, document service-specific bilingual dashboard flows and current research/market baseline, define acceptance fixtures and release authority. Only then consolidate to one final plan aligned with the existing frozen roadmap. No production deploy, database migration, live data inspection or modification is claimed.


## Implementation checkpoint — P0 consent and guardian adapter (2026-10-16)

**Observed nondeploy CI:** [Scientific free-stage policy QA, run 38817126782](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38817126782) completed with BOTH jobs green. Logs show 29 isolated PHP consent checks, 25 isolated PHP DTO access checks, 17 JavaScript policy tests, and 16 MySQL 8 ephemeral temporary-table integration checks — **87 passing checks total**, 0 Node test failures. Job success is evidence of this bounded synthetic suite only.

**Implemented on this scientific branch:**
- PHP consent projection handles both explicit withdrawal decisions and later grant withdrawn_at modifications, strict UTC fractional-second DATETIME(3) and notice/version/hash/retirement; latest ambiguous timestamps deny.
- MySQL-native PHP free-first authorisation validates exact stage, canonical subject ownership, active account, server-proven subject/guardian link with expiry, scope-matched complete consent, and independently verified age classification; UNKNOWN age denies. Pure prototype, not invoked by API.
- The JavaScript free-stage policy denies unknown age and requires guardian-session launch for minors pending a formal minor assent/delegation lifecycle.
- A test job starts an isolated MySQL 8 operations_fixture service and constructs temporary eco_* tables with synthetic identities, guardian decisions, regrant and withdrawal. It does not connect to production.

**Still blocked:** no actual Bertina installed-schema proof, no verified age-classification source in reviewed eco_subjects schema, no production-consent transactional writer, no private assessment submission, no persisted scientific report release or unified dashboard. Existing customer/admin panels and public browser RCAS are intentionally untouched. A01–A05 remain runtime release blockers despite bounded policy QA progress. Do not equate 87 checks with psychometric validity or real-customer acceptance.

**Documented trust contract:** docs/scientific-validation/P0-CANONICAL-IDENTITY-CONSENT-ADAPTER-DECISION-2026-10-16.md.


### Cross-engine fixture acceptance — MySQL 8 and MariaDB 10.11
GitHub Actions [run 38817368074](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38817368074) completed with **all three jobs successful**: (1) PHP/Node pure policy, (2) isolated MySQL 8.0 temporary-table SQL joins, and (3) isolated MariaDB 10.11 temporary-table SQL joins. The latter two each ran the 16 synthetic MySQL-native guardian/consent access scenarios. The total is **103 check executions**, including 16 equivalent scenarios rerun on the second engine; this is **not 103 independent scientific validations**. No live Bertina data was accessed and no PHP runtime route was enabled. CI is strong evidence of the proposed adapter's portability, not of installed production schema or informed consent governance.


## Customer/admin DTO and instrument research checkpoint (same date)

- **New privacy-safe PHP prototypes**: platform/bertina-dashboard-projections.php and tests/bertina-dashboard-projections.php. Customer access requires server-authorized free stages; a guardian additionally needs independent current PARENT_VISIBILITY consent. No private data, scores or report links leave the whitelisted DTO. Admin aggregate requires fresh MFA and a dedicated capability; low-count categories suppress the whole module.
- **New bilingual client-side view model**: assets/js/talent-dashboard-view-model.mjs with tests/talent-dashboard-view-model.test.mjs; strict fixed schema, FA/EN labels, unverifiable/malformed states rejected, no fabricated report, score or paid entitlement.
- **Verified CI**: [run 38818492557](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38818492557) completed with all three jobs successful, showing 29 consent, 25 PHP free-stage, 38 PHP dashboard, 22 JavaScript and 16 MySQL + 16 MariaDB successful *test executions* (146 total). The database scenarios are duplicates across compatible engines, and none of this demonstrates live end-to-end service or psychometric validation.
- **UI/architecture acceptance**: docs/scientific-validation/CUSTOMER-ADMIN-DASHBOARD-PRIVACY-ACCEPTANCE-2026-10-16.md. Existing production customer/dashboard files have not been altered and no prototype has been bound to an API route.
- **Scientific status matrix**: docs/scientific-validation/INSTRUMENT-BY-INSTRUMENT-EVIDENCE-MATRIX-2026-10-16.md specifies source mapping, cognitive interviews, bilingual adaptation, fit-for-purpose empirical work, fairness, human interpretation and separate BAHAR formative-process evaluation for Golden Talent, RCAS, D1–D6 and BAHAR. Evidence status remains PREVALIDATION and no empirical results were invented.
- **Current live capability not asserted**: requests to public /api/golden-talent/health and /api/growth/health were inaccessible through web inspection, so installed-schema status and real runtime API operation remain UNVERIFIED. Existing code health contracts and earlier live evidence must not be substituted for this check.

**Stage decision:** isolated policy/API-DTO design and cross-engine fixture tests pass. Full runtime consent/age/assent enforcement, installed-schema inventory, genuine user/admin read routes, bilingual browser acceptance, scientific empirical validation and owner-authorised publication remain blocked. Not the final frozen Super Master Plan.


## P0 Guardian Read-Path Hardening and Safe Package Evidence — 2026-10-16

This checkpoint **supersedes earlier audit sentences saying the existing PHP guardian read path is unchanged**. The *development branch* now changes the existing authenticated `/golden-talent/my-subjects` and `/golden-talent/my-bahar-overview` consent checks (their public URLs, response structures, read-audit logic and available actions are preserved). Both consent queries use subject/account/purpose-scoped `LIMIT 1025` history with strict notice metadata and a single fail-closed projection, including latest `WITHDRAWN`, grant-level `withdrawn_at`, regrant after withdrawal, timestamp ambiguity, notice retirement and bounded future checks. This is **code tested in a nondeploying branch**, not a claim that the live site or MySQL schema was changed.

**Release dependency discovered and corrected:** `scripts/build-public-site.mjs` intentionally excludes `platform/`, so a runtime require into that folder would break. Canonical projected consent implementation now resides in `api/golden-talent-consent.php` with direct HTTP access guarded; `platform/bertina-consent-projection.php` simply delegates to this one source for reference tests. An isolated release-assembly test proves the API dependency is in the sanitized .public-site package and internal directories are excluded.

**Schema inventory capability:** `platform/bertina-scientific-schema-readiness.php` provides a trusted-caller zero-row, fixed-column compatibility projection for consent/guardian, assessment and BAHAR tables. It was tested on synthetic MySQL 8 and MariaDB 10.11 temporary tables; the source inspection is NOT a live Bertina production schema inventory, index/foreign-key certificate or backup restoration.

[GitHub Actions run 38822501322](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38822501322) passed **all four nondeploying jobs**, with observed per-job logs: 43 existing guardian API contract assertions; 29 PHP consent checks; 25 free-stage DTO checks; 38 dashboard privacy assertions; 22 Node subtests; 20 MySQL 8 and 20 MariaDB 10.11 schema/consent checks, plus successful BAHAR synthetic SQL/audit verification on both engines; the sanitized release packaging guard also passed. Synthetic tests cannot establish legal minor status, live operational readiness, final consent transaction guarantees or scientific validity.

**Remaining no-go gates:** actual installed Bertina schema and security authority inventory; trusted verified age and guardian assent; common consent-writer locking/revocation; real backend dashboard API and bilingual E2E; psychometric evidence per purpose and language; one owner-approved controlled deployment. Frozen foundational design/SEO and existing healthy public routes remain untouched.

## P0 Admin Scientific-Schema Readiness + Consent Concurrency Acceptance — 2026-10-16

This checkpoint **advances, but does not close**, prior installed-schema/consent-concurrency blockers:

- Added **MFA-only and rate-limited** `GET /api/admin/operations/scientific/schema-readiness` under existing `operationsRoute` with owner-role verification, audit event and guarded packaged `api/operations-scientific-schema.php`. Read-only fixed-column `SELECT ... LIMIT 0` probes for four identity/consent, eight scientific assessment and five BAHAR tables; no personal learner rows. The result explicitly sets `realProductionCertified:false` and `operationalWriteApproved:false`.
- Added restrained bilingual Persian RTL / English LTR disclosure to the **existing authenticated admin workspace**, using frozen `ops-*` design classes; no new public route or SEO indexation. `assets/js/operations-scientific-schema.js` fetches only after disclosure, enforces schema and safety flags, uses `textContent`, and erases results on MFA workspace lock.
- Strengthened existing `goldenTalentMyVerifiedSubjects` and `goldenTalentGuardianBaharOverview` with mandatory transactions plus `SELECT ... FOR UPDATE` subject/consent row locks; changes remain **unpublished development code**. The two-connection MySQL and MariaDB fixture demonstrates that a concurrent update of an existing consent grant waits and a later request denies after withdrawal. Insert-based revocation still requires all future writers to observe the common subject lock.
- The new client/UI and server authorisation are **not evidence of legal age/guardian verification, live SQL schema activation, consent-writer completion, authenticated learner assessment/report delivery, or psychometric validation**. `eco_subjects.age_band` remains insufficient proof; the full scientific and customer dashboard rollout is blocked.
- [Six-job no-deploy CI run 38824400274](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38824400274) passed in full. It includes **45/45 Chromium browser tests** across existing admin-dashboard workflows and the new bilingual scientific-schema panel, SQL fixtures on MySQL 8 and MariaDB 10.11, PHP admin security/MFA checks, pure scientific privacy-policy tests and sanitized Bertina release-package checks.
- Source and acceptance dossier: `docs/scientific-validation/P0-ADMIN-SCHEMA-READINESS-AND-CONSENT-CONCURRENCY-ACCEPTANCE-2026-10-16.md`. Do not conflate **database schema inventory** with the independent requested **SEO/Schema.org structured-data editor**; the latter is a separate development stream.

**Go/no-go:** CODE+FIXTURE pass for the bounded hardened guardian read and the MFA-only schema-inspection interface; **NO-GO** for publishing, DB migration, private assessment write service, scientifically validated interpretation, or final Super Master Plan freeze.

## Internal-Only Transactional Consent Withdrawal — 2026-10-16

**Implementation (NOT live):** `api/golden-talent-consent-write.php` introduces a guarded internal-only `goldenTalentInternalWithdrawConsent` function with a single subject-first InnoDB transaction, complete bounded scoped consent history, duplicate command-ID detection, historical grant retention, strict UTC time ordering and an audit event committed atomically with the withdrawal. The service **is not wired to any HTTP/API route**, and does not grant/regrant consent. Its account ID parameter must be obtained from a verified server session by a future caller. A previous grant issued by an actor can be withdrawn after guardian link expiry, but a disabled/unverified actor is still denied pending a reviewed privacy-request mechanism.

**CI verified:** [run 38825343607](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38825343607) completed with **six successful nondeploying jobs** including **26 consent-withdrawal/idempotency/audit tests on each of MySQL 8 and MariaDB 10.11**, **7 two-connection writer-vs-reader concurrency tests on each engine**, PHP/JS policy and guarded archive/route packaging, admin MFA and bilingual Chromium regression. These are isolated synthetic fixtures, not real production schema, user consent or scientific evidence.

**Acceptance dossier:** `docs/scientific-validation/P0-TRANSACTIONAL-CONSENT-WITHDRAWAL-ACCEPTANCE-2026-10-16.md`. Mandatory public-write blockers remain independently verified age/guardianship/child assent, clear revocation UX, session/CSRF/rate limits, all writers' lock-order policy, real Bertina schema proof, data-retention and safeguarding review, and owner-approved staging rollout. Existing science statuses remain PREVALIDATION.

## Withdrawal Safety Gate — Default Off and Durable Revocation

**Development-only security change**: `api/golden-talent-consent-write.php` is still not wired to an HTTP route and now requires explicit PHP server constant `GT_INTERNAL_CONSENT_WRITE_ENABLED === true`; absent that, it rejects all calls before acquiring database locks. Production bootstrap and current Golden Talent routes do not activate it. This is a deliberate nondeployment safeguard.

**Consent-notice resilience**: a recorded grant can be withdrawn durably even when its notice is currently retired or not yet effective, preventing unexpected grant resurrection if the notice lifecycle changes afterward. The same transaction writes the consent revocation and an actor-scoped audit event and respects canonical subject-first locks.

**Latest bounded evidence**: [Scientific QA run 38825833509](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38825833509) concluded with six successful nondeploying jobs including 30 withdrawal and 7 two-session consent-lock checks **per SQL engine** (MySQL 8 and MariaDB 10.11), plus existing admin/bilingual browser, PHP/Node and release-package regression tests. This does not prove legal/ethical sufficiency, live installed database state, account recovery/privacy rights for disabled users, or psychometric validity.

**Still NO-GO** for a public withdrawal/grant route, live private assessment, release of reports, migration, deployment and final master-plan freeze. See `docs/scientific-validation/P0-TRANSACTIONAL-CONSENT-WITHDRAWAL-ACCEPTANCE-2026-10-16.md`.
