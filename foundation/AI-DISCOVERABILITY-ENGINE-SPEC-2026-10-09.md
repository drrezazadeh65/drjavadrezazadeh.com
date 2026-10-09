# AI Discoverability Engine — implementation specification (2026-10-09)

Status: SPECIFIED; NOT DEPLOYED. Scope: public bilingual academic website. This engine concerns external discovery by search engines and AI answer systems, not an onsite chatbot.

## Objective and measurement
Improve eligibility for crawling, accurate extraction, attribution and qualified visits from Google Search, Bing, and AI-assisted discovery. No platform can guarantee inclusion or citation. Separate leading indicators (crawl access, index coverage, valid structured data, canonical/hreflang consistency) from outcomes (organic impressions, qualified referral sessions, enquiries, paid conversions).

## Non-negotiable release gates
1. Preserve stable public paths, canonical URLs and existing /fa/ and /en/ architecture; enforce reciprocal hreflang and x-default only when a real fallback exists.
2. Confirm every indexable page returns HTTP 200, self-consistent canonical, indexable robots directives, and appears in the correct sitemap; prevent draft, account, checkout and private data indexing.
3. Publish only factual, independently reviewable Person/Organization, Article/ScholarlyArticle, BreadcrumbList, Service/Product/Offer structured data where appropriate; align JSON-LD to visible page content. Never invent ratings, credentials, citations, prices or affiliations.
4. Provide author identity, date published/modified, provenance, evidence and editorial review for academic content; distinguish peer-reviewed research from commentary and service marketing.
5. Ensure important content is server-rendered/static HTML and accessible without JS, login, or anti-bot challenges for permitted public crawlers. Respect crawler-specific published policies and site owner consent; do not bypass restrictions.
6. Support Google Search Console and Bing Webmaster Tools verification, sitemap submission, and IndexNow only for legitimate newly changed canonical URLs when configured. Do not treat submission as guaranteed indexing.
7. Keep customer contact and registration email-only; never expose personal order or assessment information in crawled HTML, logs or structured data.

## Engine pipeline
INVENTORY -> TECHNICAL PREFLIGHT -> SEMANTIC/ENTITY VALIDATION -> BILINGUAL CONSISTENCY -> EVIDENCE REVIEW -> HUMAN APPROVAL -> RELEASE -> MONITORING -> REMEDIATION.

Each issue record: stable issue ID, canonical URL, locale, category, severity, evidence, owner, remediation, review status, validation timestamp. Each release records commit SHA, sitemap delta, crawl checks, structured-data checks and rollback route.

## Priority work packages
P0: crawlability/indexability audit; robots and sitemap parity; canonical and hreflang tests; route stability; production origin consistency.
P1: identity/entity graph; author and organization schema; service pages for all 27 offerings with verified bilingual descriptions, deliverables, imagery, real prices and clear email-based purchase route.
P1: scholarly article metadata, references and author review; independent magazine editorial approval and noindex until publication.
P2: structured content extraction tests for headings, abstracts, FAQs where genuinely useful, and source attribution; AI referral attribution where analytics exposes it.
P2: dashboards comparing Search Console and Bing impressions/clicks with qualified leads and confirmed purchases; report unknown AI answer visibility as unknown, never as zero or success.

## Acceptance tests (not yet executed)
- Reject canonical mismatch, redirect chains, broken internal links and orphaned indexable URLs.
- Reject missing reciprocal hreflang and invalid locale targets.
- Reject JSON-LD claims absent from visible, verified content.
- Reject indexing of draft/private/checkout pages and personal email/order details.
- Reject publication without human editorial approval and supporting evidence.
- Report absent credentials/telemetry as NOT CONFIGURED, not PASS.

## Explicit limitations
This document is a development contract only; it does not establish that implementation, tests, indexing, external platform integrations, or live publication have occurred. Avoid creating speculative llms.txt promises: such files are optional discovery aids, not established prerequisites for AI citation or search ranking.
