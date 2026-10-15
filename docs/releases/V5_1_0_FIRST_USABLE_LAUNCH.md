# DrJavad Ecosystem v5.1.0 — First Usable Release Acceptance

**Target:** `v5.1.0` — **NOT RELEASED until exact live Bertina evidence exists**. This milestone is an operational, bounded *first usable* launch, not a declaration that every academic, psychometric, journal, social, or financial engine is finished.

**Canonical development:** `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`. **Production:** Bertina, `https://drjavadrezazadeh.com`. Never deploy from another source, retarget canonical URLs, reset orders, or mark unfinished features complete.

## Acceptance contract — verified source is not verified production

| User journey | Intended minimum usable experience | Required evidence before celebrating |
| --- | --- | --- |
| Public bilingual website | Existing Persian/English pages and working canonical navigation | Live HTML, sitemap, correct security/private cache policy, no unexpected 404, mobile cross-browser checks |
| RCAS Start free | 3-step browser-only, explanatory non-diagnostic report; no raw answers sent to server | Real browser acceptance; no invented scientific norms or forced upsells |
| Consultation discovery | Owner chooses 1–4 genuine consulting hours per Tehran day, with seven-day published calendar | Additive MariaDB capacity table verified; MFA owner opens genuine windows; public API reports actual hours |
| Time requests | Green requestable, red booked, unpublished hours neutral; dashboard and intake share same source | Real calendar API, actual bookings, duplicate/overlap tests; request remains unconfirmed until server records an appointment |
| Customer account | Verified email sign-in, private history, consented enquiries, paid-service appointment state and preferences | Authenticated owner-scoped live read and write acceptance, 401 for guests, no private cache or leaked identifiers |
| Catalog and commerce | Three books, 21 service SKUs, six VIP plans, truthful payment/readiness messaging | Prices/stock preserved, verified callback and provider evidence; do not assert bank settlement without independent evidence |
| Service delivery | Paid, provider-verified order followed through scheduling, booking, delivery evidence and customer visibility | End-to-end one real customer-case acceptance; no direct booking without an eligible order and explicit owner capacity |
| Support and safety | Guardian restrictions, consent, private reports, error feedback and safe unavailability | Consent boundaries verified; missing infrastructure returns unavailable rather than invented records |
| Owner operations | MFA administration, published hour controls, audit and health visibility | Actual Bertina owner MFA session, controlled insert/close with audit, prevention of closing booked capacity |

## Exact release decision

1. Source CI must pass: `DrJavad v5.0.0 Nondeploying Release Candidate` (legacy workflow name), customer dashboard audit, responsive/browser QA, Stage09 MariaDB compatibility, SEO/GEO and provider-guard checks for the **same Git SHA**. A green workflow alone does not establish server readiness.
2. Compare that SHA with **live Bertina**; if GitHub automatic preflight blocks because of historically protected SQL/governance changes, use the owner-authorized GitHub Actions **manual hosting_managed release** with the exact approved SHA and observed live SHA. Do not delete/disable access or security guards.
3. Observe successful post-upload checksum/Service Worker fingerprint verification and public/mobile navigation.
4. Independently verify the live `/api/commerce/consultation-week`: if the additive table is not deployed, the API must respond **503** and no green hours may be shown. Schedule the reviewed additive SQL separately after owner approval. No fabricated availability to simulate conversion.
5. In a verified owner admin session, publish only genuinely available Tehran hours, capped at **four per day**; confirm that public and customer dashboards read the same windows. Confirm a booked hour turns red only after actual owner-confirmed booking.
6. Verify the customer journey with an authorized test account: account ownership, selected phone/video format, order and consultation-state access; inspect failure handling and no marketing consent leakage. Avoid using real money solely to pass a test.
7. Record exact **Git SHA, live SHA, GitHub deployment run, dates, URL evidence, actual schema/owner/account acceptance status**, and any failures in a post-release acceptance record.

## What v5.1.0 must not imply

