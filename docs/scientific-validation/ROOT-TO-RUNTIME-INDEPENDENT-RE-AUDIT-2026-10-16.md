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
