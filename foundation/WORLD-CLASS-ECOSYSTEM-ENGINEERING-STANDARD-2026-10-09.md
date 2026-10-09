# World-Class Ecosystem Engineering Standard — v1 (2026-10-09)

Status: target specification, NOT evidence of implementation.

## North star
An academically credible, bilingual, secure, accessible, measurable and economically sustainable education/research/commerce ecosystem. Avoid unverifiable 'world's best' claims.

## Non-negotiable quality gates
1. Academic integrity: verifiable author credentials, provenance, citations, independent editorial governance, no invented assessment norms or AI claims.
2. SEO/AI discovery: preserve canonical URLs, real hreflang pairs, schema validity, sitemap/indexation governance, AI-readable entity relationships and attribution measurement.
3. Security: server-authoritative RBAC/ABAC, MFA for privileged accounts, session protection, no public private-data storage, least privilege, audit and incident response; target OWASP ASVS L2.
4. Accessibility: WCAG 2.2 AA including keyboard, screen-reader and mobile testing.
5. Reliability: SLOs and error budgets established from measured traffic; monitored API errors, synthetic user journeys, alerting and documented restore tests.
6. Performance: production Core Web Vitals p75 LCP <=2.5s, INP <=200ms, CLS <=0.1 where measurable.
7. Commerce: verified server-side payment, idempotent order processing, reconciliation, refunds, invoices and entitlement enforcement; no false payment-success states.
8. Scientific systems: immutable instrument/scoring/report versions, multi-source evidence, human review and controlled de-identified exports.
9. Privacy: data minimization, consent, retention, access/deletion controls, email-only verification, paid-student Eitaa entitlement checks.
10. Engineering: single canonical domain owner for each business rule; explicit APIs, typed contracts where appropriate, unit/integration/e2e tests, staged rollout and rollback.
11. AI: grounded retrieval, prompt-injection defenses, evaluation sets, traceable source attribution, human approval for consequential actions, privacy-safe analytics.
12. International readiness: localized not mechanically mirrored FA/EN content, correct RTL/LTR, time zones, currencies and regional payment legality.

## Deduplication and integration strategy
- Audit imports/exports, tests, routes, migrations and runtime consumers before refactoring.
- Build a dependency and ownership matrix for every engine.
- Share contracts and adapters, not a monolith. Use one domain authority for payment state, role decisions, publication gates, communication preferences and assessment provenance.
- Preserve API compatibility until consumer migrations pass tests.
- Consolidate repeated UI components into accessible design-system primitives.
- Never delete historical records, immutable provenance, consent, audit or public indexed routes.
- Treat admin as a private control plane; keep public site SEO-oriented and portals role-limited.
- Do not reintroduce retired hosting/database providers without explicit owner approval.

## Acceptance criteria for each engine
Inventory -> deduplication proposal -> test baseline -> compatibility adapter -> refactor -> security/SEO regression -> staging smoke tests -> production deployment -> observed live verification.

## Scorecard
Report for every engine: source implemented? tests pass? UI connected? server authorized? data persisted? provider configured? production deployed? observed? and evidence links. Do not invent completion percentages.

## Initial priorities
P0: secure admin identity and API boundaries, live domain verification, payment reconciliation correctness.
P1: canonical engine registry and dependency graph; shared events/audit contracts; SEO/AI discovery measurement.
P2: unify assessment/report/provenance; shared UI design system; mobile and accessibility validation.
P3: international expansion and adaptive intelligence after trustworthy telemetry and scientific validation.
