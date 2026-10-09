# Engine Consolidation — Architecture Decision and Execution Gate (2026-10-09)

Status: AUDIT-FIRST / NON-DESTRUCTIVE. This branch is not a production deployment.

## Architectural boundary
- Public bilingual /fa/ and /en/: indexable academic authority, services and content; preserve stable canonical URLs.
- Private admin: /fa/app/admin/ and /en/account/admin/; noindex, authenticated ADMIN/SUPER_ADMIN, mandatory MFA and server-side authorization.
- Private student/parent/teacher portals: separate capability scopes; never inherit admin privileges.
- Shared versioned API and domain services in platform/; never duplicate business rules in page JavaScript.
- Existing GitHub Pages public deployment and Cloudflare edge/payment infrastructure remain the baseline. Do not reinstate Vercel or Neon.

## Engine inventory (existing source modules, not evidence of live activation)
crm-engine.mjs; consultation-engine.mjs; consultation-record-engine.mjs; commerce-engine.mjs; communication-engine.mjs; assessment-engine.mjs; assessment-authoring-engine.mjs; report-engine.mjs; research-export-engine.mjs; golden-talent-engine.mjs; golden-talent-deep-module-engine.mjs; golden-talent-evidence-analytics.mjs; bahar-engine.mjs.

## Consolidation rules
1. Inventory imports, exports, tests, DB tables, API consumers, UI callers and production dependencies for each module before editing.
2. Deduplicate by capability and invariant, not by similar filename. Prefer a single owner for identity/roles, pricing/orders, communications, assessment provenance, report approval and SEO publication gates.
3. Preserve public routes, hreflang, canonical, sitemaps, structured data, media rights and academic identity.
4. Preserve historical research and assessment provenance, audit logs, consent, entitlements and immutable payment records. No destructive data migrations.
5. Implement adapters for old callers before retiring duplicated functions; maintain compatibility tests and rollback paths.
6. Require email-only verification, MFA for administrators, and Eitaa access only for entitled paying students. Phone may be collected for fulfilment, never used for verification.
7. Do not activate payments, credentials, personal-data access or automated scientific claims without end-to-end verified production gates.
8. Never mark a UI placeholder or policy document as a live integration.

## Execution gates
A. Baseline: inventory all routes, modules, API endpoints, database migrations and CI tests.
B. Dependency graph: identify duplicate domain rules and their canonical owner.
C. Refactor one domain at a time on review branches with adapter-based migration.
D. Run unit/integration/SEO/security/role tests; compare with baseline.
E. Deploy only after verified rollback, secrets/configuration and provider-specific gates.
F. Report each engine separately as IMPLEMENTED, TESTED, DEPLOYED or VERIFIED.

## Initial observation
The admin console policy declares FOUNDATION_READY. Existing UI includes disabled server-only controls and production activation gates. No claim of operational completion is warranted without runtime tests.

## First refactor targets
- Shared event and audit contracts across CRM, consultations, commerce and communications.
- Shared version/provenance and human-review contracts across assessments, Golden Talent and reports.
- Shared SEO/publication validation between admin content workflows and public pages.
- Central engine registry with health, dependencies and permissions, generated from source rather than hard-coded marketing counts.

No engine has been removed in this phase.