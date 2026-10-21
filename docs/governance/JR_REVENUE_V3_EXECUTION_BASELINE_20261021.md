# JR Revenue Ecosystem v3 — Execution Baseline & Non-Destructive Closeout Ledger

**Audit date:** 2026-10-21  
**Canonical source branch:** `migration/bertina-linux6`  
**Source checkpoint:** `be7ceb844cd76d74effbd090b118a4150abb017d` (subsequent changes require an updated exact SHA)  
**Last independently observed successful Bertina deploy:** `0aef72ede4a5d9d9fa5ddd6fe9432f0977bf32c7` · [workflow 39565035023](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39565035023)  
**Release decision:** NO new deployment authorised by this audit. No payment, DDL, migration, email, refund, stock movement or live customer transaction was executed.

## Operating principle and source of truth

This ledger implements the owner-supplied **JR REVENUE ECOSYSTEM — SUPER MASTER DEVELOPMENT & COMMERCIAL MATURITY DIRECTIVE v3.0** without replacing the existing 41-gate masterplan, the 21-service catalogue, Bertina deployment workflow, existing MariaDB mother database or existing scientific modules. Use the existing `scripts/masterplan-evidence-reuse-audit.mjs` for source evidence; its new `commercialInventory` section covers **21 standard services + six VIP services + three print books + one digital bundle (31 commercial offers)**. The **27-service** acceptance matrix is the 21 + six VIP subset, not 31 services.

Statuses in source inventory are intentionally conservative: `SOURCE_ONLY` means files exist, **not** that checkout works. `BLOCKED_WITH_REASON` means a mandatory private/live gate remains open. Exact source SHA, observed live SHA, checked-at time, actual HTTP, payment evidence, receipt and fulfilment must be recorded independently before advancing a status.

### Verified source and deployment findings

1. Successful production deployment `0aef72e` and [Bertina post-release operational acceptance](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39565486707) are real **deployment and public route evidence**; they do not certify a new digital bundle purchase, actual settlement or private dashboard state.
2. A prior [v5.1 candidate](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39564687182) failed on a public author-dashboard navigation assertion. Source patch `93eeb7e` removes those public CTAs in both languages while preserving the protected `/fa/app/author/` route and its `noindex` / authorization controls. Hosted CI on that patch is a separate gate.
3. [Post-release PageSpeed/IndexNow observation](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39565486648) failed due to inconsistent successful SHA-proof tokens (`true` versus `1`). Source patch `081de1a` aligns the proof token and adds a regression test. **Do not** call this fixed in production until a new successful post-release observation.
4. `platform/payment-provider-policy.json` marks domestic BitPay selectable (`enabled:true`) based on **owner-reported** production payments, while `platform/payment-provider-registry.json` retains `ir_primary.enabled:false` and a stale production-runtime-pending adapter label. This is a **metadata contradiction**, not permission to flip a production switch. The existing audit reports it explicitly. Confirm the private Bertina API credential, runtime, callback, SKU eligibility, receipt and settlement before changing any effective enablement.
5. `assets/data/jr-publishing-prelaunch.json` records the **1,000,000 IRT / 700,000 author / 300,000 talent support** future-sale policy, but its source snapshot still says `quote.checkout_enabled:false`, `rights_confirmed:false` and all five compliance approvals `false`. The authoritative live `/api/publishing/offer` and private PDF custody must be checked before claiming real digital checkout. The author’s emailed general approval does not automatically certify third-party question-paper rights, both PDF hashes or a paid buyer delivery.
6. Owner-provided private phpMyAdmin export was reviewed previously in `JR_KONKUR_BERTINA_STRUCTURE_SNAPSHOT_REVIEW_20261021.md`: **270 CREATE TABLE statements**, including all eight `003e` official-admissions catalogue tables; no INSERTs into those eight catalogue tables appeared in that export. This supersedes the earlier 253-table preflight **for that historical export only**. Do not recreate `003e`, infer live row counts or import unverified codes. The proposed overlapping `003f` scorecard modules require reconciliation, not blind migration.
7. Six official Sanjesh 1405 guide texts have been scanned in `JR_KONKUR_1405_SOURCE_TEXT_AUDIT_20261020.md`, but row/page validation and amendments remain pending. No five-digit token is an accepted programme-location code without exact document/page review.
8. Golden Talent, RCAS, BAHAR, Choice Studio and the V3 educational-intelligence source contracts exist; the latter explicitly states **no live LLM**. Preserve research-stage claims, consent/guardian gates and human-reviewed decision boundaries.

## 24 required deliverables — current evidence status