- **Not** verified Golden Talent/RCAS/BAHAR psychometric standardization, real student files, or automatically granted paid digital entitlements.
- **Not** proof of bank settlement, real-world inventory reconciliations, e-mail provider delivery or every one of the 21 services fulfilled.
- **Not** live OJS editorial intake, ISSN/DOI/ISI/Scopus indexing or social posting authorization.
- **Not** an unattended agent that keeps editing or deploying after this chat.

**Promotion:** The words **RELEASED / جشن راه‌اندازی نسخهٔ ۵.۱.۰** require recorded source–production equivalence and successful minimum operational journey, not a source commit, snapshot UI, placeholder numbers or a green staging CI.

---

## 2026-10-15 real-operations gate after in-press content integration

**Scope:** current canonical Bertina PHP/MariaDB v5.1.0 path. Source facts below were read directly from committed configuration and functional implementations. They are **not** an authenticated Bertina test, a real SMTP delivery, a checkout receipt or live SQL schema introspection. Do not confuse the portability-oriented future `platform/deployment-topology.json` blueprint (PostgreSQL/separate app) with the existing production-facing `api/index.php` (Bertina PHP + MySQL). No new database or second checkout is approved.

| Capability | Source-only evidence and guarded behavior | Remaining private/host acceptance before customer-facing claim |
| --- | --- | --- |
| Verified account and email | `api/index.php` contains SMTP configuration guards and account routes; `api/config.example.php` has `mail_enabled=false`, `smtp_enabled=false` by default. Historical email-owner test results are not fresh production acceptance. | Authorized test identity on Bertina: registration, verification token, login, reset; SMTP delivery and authenticated ownership; no real customer data exposed to CI/logs |
| Transactional SMTP | Supported official 465/TLS mailbox settings are documented in `api/config.example.php`, but credentials are omitted and enablement defaults false. | Owner/operator confirms real TLS SMTP authentication, verified send/delivery and controlled failure/retry; do not commit mailbox password |
| BitPay/payment | `platform/payment-provider-registry.json` records official sandbox full positive/negative roundtrip on 2026-10-07 and `ir_primary.enabled=false`; `api/config.example.php` also starts `commerce_enabled=false`, `public_tls_confirmed=false`. Production API obtained is a **recorded claim**, not verified injection or real settlement. | Inject production secret only on authorized Bertina runtime, separately verify certificate/callback/amount/idempotency, official status, refund limitations, genuine order reconciliation and bank settlement; do not enable or charge now |
| Book sales and dispatch | Stage09 ledger/claims/parcel safeguards exist; `docs/governance/STAGE09_PRIVATE_DEPENDENCIES.json` records physical three-book inventory and reconciliation as unknown. | Physical count, recorded stock, buyer address custody, carrier workflow, email receipt, returns/refunds all reconciled; no invented inventory |
| Consultation capacity | `api/consultation-availability.php` requires additive InnoDB constraint-backed schema, owner-opened 60-minute Tehran windows capped at four hours/day and one-resource booking lock; public requests do not hold/confirm appointments. | Schema at active Bertina MariaDB, owner fresh MFA+CSRF session, actual owner-selected windows, green request/red booked transition, actual paid-case linkage/fulfilment; no synthetic capacity |
| Consented leads | Existing `/api/growth/leads`, `/mine`, `/withdraw` and MFA owner worklist are source-tested. Buyer/owner names now derive from official catalogues; no marketing opt-in is inferred. | Verify current tables migrated, one opt-in/test account, owner triage, withdrawal and privacy of cross-account records; review real 401/403/503 behavior |
| Student support/donations | Safeguarding/capability flow is present at source but not independently verified for payment/routing/beneficiary controls. | Owner approval, recipient verification, donor consent, receipt/financial separation and authorized provider before any live collection |
| Production/rollback | Manual-only `.github/workflows/deploy-bertina.yml` is isolated from source CI; hosting-managed backup assumptions are **not** an independent restore test (see `STAGE09_PRIVATE_DEPENDENCIES.json`). | Exact live vs candidate SHA, authorized single release, safe migrations, privately verified recovery/rollback limitations, postrelease HTTP/SEO/private-cache/readiness and incident response |

