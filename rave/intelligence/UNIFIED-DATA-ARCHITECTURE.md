# RAVE Unified Intelligence Hub — Architecture Decision Record 001

Status: proposed implementation baseline, not a production claim.
Date: 2026-10-09

## Purpose
One management analytics and decision-support layer for SEO, AI discovery, content, services, consented audience analytics, marketing, verified commerce, technical operations and governance. No duplicate business databases.

## Domains and ownership
- Search: Google Search Console, Bing Webmaster, sitemap and crawl audits. Read-only source adapters.
- AI visibility: sampled prompt and citation observations with model, timestamp, method and uncertainty.
- Content: article/book/page inventory, language, canonical URL, impressions, engagement and referral.
- Services: canonical service IDs, catalog version, service demand and qualified leads. Reconcile the published 21-service metadata against the owner's 27-service plan before adopting a count.
- Commerce: orders, verified payments, refunds and reconciled net revenue. Payment provider/backend remains the sole authority; RAVE receives limited derived facts, not payment credentials.
- Audience: consented, aggregate visit and funnel events; no fingerprinting or silent visitor identification.
- Marketing: campaign, channel, approved publication, cost and attributed outcomes.
- Operations: availability, broken links, accessibility, performance and release health.
- Governance: provenance, access controls, retention, consent and audit trails.

## Data layers
1. Source systems: operational databases and authorized external APIs retain ownership.
2. Ingestion: versioned adapters, source timestamps, idempotency keys, validation and quarantine for malformed data.
3. Private analytical store: normalized facts and dimensions with appropriate access restrictions and encryption.
4. Semantic metrics: explicit metric definitions, denominators, currencies, timezones, attribution windows and data-quality labels.
5. Intelligence: opportunity scoring, alerts, experiments and evidence-based recommendations.
6. Management API and dashboard: authenticated, role-scoped, multilingual, responsive, accessible; no privileged data in GitHub Pages or public artifacts.

## Canonical dimensions
date, locale, channel, campaign, content_id, service_id, product_id, source_system, metric_version.
Use stable IDs; canonical URLs are not database keys. Keep separate gross, refunded and net revenue.

## Mandatory metric definitions
organic_clicks: verified search-provider clicks.
qualified_leads: explicitly defined eligible lead events, not all CTA clicks.
checkout_starts: validated checkout start events.
verified_orders: unique reconciled order IDs from trusted backend.
gross_revenue_minor: sum of confirmed settled amounts in original currency.
refunds_minor: sum of confirmed refunds in original currency.
net_revenue_minor: gross minus refunds; no mixing currencies without explicit exchange rate source and date.
ai_citation_rate: observed cited answers divided by valid sampled answers, with sampling method.
conversion_rate: numerator/denominator explicitly named; event counts are not unique users.

## Privacy and security
No raw customer PII, API secrets, financial transaction payloads or private reports in public GitHub. Server-side access controls, audit logs, encryption, retention and deletion workflows are required. Suppress small groups in exports. Browser non-essential analytics require valid consent. Minors require heightened safeguards.

## Platform independence
Portable Node.js domain logic and explicit adapter interfaces; GitHub Pages is replaceable. Existing Cloudflare Worker may be an adapter for operational commerce only; RAVE must not depend on it. Do not reintroduce retired providers.

## Release gates
A. Verify source-of-truth inventories and current production endpoints.
B. Implement private authenticated ingestion and durable store.
C. Validate event consent, data quality, financial reconciliation and permissions.
D. Build read-only dashboard with source freshness and error states.
E. Add automated opportunities and permitted low-risk actions after reliable measurement.

## Known current limitations
This document specifies the architecture. It does not imply that connectors, private storage, dashboards or live revenue tracking have been deployed.
