# RAVE Release Gate — unified analytics without duplicate SEO (2026-10-09)

Status: implementation contract; NOT evidence of production activation.

## Single owner per domain
- Master SEO alone owns canonical URLs, robots, sitemap, hreflang, structured data, redirects and indexing policy.
- RAVE may read and audit SEO signals, but must never generate competing SEO metadata or alter canonical routes.
- Payment backend alone owns verified payment/refund events. Browser events are never financial proof.
- Identity backend alone owns customer profiles and email authentication; no phone verification.
- RAVE owns metric definitions, lineage, aggregate reporting, recommendations and admin read models.

## Minimum viable operational release
1. Reconcile the advertised 21 versus planned 27 services using immutable service IDs shared by bilingual pages, checkout and analytics.
2. Connect a consent-aware first-party event collector with schema validation, event deduplication, retention policy, bot filtering and no public secrets.
3. Ingest Search Console and Bing with source timestamps, date windows, language and canonical-page mapping; distinguish sampled AI visibility from measured referrals.
4. Ingest server-verified orders, captured payments and refunds through authenticated private adapters; compute net sales by currency and service.
5. Deploy a private, authenticated role-based executive dashboard; do not expose personal, payment or customer records in GitHub Pages.
6. Verify end-to-end reconciliation against source systems, test missing/late/duplicate events, test accessibility and RTL/LTR, and confirm no changes to Master SEO outputs.
7. Merge/deploy only after passing CI, security checks and rollback readiness; mark missing connectors explicitly as unavailable rather than zero.

## Acceptance criteria
- Every KPI identifies its source, freshness, date range, currency where applicable and aggregation unit (events, sessions, users, orders).
- No conversion rate divides incompatible units.
- No synthetic traffic, revenue or AI citations presented as real.
- No SEO duplicate writers, no URL changes, no Vercel/Neon dependencies.
- Source failures surface warnings without disrupting checkout or public pages.
- Every integration remains replaceable for future hosting migration.

## Priority
P0: verified purchase attribution, service IDs, organic discovery and safe dashboard.
P1: content-to-service funnels, campaigns and opportunity recommendations.
P2: predictive models, additional channels and automation.