**Decision:** Source PASS is not a real-operational PASS. Without the named private checks, classify the corresponding capability **NOT INDEPENDENTLY VERIFIED** and retain fail-closed toggles. User's current instruction: **NO LIVE DEPLOYMENT BEFORE INFORMING AND OBTAINING RELEASE APPROVAL**. This overrides any historical generalized release authorization until separately confirmed for the final candidate. Do not ask anyone to share secrets or personal data in chat.

**New content safeguard:** October 15 Persian scholarly in-press book announcement is **not yet a sellable book**. Its public discoverability must be synchronized in the canonical FA sitemap, index lastmod, source search index, frozen URL identity ledger, build route approval, books hub, schema entity identity and accessibility metadata. This content has no live checkout entitlement and no presale. Claims about adaptation/translation or permission from original authors remain explicitly pending rather than approved.

---

## 2026-10-15 provider-claim identity hardening — 185 passing privacy-and-payment browser tests

**Source-only verified code SHA:** `2897a63e92f2031b1544492ad50c7feec6d3d168`. [v5.1.0 nondeploying candidate run 38716904467](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904467) passed all four jobs: contracts, **185/185 Playwright browser scenarios**, read-only public observation and immutable candidate. The new scenarios assert a) private FA/EN appointments explicitly disclose partially unavailable or 50-entry history and never display another SKU's case; b) both FA/EN actual order-history pages distinguish unverified paid state from recorded provider claims.

**Changes since prior 178-test snapshot:** `assets/js/consultation-appointments.js` now marks bounded or partly failed private order lookups *incomplete*, and rejects any service case whose SKU is absent from its parent order. Both bilingual account and standalone appointment routes have versioned updated JS. `assets/js/account-order-history.js` labels confirmed provider-claim evidence precisely, without implying bank settlement. `en/account/orders/index.html` now loads this **existing** authenticated history runtime rather than exposing a disabled EN-only placeholder; Persian orders page cache version synchronized.

**Critical server payment-evidence correction:** `api/index.php` `GET /commerce/history` no longer sets `paymentVerified=true` merely because `commerce_orders.state='paid'`, paid_at and provider IDs exist. It retrieves at most 50 owned orders, then checks installed Stage09 schema and matches those order IDs against **bitpay provider + transaction ID + verified gateway amount** in the unique `commerce_payment_claims` ledger; failures or missing schema leave `paymentVerified=false` while preserving bounded owned history. No bank settlement is inferred. `tests/bertina-account-order-history.php` includes isolated positive, missing claim, foreign transaction, amount mismatch and unready schema cases; [Account Commerce Consistency run 38716537051](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716537051) succeeded with that code. Browser acceptance covers normal and false payment flags in both languages.

**Independent live read-only operational observation (NOT same source SHA):** [Bertina Production Operational Pulse run 38716257161](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716257161) reported **readiness checks 0 failures**, configured auth/email/registration and commerce/checkout/order capture/service/VIP/shipping/receipts/stock/claim schemas, correct 401 guest barriers for auth/me, commerce/history, growth/leads/mine, and successful tested public page HTTP responses. Observed existing *live* release fingerprint `cc60a6eb7ce2b8a2237bbfa0d5d61e5bd82ef4d7`. This proves neither the NEW source SHA is live nor actual customer email receipt, BitPay bank settlement, physical stock, real booking/case delivery, student donations, isolated restore or JHELA OJS workflow. Configured flags are **read-only capabilities**, not authorizations for money movement.

**Release remains withheld:** User's latest instruction remains NO LIVE DEPLOYMENT until specifically told the controlled v5.1.0 candidate is ready and owner authorizes publication. No manual deployment, SQL migration, live purchases/charges/refunds, SMTP sends or privileged host changes were performed during this code-hardening phase. Next: authorized real customer/owner acceptance against verified release and rollback, exact live/source SHA matching, safe schema presence, provider reconciliation, and incident observability.
