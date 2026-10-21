# ONE-PASS RELEASE CANDIDATE — Indexation, Bilingual Services, Search Intelligence and Conversion
**Date:** 2026-10-21 · **Owner repository:** drrezazadeh65/drjavadrezazadeh.com · **Only branch:** migration/bertina-linux6
**Baseline before this candidate:** 04682b1c76fca378dbbba03f5d6c549a0817bdc0
**Policy:** Non-destructive, source-first, no duplicate systems, owner-controlled Bertina publication.

## 1. Verified live baseline, not a claim that everything works
The owner-run guarded deployment 39580421861 for baseline commit 04682b1c completed successfully on October 21. Post-release acceptance 39580969395, live SEO health 39582406635 and the relevant pre-release workflow runs reported success at that commit. Their conclusions are useful **scoped operational evidence**, not proof that every purchaser can complete payment, that all pages are indexed or that analytics/Clarity have live traffic.

Latest authoritative GitHub branch head and live release fingerprint MUST be refreshed immediately before an owner deployment. This document itself does not approve or trigger a deployment.

## 2. Existing infrastructure—REUSE, NEVER rebuild
- **Canonical mother:** Bertina PHP 8.3 / MySQL/MariaDB, existing customer_accounts and commerce_orders, existing APIs, customer/admin dashboards, consent and payment verification. No schema migration in this candidate.
- **Catalogues:** assets/data/service-catalog.json has 21 approved IRT/toman service IDs; assets/data/vip-catalog.json has six VIP IDs. 27 offers × 2 languages = 54 expected canonical service detail pages. Retain approved amounts, booking limitations, and the server as payment authority.
- **Discoverability:** existing six-part sitemap index, robots.txt, frozen route manifest, SEO/AI crawler gates, historical-authority registry, 301/410 policies, IndexNow differential workflow, llms.txt and structured scholarly identity.
- **Google:** existing .github/workflows/google-search-console-sync.yml authenticates through keyless GitHub OIDC/WIF to the exact https://drjavadrezazadeh.com/ URL-prefix property. Prior real API tests succeeded. Do not reintroduce retired GSC Wizard, service-account JSON keys or another sync workflow.
- **Analytics:** canonical platform/analytics-config.json and generated public projection have registered GA4 measurement G-C3C7NQQNWX, GA4 property 559754204, GTM container GTM-P6LWCLKM, and Clarity project z0mzp0dp74. As inspected October 21, GA4 and Clarity flags are both **disabled** pending tag configuration, separate consent, masked-session security checks and owner permission. A registered ID is not active collection.
- **Science:** Golden Talent, BAHAR, RCAS and Choice Studio are developmental/research-bound. No validated talent scores, predicted admissions, DOIs, ISSNs or unverified scientific claims may be introduced.
- **JHELA:** latest explicit 2026-10-18 native-owner override governs conflicting historical text in AGENTS.md; native intake remains fail-closed until independent TLS, private storage, malware scan, identity, schema, consent, roles and end-to-end checks. This candidate never changes its activation flag.

## 3. Source changes in this candidate
### 3.1 Bilingual service and VIP release guard
New scripts/bilingual-service-indexability-audit.mjs + tests/bilingual-service-indexability-audit.test.mjs checks:
1. Both current official catalogues and stable monetary unit; all 27 offer IDs and **54 actual FA/EN HTML** routes.
2. Local self canonical; correctly linked Persian/English language alternates; public sitemap membership, frozen baseline routes AND newer approved public service routes.
3. Language, RTL on Persian pages, absence of accidental noindex, viewport and H1.
4. Actual structured-data Service.url and Person provider identity, with a deliberate stable cross-lingual Service @id permitted.
5. Each published page's price against the approved central catalogue; **no automatic price change**.
6. Existing GTM/GA4/Clarity public vs private configuration parity; IndexNow/GSC workflow presence.

This is SOURCE/INDEXABILITY READINESS, not evidence that Google has crawled or indexed any route. Existing SEO, catalog, 301, checkout, schema and mobile browser tests remain authoritative for their other domains. The SEO GEO Regression workflow adds the new suite rather than replacing any existing checks.

