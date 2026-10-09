# Independent Website Administration — product and implementation contract
Status: approved product direction, NOT a deployed admin interface. Date: 2026-10-09.

## Objective
A self-service, Persian-first RTL and English-capable administration experience, independent of ChatGPT, GitHub UI, and programming knowledge. WordPress-class editorial capabilities plus purpose-built academic services, commerce, SEO and RAVE intelligence.

## Ownership and non-duplication
- Master SEO remains the only writer of canonical SEO rules, sitemap, redirects, hreflang and structured data. Admin edits SEO metadata through this existing owner, never a parallel engine.
- RAVE owns aggregate reporting and recommendations, not raw customer/payment data or SEO metadata.
- Payment backend owns payment/refund truth; admin only reads verified state and performs authorized business actions.
- Content and media must have one canonical source of truth, with revision history and controlled publication.

## Navigation
Overview; Content (articles, pages, bilingual pairs, scheduled drafts); Media library (alt text, licensing, derivatives); Services (27 stable IDs, offers and eligibility); Books/Store; Orders/Invoices/Refund status; Customers/Email support; SEO; RAVE Analytics; Staff/Roles; Audit & Settings.

## Minimum viable release P0
1. Authenticated private backend, email-only sign-in and email-based account recovery, strong session security, CSRF protection, MFA via authenticator/passkeys for administrators where supported; no phone OTP.
2. Roles: owner, editor, service manager, finance, analyst, support; least privilege and audited actions.
3. Content workflow: draft, review, preview, schedule, publish, unpublish, revisions and rollback. Maintain /fa/ and /en/ canonical paths and valid internal links.
4. Media: authenticated uploads, malware/type/size checks, accessible alt text, copyright metadata, optimized derivatives, cache invalidation and safe deletion reference checks.
5. Services: canonical catalogue IDs and bilingual descriptions, images, prices, deliverables and customer journey.
6. Commerce: private orders, server-verified payments, invoices and refunds, with currency and timestamps.
7. RAVE: source-labeled metrics with date range, freshness and no fabricated data; preserve Master SEO ownership.
8. Backup, restoration rehearsal, monitoring and audit trail before production.

## UX and accessibility
Responsive premium interface; RTL/LTR layout; keyboard navigation, WCAG 2.2 AA target, fast search, bulk actions, clear confirmations for destructive operations, accessible data tables, and understandable error states. Distinguish missing metrics from zero.

## Deployment boundaries
Public website remains on GitHub Pages until authorized migration. Never place credentials, customer records or admin APIs in static assets. Use approved private backend infrastructure only; Cloudflare Workers optional where already authorized, not Cloudflare DNS/Pages/D1 by default. No Vercel/Neon reintroduction.

## Release gates
Test authenticated authorization boundaries, upload safety, content rollback, bilingual routes, SEO regression, payment integrity, data privacy, backups and end-to-end publication. Production rollout is not complete until all pass.
