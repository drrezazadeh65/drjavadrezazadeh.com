# Unified Scientific, Product, Design, Search and Revenue Master Plan
Date: 2026-10-16
Status: Research-informed implementation baseline; empirical validation and market verification remain outstanding.
Scope: Golden Talent, RCAS, BAHAR, D1-D6, consent, reporting, dashboards, bilingual discovery, conversion and revenue.
Release: development branch only; production publication requires explicit owner approval.

## 1. Evidence hierarchy and scientific integrity
Authoritative standards: AERA/APA/NCME Standards for Educational and Psychological Testing (2014, currently available edition); International Test Commission Guidelines for Translating and Adapting Tests (2nd ed., 2017); relevant ITC technology-based testing, security and test-use guidelines. COSMIN's relevance/comprehensiveness/comprehensibility framework may inform content-validity methods, but COSMIN is primarily designed for health measurement and is not automatically a standard for educational talent instruments.
Sources: https://ncme.org/resources/books/testing-standards/ ; https://www.intestcom.org/page/14 ; https://www.cosmin.nl/
Develop a construct-by-construct evidence matrix: definition, intended use, target ages/languages, item-to-construct map, response process/cognitive interviews, expert review, pilot, internal structure, measurement precision, external relationships, fairness/DIF, cultural and language equivalence, interpretation limitations, peer review. No invented reliability coefficients, normative percentiles or cutoffs.
Maintain RESEARCH/PILOT/VALIDATED_FOR_SPECIFIED_USE/RETIRED states with independent scientific sign-off. Separate descriptive guidance from clinical/occupational diagnosis.

## 2. Existing architecture — preserve and verify
Inspected existing modules: platform/golden-talent-phase12-gates.mjs (server-side policy primitives); platform/rcas-evidence-bridge.mjs (contextual descriptive evidence and missingness protection); platform/bahar-engine.mjs (PREVALIDATION longitudinal formative scaffolding). Trace PHP API, MySQL migrations, role and consent decisions, user dashboard projections, Persian/English views, and test coverage before changing any behavior.
Ensure instrument version + scoring algorithm + item bank checksum + locale + consent policy persist on each administration. For any changes add immutable history, migration, rollback and golden-fixture tests.
Never change live deployment in this workstream.

## 3. Dashboard and user journey
Public educational page -> clear research/pilot status -> age-appropriate consent and guardian verification -> contextual evidence intake -> server-authorized review -> bilingual accessible released report -> optional paid expert interpretation -> consent-based follow-up and BAHAR plan. Show evidence gaps and limits. Keep private records non-indexable. Test cross-account and cross-child isolation.

## 4. Mandatory master-design check before EACH change
Read latest applicable repository files:
- docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md
- foundation/DESIGN-SYSTEM.md
- foundation/MASTER-ECOSYSTEM-ROADMAP.md
- docs/superpowers/specs/2026-10-13-cinematic-bilingual-mobile-first-experience-design.md
- identity/brand-governance.md
- identity/OFFICIAL_DOCUMENTS_REGISTRY.md
- assets/css/jr-ecosystem-design-v2.css
Reuse semantic tokens, restrained academic premium identity, mobile-first accessible interaction, RTL/LTR, and shared report/receipt/document templates. Record evidence of consultation and visual regression tests in each change.

## 5. Search-intent and revenue architecture
Primary Persian research clusters (NOT validated volumes): استعدادیابی کودکان، تست استعدادیابی کودکان، آزمون استعدادیابی، کشف استعداد نوجوانان، مشاوره استعدادیابی، انتخاب رشته بر اساس استعداد، استعداد تحصیلی، برنامه رشد فردی دانش آموز، ارزیابی استعداد کودک، استعداد و علاقه شغلی. English discovery clusters (require intent match): talent identification in education, child strengths assessment, student strengths assessment, evidence-based talent development, career aptitude test, career guidance assessment, longitudinal learning portfolio, formative assessment for students.
Initial Ubersuggest global monthly estimates, not country-specific: 'career aptitude test' 33,100; 'استعدادیابی کودکان' 40; 'آزمون استعدادیابی' 10. English keyword CPC estimate $1.665. Do not infer Iran-specific demand or sales from these.
Next research: Iran/target-country locale-specific volume, competitor SERP analysis, ranking baseline in GSC, conversion intent and difficulty; do not create keyword-cannibalizing pages or alter canonical URLs without redirects and regression checks.
Map one intent to one canonical page, with supporting educational articles, glossary, FAQ, case methodology and clearly disclosed research status. Add author/reviewer, citations, revision dates, bilingual hreflang/canonical, schema only where semantically accurate, indexable public pages and noindex private reports. Follow Google's people-first content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## 6. Ethical monetization
Free: science-grounded educational guides, methodology and limited non-diagnostic self-reflection. Paid: human-reviewed interpretive consultation, structured parent/student guidance, documented longitudinal coaching, institution services and workshops. Price and promise must correspond to real deliverables, credentials and evidence; no paid unlock of fabricated normative scores or fear-based claims. Preserve existing shop, checkout, account and payment gates. Track consented funnel: organic impressions -> qualified landing visits -> assessment starts -> completed consents -> booked/paid sessions -> fulfilled service -> retention, with cohort and refund metrics. Avoid exposing minors' data to analytics.