### 3.2 Real bounded Google inspection, using EXISTING keyless connection
New scripts/gsc_indexation_triage.py + tests/test_gsc_indexation_triage.py. The **existing** GSC workflow gains an optional owner-invoked indexation_triage Boolean and bounded sample-size choice (24, 54 or 90). It:
- loads only indexable source URLs that appear in approved on-disk XML sitemaps, exist as public HTML and belong to the frozen baseline or the current official 21+6 service catalogues,
- inspects only canonical same-origin frozen indexable routes,
- uses the already authorised Google URL Inspection API with the exact GSC URL-prefix property,
- groups inspected URLs conservatively into indexed, crawled/not indexed, discovered/not indexed, noindex, canonicalised, redirect, fetch-error and unknown classes,
- writes only aggregated bucket counts to the workflow summary; no URL-level Google responses, OAuth tokens, search queries or personal payloads are saved,
- makes **no** sitemap submission, index request, Google Cloud IAM change, GTM Publish, Bing action or production modification.

**Important API boundary:** The official Google Search Console API does not expose the property-wide Page Indexing report or a full inventory of all excluded URLs. This optional inspection is a finite sample, not a 100%-coverage report. Retrieve full per-reason/indexing totals from the owner Search Console UI when accepting the release. Do not conflate 404/410 retired product URLs or private noindex pages with failures requiring reindexing.

## 4. Indexation evidence and true unknowns
Dated historical 2026-10-12 provider snapshot counted 117 indexed / 23 not indexed / 2 pending among 142 tracked URLs; this is NOT a current Google-wide count. 2026-10-20 direct OIDC success read one Search Analytics aggregate and URL Inspection/sitemap list; no full URL-index results were logged. On October 21 Ubersuggest estimated zero monthly search traffic / zero indexed keywords in its location-dependent coverage, DA 6, 134 backlinks and 36 referring domains. An English-US rank tracker reported positions for a few branded queries; this does not prove global zero impressions or index exclusion. Do not infer ranking performance from these heterogeneous sources.

Obtain on the final test day: Google Pages report by reason (indexed / discovered / crawled / alternate / duplicate / noindex / soft 404 / forbidden / server error), Sitemaps last fetched and success, Performance query-page-device-country metrics with settled dates, selected live URL Inspection for high-priority pages, and actual Bing Webmaster sitemap/index status. Keep timestamp, property, scope and direct-vs-estimate provenance in the owner's audit record.

## 5. One integrated acceptance cycle before publication
Perform the following as **one candidate-wide QA cycle at a single immutable SHA**, not multiple piecemeal releases:

| Gate | Evidence expected | Must pass before deployment |
|---|---|---|
| SOURCE | New 54-page bilingual audit, central pricing, XML, routes and privacy | Yes |
| SEO | Existing SEO GEO Regression, metadata, robots, hreflang, llms.txt, structured data, historical redirect and URL stability checks | Yes |
| MOBILE | Existing responsive/visual/Playwright tests at representative 360/390/430px, tablet and desktop; RTL/LTR, keyboard, 21 services + six VIP navigation and CTA behaviour | Yes |
| COMMERCE | Core accounts, guest/order status, verified amount, donation and two Mirkarimi private PDFs; no orphan receipts, duplicate payment or premature entitlement | Yes where affected or required by shared safeguards |
| SCIENCE | BAHAR/RCAS/Golden Talent, guardian consent, Choice Studio nonpredictive and privacy sentinel tests | Yes where shared boundaries apply |
| GOOGLE READS | Keyless GSC workflow and optional 90-route bounded inspection; independent Page Indexing dashboard evidence for property-wide counts | Inspection for diagnosis; do not fake provider data |
| ANALYTICS | Owner GTM Preview + GA4 DebugView, exactly one consensual page_view, no double injection/PII, separate masked Clarity consent; if not independently passed, KEEP BOTH DISABLED | Required **before enabling** any tag, not to ship inactive source guard |
| HOST | Verified previous production SHA, exact release SHA, HTTPS certificates, recoverable backup path, unchanged DB, guarded owner workflow | Yes |