| # | Directive deliverable | Current checkpoint / next acceptance evidence |
|---:|---|---|
| 1 | Complete Revenue Inventory | **SOURCE_ONLY** — existing `masterplan-evidence-reuse-audit.mjs` extended to 31 commercial offers; live verification pending |
| 2 | Live-vs-Source Gap Report | **SOURCE_ONLY** — known deployed `0aef72e`; verify current production SHA, all SKU health and private capabilities |
| 3 | 27-SKU Commercial Acceptance Matrix | **SOURCE_ONLY** — 21 standard + six VIP enumerated; each requires live price/booking/payment/fulfilment |
| 4 | Payment Provider Status Matrix | **BLOCKED_WITH_REASON** — BitPay registry/policy mismatch; private Bertina evidence required |
| 5 | Service Desk UX Audit | **SOURCE_ONLY** — existing service desk and browser QA; check real devices and navigation |
| 6 | Homepage-to-Service Navigation Map | **SOURCE_ONLY** — reuse `scripts/internal-link-graph-audit.mjs`; independently confirm <=3 clicks |
| 7 | Full Internal Linking Graph | **SOURCE_ONLY** — existing graph audit; regenerate against current public manifest |
| 8 | Orphan and Broken Link Report | **SOURCE_ONLY** — reuse link/SEO/historical-authority audits; live HTTP evidence needed |
| 9 | Bilingual SEO Audit | **SOURCE_ONLY** — latest SEO CI green; recheck exact live release |
| 10 | Structured Data Audit | **SOURCE_ONLY** — reuse schema/entity audit; no fabricated offers |
| 11 | Content Completeness Matrix | **SOURCE_ONLY** — 27 page pairs exist in source; independently audit scope, FAQ, price, CTA |
| 12 | Bookstore and Publishing Readiness | **BLOCKED_WITH_REASON** — private digital PDF, licence, purchase and delivery acceptance |
| 13 | Consultation and Booking Readiness | **SOURCE_ONLY** — atomic reservation fixtures exist; real calendar/capacity/confirmation pending |
| 14 | Golden Talent/RCAS/BAHAR Scientific Readiness | **SOURCE_ONLY** — existing scientific contracts; research/validation and real human-review evidence pending |
| 15 | JHELA Commercial Governance Report | **SOURCE_ONLY** — preserve editorial independence, no pay-to-accept or fake identifiers |
| 16 | Conversion Funnel Audit | **SOURCE_ONLY** — reuse `scripts/conversion-path-audit.mjs`; consented live analytics pending |
| 17 | Revenue & Capacity Scenario Report | **SOURCE_ONLY** — existing hypothetical studio; distinguish estimates from settled contribution |
| 18 | Security and Privacy Evidence | **SOURCE_ONLY** — CI fixtures; private authenticated IDOR/CSRF and cache verification pending |
| 19 | Mobile/Desktop/PWA Regression Evidence | **SOURCE_ONLY** — browser CI; confirm target devices and release fingerprint |
| 20 | Exact-SHA CI Results | **IN PROGRESS** — monitor source `be7ceb8` workflow runs; no green claim before completion |
| 21 | Release Evidence and Production Fingerprint | **LIVE_DISCOVERABLE (deployment only)** — `0aef72e` deployed; new source changes not deployed |
| 22 | Outstanding Blockers With Owners | **DOCUMENTED** — see priority table below; external credentials/rights require owner/operator |
| 23 | Prioritised Next Actions | **DOCUMENTED** — execute P0→P6 without rebuilding existing modules |
| 24 | Final Executive Commercial Maturity Dashboard | **BLOCKED_WITH_REASON** — do not call fully operational until settled-payment and delivery evidence |

These are **deliverable progress descriptions**, not a substitution for the directive’s 10 canonical product-status values. For machine-readable per-offer status, use the existing audit’s `commercialInventory.records`.

## P0 → P6 critical path

| Priority | Action | Existing system to reuse | Exit evidence |
|---|---|---|---|
| P0-A | Reconcile BitPay policy, server `/api/commerce/health` and every enabled SKU | Existing Stage09 callbacks, `commerce_payment_claims`, `commerce_orders`, registry/policy | Private runtime health + real bank-verified SKU receipt + idempotent retry |
| P0-B | Verify Mirkarimi digital fulfilment and historical 70/30 allocation | Existing publishing offer, private grants, `publishing_sale_allocation_entries`, author dashboard | Rights, two hash-matched PDFs, one authorised paid order, both downloads, author notice and reconciliation |
| P0-C | Verify book reservations and consultation capacity | Existing InnoDB stock movements, 24-hour holds and consultation preferences | No double-booking, duplicate callback or stock double-debit |
| P1 | Close real service discovery and mobile conversion gaps | Existing `/fa/services/`, `/en/services/`, 21+6 pages and search | Three-click reachability, real mobile CTA, accessible filters |
| P2 | Validate all 27 offers and four shop products | Existing catalogues and product pages | Scope, price, time, refund, secure checkout, fulfilment and dashboard per SKU |
| P3 | Close SEO/GEO/historical link defects | Existing SEO, hreflang, authority and link-graph scripts | Current live crawl with zero critical broken revenue links |
| P4 | Improve consented lead and repeat purchase | Existing CRM/analytics and opt-in infrastructure | Valid funnel metrics without sensitive assessment data |
| P5 | Scientific services, Choice Studio, JHELA and international eligibility | Existing research engines, mother DB, journal governance, USDT controls | Reviewed source data, rights, consent, human decisions and lawful provider verification |
| P6 | Contribution-aware revenue optimisation | Existing Revenue & Capacity Scenario Studio | Settled orders minus real refunds/fees/costs, capacity and attribution; assumptions separated |

