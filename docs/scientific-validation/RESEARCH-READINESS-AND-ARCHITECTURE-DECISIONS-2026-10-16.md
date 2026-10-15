# Research Readiness and Architecture Decisions — Working Note
Date: 2026-10-16
Status: RESEARCH / NOT FINAL / NOT AUTHORISATION TO DEPLOY
Scope: Golden Talent, RCAS, BAHAR, unified Bertina customer/admin experience.

## Verified repository findings
1. database/unified/README.md identifies existing Bertina PHP/MySQL/MariaDB as the canonical first-party transactional source. Its proposed eco_* schema is NOT applied to production. Historical platform/db/migrations/*.sql are PostgreSQL design artifacts and MUST NOT be run against Bertina. Existing customer and commerce identity/order IDs must be preserved.
2. database/unified/README.md records a Stage14 consent-schema blocker based on a previously observed /api/growth/health result (consentSchema=false). This is a historical observation, not a fresh live health check. Verify current schema before remediation.
3. platform/golden-talent-phase12-gates.mjs provides currentConsent() from persisted append-only decisions and resource-scoped authorization; it is a pure policy, not a wired PHP security boundary.
4. platform/free-first-stage-policy.mjs checks a caller-supplied assessmentConsent.is_current boolean. It is NOT sufficient to authorize production requests unless a trusted server derives this flag from the complete current consent decision history. This is a priority design/code issue.
5. platform/scientific-release-gate.mjs implements preliminary research/pilot/validated-for-specified-use release decisions, not empirical psychometric validation.
6. foundation/DESIGN-SYSTEM.md and the cinematic bilingual specification govern every new surface. No independent off-brand dashboard or infographic style is allowed.

## Decision register — must resolve before freezing a Super Master Plan
D01 — Canonical persistence: retain Bertina MySQL/MariaDB and existing account/order IDs; verify installed schema and migration inventory read-only before designing new writes. Decision: ACCEPTED architectural baseline; operational verification PENDING.
D02 — Consent source of truth: PHP must load persisted consent decision history, verify latest valid sequence, guardian authority and applicable purpose under transaction; never trust client is_current. Decision: REQUIRED; implementation PENDING.
D03 — Subject identity and guardian lifecycle: document stable subject ID, parent-child relationship changes, age-of-majority transition, custody changes and least-privilege projections. Decision: REQUIRED; schema contract PENDING.
D04 — Three free-first stages: Golden Talent ORIENTATION; RCAS CONTEXT_REFLECTION; BAHAR STARTER_PLAN. No payment/card; only meaningful formative output; later paid access requires verified entitlement. Decision: ACCEPTED product rule; end-to-end integration PENDING.
D05 — Scientific claims: instrument versions, locale, item bank, scoring rules, intended use, evidence status and human review must be immutable/reproducible; no invented norms, cutoffs or clinical predictions. Decision: REQUIRED; validation studies PENDING.
D06 — Unified longitudinal evidence portfolio: preserve provenance, missingness and source-specific interpretation; do not collapse unrelated constructs into a composite score. Decision: RESEARCH CANDIDATE; user research and schema design PENDING.
D07 — User/admin dashboard: contract-test scoped read models, drafts vs released reports, consent withdrawal, payment and review states; no role-only blanket admin access. Decision: REQUIRED; API mapping PENDING.
D08 — Design governance: read frozen design, mobile-first cinematic spec and brand governance before changes; verify fa RTL/en LTR and accessibility. Decision: REQUIRED; visual implementation PENDING.
D09 — Content/SEO/media: module-specific bilingual overview, guides, privacy/methods, FAQs, truthful scientific disclosures, topic clusters and Canva/Figma templates; no indexing private child data. Decision: REQUIRED; assets and keyword verification PENDING.
D10 — Release safety: isolated branch, no live deployment without owner approval; migrations expand/backfill/contract with backup, rollback, security and end-to-end verification. Decision: REQUIRED; certification PENDING.

## Recommended research and execution sequence
R1: Read-only inventory of actual Bertina APIs, tables, dashboard routes and Stage14 consent status; compare with architectural documents and record discrepancies.
R2: Model canonical subject/guardian/consent/administration/report/entitlement contract with versioned DTOs and test fixtures.
R3: Repair free-first consent evaluation in a pure, tested server policy adapter using currentConsent(); retain paid gate unchanged.
R4: Verify science and evidence dossier per construct, language and intended use; create explicit validation-study protocol rather than invented metrics.
R5: Create reusable bilingual dashboard/report/guide/infographic design specifications from existing Figma/Canva assets and repository design tokens.
R6: Build customer/admin API integration and end-to-end tests in isolated environment; separately validate search content and free-to-paid funnel.
R7: Freeze Super Master Plan only after architectural contradictions are resolved and each item has owner, dependency, acceptance test, evidence status and rollback path.

## Readiness assessment
Research direction: coherent. Final Super Master Plan: NOT READY TO FREEZE. Implementation readiness: BLOCKED by verified operational schema/API mapping, consent trust boundary, end-to-end test evidence and scientific dossier. This document is an explicit checkpoint; it is not proof of live database access, code execution, successful tests or scientific validation.