### One-time final test commands (run in existing repository checkout)
- node --test tests/bilingual-service-indexability-audit.test.mjs
- node scripts/bilingual-service-indexability-audit.mjs
- python3 -m unittest discover -s tests -p test_gsc_indexation_triage.py -v
- node scripts/seo-regression.mjs
- node scripts/catalog-integrity.mjs
- node scripts/historical-authority-audit.mjs
- node scripts/analytics-contract-audit.mjs
- node scripts/build-public-data.mjs --check
- Consult existing green source/Playwright/QA workflows for this exact SHA. Do not mark skipped, cancelled, timed-out or older-SHA checks as passed.
- For optional bounded Google observation, manually run the **existing** "Google Search Console Connection Test" GitHub workflow on this exact branch, enabling "indexation_triage" and selecting "90". Do not create a second workflow.

Record baseline SHA, candidate SHA, job URL/status, changed files, audit output, tested routes and known limitations. Any source failure or genuine affected-system regression means NO GO. External provider absence is UNKNOWN, not fabricated zero. In an unrelated change, preserve prior independent unaffected-module evidence.

## 6. GA4/GTM/Clarity and Bing safety checklist (owner account access exists)
1. In GTM, review the **existing** GTM-P6LWCLKM, configure the one G-C3C7NQQNWX Google tag and explicitly consented page_view mapping, never install a second direct gtag snippet.
2. Confirm opt-in, opt-out, consent revocation, locale and query/fragment privacy blocking in Preview. Use GA4 DebugView and verify no automatic purchase, signup, contact or newsletter completion merely from clicking/return-page views.
3. For Clarity z0mzp0dp74, first test masked-all non-sensitive public paths, ensure **separate** explicit recording consent and disallow all account, checkout, consultation, minors, test/assessment, journals and URL query/fragment pages. Keep Clarity disabled until verified. User account ownership alone is not a privacy test.
4. In Bing Webmaster Tools, verify actual domain ownership, sitemap fetched/reported status, canonical URLs, robots, webmaster notices, and the already-existing IndexNow key and change-only workflow. Never re-submit every old URL on each deploy. IndexNow acceptance != Google/Bing indexing.
5. Reuse existing first-party owner operations dashboard and private reports; never store provider tokens or URL inspection payloads in public GitHub or analytics browser events.

## 7. Forward-only publication decision
- Protect BitPay and existing guest/registered commerce, Mirkarimi allocation and paid-delivery rights, Donation baseline, six VIP prices, 21 official service prices, stable book inventory, English/Persian published URLs and no-store private responses.
- No activation of paid/doctoral/journal/child-sensitive features merely from an account ID or a green build.
- No replacement of existing mobile shell, templates, rankings data, user-state databases, domain redirects, or single deployment workflow.
- Only after one final successful integrated acceptance should the owner invoke .github/workflows/deploy-bertina.yml for the exact reviewed SHA and applicable guarded release scope, with evidence of trusted TLS, recovery and payment/privacy conditions.
- **No deployment is part of this package preparation**. This repository-only diagnostics addition does not itself improve Google index coverage until the diagnostic findings lead to justified content or technical corrections. Do not deploy solely to claim indexation recovery.

## 8. Source-versus-production boundary
The GitHub repository is accessible for read/write auditing. This review runtime cannot independently perform a logged-in Google Page Indexing export, GTM Preview, Clarity sessions, Bing console read, Bertina database operation or public HTTPS fetch. Those must be collected through the owner-controlled workflows/accounts and recorded as real external evidence, not assumed. No fabricated Page Indexing counts, private credentials, test purchases or server mutations.

**Release status:** SOURCE PACKAGE PREPARED → ONE FINAL QA PENDING → OWNER-GUARDED PRODUCTION ONLY AFTER GO.