## Explicitly prohibited shortcuts

- Do not re-run the owner's 79-step phpMyAdmin installation or introduce a parallel admissions database.
- Do not publish unreviewed Sanjesh codes, infer admission probabilities or merge mock and official score scales.
- Do not claim a digital purchase succeeded merely because a public offer endpoint responds.
- Do not enable international cards or USDT from UI-only state; verify wallet/network/amount/claim/legality.
- Do not turn on analytics without opt-in or place personal learner data in marketing events.
- Do not bypass owner review, backup evidence or controlled release to obtain a green workflow.
- Do not erase historical 60/40 paid-order snapshots when applying 70/30 to **future** orders.

## Next operator-only proof package

For actual live commercial acceptance, the authorised Bertina operator should supply **redacted results only** from existing read-only private checks: current exact deployed SHA; `/api/commerce/health` capabilities; `/api/publishing/offer` readiness; `jr-publishing-preflight-cli.php`; private PDF hash manifest; account/author role status; source-to-live SQL schema metadata; stock/capacity summaries; and one explicitly authorised controlled end-to-end purchase if no prior matching SKU purchase exists. Never share credentials, personal records, full SQL dumps, bank details, private PDF files or signed download URLs.

**Definition of done:** 27 services and four book products can be found, understood, bought/reserved, paid with server verification, fulfilled, receipted, displayed privately and reconciled; source and production match; scientific, security and SEO gates pass; owner approves controlled release. Until then, report each specific capability truthfully rather than claiming 100% completion.

---

## Owner scope resolution & continuing execution — 21 October 2026

This section supplements the original historical checkpoint above; it does **not** rewrite historical audits or the frozen owner-controlled release policy.

**Do not reopen these two workstreams without a new owner request:**

- **Domestic BitPay:** owner expressly reports the gateway finalised and operational. Do not refactor, reconfigure, re-test with real money, or overwrite the provider registry/policy on a speculative theory. Owner report is an operational direction, not independently collected transaction/settlement evidence in this source-only session.
- **Mirkarimi two-PDF delivery:** owner expressly reports both PDF delivery and its setup finalised. Do not rebuild private file custody, re-upload PDFs, alter their hashes, or rewrite the established financial snapshots. Protect existing working fulfilment. Source prelaunch flags recorded in the earlier audit are an older repository snapshot and are **not a mandate to reverse owner-confirmed live completion**.

**Forward-only source changes since the original baseline (not production deployments):**

- `c3223cb`: direct bilingual homepage paths to the canonical bookshops and 21+6 service directories.
- `b874267`: corrected old cinematic tests, Persian service-hub discovery, and the historical noindex shop handoff.
- `71d8918`: isolated PHP/MySQL admin credential-rotation test stability without weakening MFA or 403.
- `2e2afe1` / `f9b5fc9` / `b0323ea`: Persian 21-offer selected-checkout links, existing published consultation-calendar entry, honest availability copy, and refreshed regression assertions.
- `5422e4c`: six English VIP listings link to the existing selected Persian-language guarded checkout; no fabricated international cards.
- `e5a9a04`: protected source tests for distinct purchase and scholarly-description CTAs.
- `85aff106`: price sorting and client-only search for the existing crawlable 21-service English catalogue, with central-price consistency gate and fail-open unchanged links.
- `9e08b41`: existing masterplan source audit extended with a 27-offer / 54-page source-quality matrix and 24 deliverable evidence pointers. All source observations explicitly remain separate from live purchase evidence.

**Next release-critical work excluding the two owner-closed scopes:** confirm the latest complete exact-SHA nondeploying CI suite; record verified current live SHA independently; inspect existing owner-published consultation hours and customer/order follow-up without assuming a slot is reserved; run editorial 27-offer, SEO/link and mobile regression; reconcile human-reviewed scientific and JHELA readiness; then perform owner-review and the existing one-path Bertina release followed by the independent production smoke checks.

**Known acceptance boundary:** the existing read-only weekly consultation calendar displays owner-published requestable hours, **not** self-service booking confirmation (`customerReservationEnabled=false`). The current GitHub UI links and mock MySQL tests do not by themselves establish live booking, fulfilment SLAs, independent server backup/restore, or monthly settled contribution. Accordingly, **do not mark every service `FULLY_OPERATIONAL` merely because source tests pass**.

**No approval implied:** this section does not grant release authorization, change the mother database, alter payment or digital-delivery code, or publish to Bertina. The immutable source SHA and full CI/prod evidence must be updated at the controlled release decision.