## 7. Implementation work packages
A: Evidence register + construct map + scientific review ledger.
B: Immutable instrument/version/scoring/missingness contracts and tests.
C: Consent, guardian, purpose-scoped access, withdrawal, deletion and security QA.
D: Bilingual accessible reports and role-specific dashboard projections.
E: Search-intent content map and existing URL preservation; schema, metadata and internal linking.
F: Conversion and fulfillment flow using existing store and bookings.
G: CI regression, security, scientific signoff, controlled release dossier.
Dependencies: A precedes interpretive claims; B/C precede D; D precedes monetized interpretation; E may proceed only with truthful status language. Every package must pass master-design review.

## 8. Verification and blockers
Academic literature discovery via SciSpace and official standards initiated; Consensus connector monthly quota exhausted. Ubersuggest global keyword figures collected; further country-level research and competitor baselines not yet verified. No empirical psychometric dataset was supplied; therefore no claim of instrument validation. Full code/API/dashboard tests and production integration are not yet run. Do not call this plan a finished implementation.

## 9. Owner-approved free-first acquisition rule (2026-10-16)
The FIRST meaningful stage of EACH of Golden Talent, RCAS and BAHAR must be free of charge for every eligible user, subject to age-appropriate informed consent and ordinary safety/access controls. Do not require a card, paid subscription or paid entitlement to start or complete this stage. Free is not a clinical or psychometric validity claim.
- Golden Talent: free educational orientation, preliminary strengths reflection and explicitly non-diagnostic descriptive feedback, when scientifically appropriate.
- RCAS: free initial contextual opportunity/resource exploration and bounded descriptive summary; do not convert access barriers into trait deficits.
- BAHAR: free initial goal setting, starter activities and first formative progress record, without automated diagnostic scoring.
Clearly label what is free, what is optional and paid, and the actual deliverables and price before checkout. Paid continuation may cover expert-reviewed interpretation, deeper guidance, longitudinal coaching and institutional services, but must not hold a user's existing free-stage data hostage. Provide consent-based dashboard continuity and optional conversion; avoid manipulative scarcity, coercion and misleading 'scientifically proven' claims. Protect minors' data from marketing analytics. Before implementation check foundation/DESIGN-SYSTEM.md and the master execution directive; verify the existing payment gate does not inadvertently block the free stages. Acceptance tests: three unauthenticated landing pages show 'free first stage' accurately; eligible authenticated users can complete each stage without a paid entitlement; later paid steps still require verified payment; no payment details collected for free access; mobile RTL/LTR and dashboard continuity pass. This is an implementation requirement, not a claim that the live website already provides the flow.

## 10. Non-negotiable database, customer-dashboard and admin-dashboard integration (owner directive, 2026-10-16)
All three modules and their free/paid stages MUST use the existing Bertina PHP/MySQL/MariaDB canonical transactional database, identity, order and entitlement records. Consult database/unified/README.md (architectural master), foundation/RBAC-PERMISSION-MATRIX.md, foundation/DESIGN-SYSTEM.md and the master directive before every implementation. The older PostgreSQL-oriented Golden Talent blueprint is historical and must not override the current Bertina unified-database decision. Do not create parallel account stores, fake dashboard state or duplicate payment authorities.
Integration contract: persisted account/subject and verified guardian relationship -> immutable instrument version and consent ledger -> free/paid stage and server-side entitlement decision -> responses/evidence provenance -> review workflow -> released role-specific report -> user dashboard and administrative queue -> audit/monitoring. Preserve consistent subject IDs, record ownership, module IDs, stage IDs, report IDs, order IDs and version metadata. Each dashboard read must recheck current consent and record-scoped permissions server-side. A withdrawn consent immediately prevents unauthorized downstream reads; preserve auditable retention/deletion semantics.
Customer dashboard: unified progress across Golden Talent/RCAS/BAHAR, free-stage completion, paid entitlement and order state, draft vs released report distinction, understandable evidence limitations, consent and privacy controls, optional booking and BAHAR longitudinal history. No unreleased or cross-child reports.
Admin dashboard: permission-scoped case queue, scientific version/status management, reviewer assignment, release/withdrawal events, consent issues, payment reconciliation, integration failures and privacy-safe audit trail. Admin role alone must not confer unrestricted student-record access.
Acceptance gates: transactional persistence and idempotency; free stages complete without payment while paid stages remain gated; account/guardian isolation; consent withdrawal; concurrent write/version conflicts; correct release visibility in both dashboards; Persian/English accessibility; data minimization; rollback-safe migrations; end-to-end tests with anonymized fixtures. A UI card is not evidence of successful database integration. Do not deploy until tested and owner-approved.

