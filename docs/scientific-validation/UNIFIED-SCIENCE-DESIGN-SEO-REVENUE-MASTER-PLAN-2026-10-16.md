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