## 11. Design-first quality gate (owner reaffirmation, 2026-10-16)
Visual design is a first-order acceptance criterion alongside scientific integrity and working database/API integration, not an end-stage decoration. Before every assessment, onboarding, free-stage, payment, customer dashboard, admin dashboard, report or document change, re-read foundation/DESIGN-SYSTEM.md; docs/superpowers/specs/2026-10-13-cinematic-bilingual-mobile-first-experience-design.md; identity/brand-governance.md; assets/css/jr-ecosystem-design-v2.css; and the current design-governance/master directive. Preserve frozen semantic token meanings, Persian-first identity, premium restrained academic hierarchy, mobile-first app-like patterns, paired fa RTL/en LTR layouts, accessible forms, focus states, reduced motion, readable report typography and shared components. No invented production logo, no substitute portrait, no generic off-brand dashboard. Required change evidence: referenced master-plan revision and consulted paths; reuse/new-component rationale; responsive RTL/LTR screenshots or equivalent visual review; 200% zoom, keyboard and WCAG 2.2 AA checks; comparison against prior pages for regression. A change cannot be called design-complete without verified visual QA. This is an implementation gate, not evidence that the new UI has already been built.

## 12. Future-proof architecture and evolution contract (owner directive, 2026-10-16)
Design for safe, incremental growth, not speculative rewrites. Mandatory source-of-truth references: foundation/MASTER-ECOSYSTEM-ROADMAP.md (frozen), foundation/DESIGN-SYSTEM.md (frozen), docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md, database/unified/README.md and the design specification. The canonical Bertina PHP/MySQL/MariaDB account/order database remains authoritative; never silently introduce a second identity or billing ledger.

**Bounded contexts and stable contracts.** Shared services: identity/guardian relationships, consent and withdrawal, authorization, instrument registry, audit, payment/entitlement, report release, notification, design tokens, localization. Domain services: Golden Talent, RCAS, BAHAR. Connect them using documented versioned DTO/API contracts (schema version, stable opaque IDs, idempotency key, subject/tenant scope, locale, timestamps, provenance and explicit null/missing states). Domain code must not directly mutate another module's tables; use a reviewed orchestration boundary. A future mobile client or external institutional integration must consume the same authorized API, never database credentials.

**Scientific reproducibility.** Each administration pins immutable instrument/item-bank, language adaptation, scoring-rule, consent-policy and report-template versions plus checksum; never retroactively rescore or relabel historic results without an explicitly recorded, consent-compliant migration and new derived artifact. Evidence maturity and intended-use scope are separate fields. Support retirement and replacement without breaking historic report interpretation. Human review remains a separate release state.

**Data lifecycle and privacy.** Model ownership, guardian changes, retention, export, correction, withdrawal, deletion/erasure eligibility, audit integrity, encryption and backup recovery. Minors' personal responses must not enter SEO, marketing analytics or third-party AI systems by default. Admin dashboards use least privilege and resource-scoped access. Use event/outbox or idempotent transactional jobs for cross-module side effects; avoid dual writes from the browser.

**Evolution strategy.** Additive, reversible MySQL migrations (expand -> backfill -> dual-read/compatibility where justified -> contract), documented backward compatibility and rollback points. Use feature flags and isolated development environments; no live schema migration without tested backup/restore. Add new languages, tests, subscriptions, professional review services and institution accounts through extension points, not new siloed apps. Performance budgets, pagination, indexes, observability and error budgets should be specified from measured traffic, not invented capacity assumptions.

**Design-system evolution.** Freeze semantic token meanings and brand governance; build a documented component library with variants for evidence cards, consent panels, free/paid stepper, report provenance, professional review, dashboard states and administrative queues. New components require rationale and visual regression evidence across fa RTL/en LTR, touch, keyboard, reduced motion and 200% zoom. Preserve stable URLs and the frozen bilingual SEO baseline.

**Future-ready acceptance tests.** Contract tests for every API consumer; schema/migration compatibility and rollback tests; multi-account/guardian isolation; consent withdrawal at read time; duplicate/retried payments and writes; instrument version and missingness invariants; accessibility and screenshot regressions; simulated failure/recovery of background jobs; and actual customer/admin end-to-end flows. Every release dossier distinguishes planned, implemented, tested, staging verified and production verified. No claim of deployment, scientific validation or scale readiness without evidence.
