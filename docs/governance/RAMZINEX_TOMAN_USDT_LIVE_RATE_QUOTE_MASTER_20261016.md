# Ramzinex USDT / Toman Rate and Time-Limited Quote — Integration Contract (2026-10-16)

**Status:** DESIGN_CONTRACT — PROVIDER_RUNTIME_AND_LIVE_ORDER_VERIFICATION_PENDING. This file is an operational specification, NOT evidence that an active quote, payment channel or database migration is deployed. Owner's current instruction: use Ramzinex rates as the primary market reference for the bilingual website's donations, bookstore, educational services, Golden Talent and properly authorized journal invoices.

## Source of truth: extend, do not duplicate
- Reuse existing Bertina `customer_accounts`, `commerce_orders.amount_toman`/`currency='IRT'`, product prices and supported finance/checkout contracts.
- The master modular data model has **already reserved** `database/unified/002c_subscriptions_tax.sql:eco_fx_rate_versions` for versioned FX sources and `002a_commerce_finance.sql:eco_product_prices`, `eco_invoices`, `eco_payment_events`, `eco_settlement_*` for financial provenance. These are design-only, NOT proof of installed production tables. Do not build a separate users, orders, or exchange-rate database.
- Extend the existing finance module with an **additive, versioned, minimal payment-quote binding** only if read-only production schema inventory proves no equivalent installed structure exists. Always bind to the canonical order/invoice/donation reference. Migrations must be approved, measured and restore-tested before execution.
- Historical PR #86 `feature/bsc-usdt-manual-international-20261016` is an isolated input, not a ready-to-merge payment system. Its `database/bertina/022_manual_usdt_bsc.sql` has a duplicated `PRIMARY KEY` for `manual_usdt_audit.id` and a mismatch between audit enum `review_started` and PHP action `under_review`. Resolve and test before any merge or migration.

## Ramzinex public market feed: unverified live until independently probed
- Official Ramzinex PHP SDK: https://github.com/ramzinex/php-sdk ; documents a getPrice(pair ID) returning `buy`, `sell`, `pair_id`, base/quote information. Public endpoints have also been documented as `https://publicapi.ramzinex.com/exchange/api/v1.0/exchange/pairs`, `/pairs/{pair_id}`, and `https://publicapi.ramzinex.com/exchange/api/exchange/prices`; these endpoint locations derive from public community implementation and **must be confirmed with the current official provider documentation and live response before production**.
- Fixed HTTPS server-to-server GET only; TLS verify, constrained DNS/connect/total timeout, no user-supplied URL, no redirects, no API key in public JS, bounded JSON and response size, 429/backoff and throttled cache. The public rate feed should not need the previously disclosed private read-only API credential.
- **Market identity gate:** verify live pair ID, base=USDT, quote currency unit and ticker, market activity, `buy` / `sell` semantics and timestamp. Never assume USD and USDT are economically or contractually identical, or that 'buy' means the same perspective as merchant receipt.
- **Unit gate:** IRR = rial and IRT = toman; 10 IRR = 1 IRT. Normalize exactly once, with unit provenance. Reject absent or ambiguous units; NEVER silently divide based on number magnitude.
- Distinguish an indicative `USD/IRT` view from the actual **USDT/IRT market pair**. A USDT price cannot be represented as an official or guaranteed USD FX rate.

## Two separate read models
**Indicative public display:** Show the latest valid USDT/toman rate, source name, retrieved-at timestamp, source pair and freshness label; display conversions on donations, books and service cards without making a payment commitment. Refresh server-side, not per browser or client tab. On unavailability say “Current rate unavailable”; never show a stale cached number as live.

**Executable payment quote:** Must be issued server-side, only for a verified first-party order, owner-approved invoice or donation amount; include canonical reference, amount in IRT, independently verified merchant-receipt side of USDT market, method/token/network, USDT amount and rounding policy, rate source/pair, observed_at, issued_at, expires_at, approved margin/fees (if any), customer identity/consent where applicable, immutable quote ID, version and idempotency key. Prefer decimal/big integer maths instead of binary floats. Quote cannot change silently after issuance.
- Representative arithmetic, NOT an actual rate: `amount_USDT = ceil_to_6_decimals(amount_toman / approved_toman_per_USDT)`. Any network fee/spread must be authorized, separately disclosed and not silently treated as revenue.
- If no fresh or independently verified sell-receipt rate exists, quote issuance returns an unavailable status, not 0 USDT or a fabricated fixed quote. No expired quote may be paid without fresh confirmation.
- Example freshness policy pending owner/provider validation: public quote display cache up to 30 seconds, payment quote maximum 120 seconds; these are provisional engineering defaults, not a promise from Ramzinex.

## Bilingual UI / product integration
- Public read-only calculator for fa/en: user enters IRT or USDT, sees estimate, explicit quote direction, source and update time; no private auth required for rate viewing.
- Existing bookstore and service pricing in toman stays authoritative. The user's private orders dashboard shows real quote/ref, state and expiry; manager dashboard shows admin-only reconciliation and audit. No second cart, order registry, customer login or payment state machine.
- Donation amounts are selectable; for other purchases derive official original amounts from the server order/issued invoice. Journal fees remain contingent on independently authorized editorial acceptance and issued invoice.
- BSC-only token/network/address must be separately verified as currently active and owned. Do not accept transfers to an exchange deposit address based on code comments or historical screenshots.
- Claiming a hash or uploading a receipt does not prove funds were received. Authorized reviewer verifies token, chain, recipient, actual amount, confirmations and invoice; status can progress only by durable state transitions in private audited backend, never by public callback or user-supplied screenshots alone.

## Live activation gates
1. Read-only production database/module inventory; confirm the minimum additive module to use and actual restore readiness, **before DDL**.
2. Current documented public Ramzinex rate endpoint response, correct USDT/IRT pair, actual quotation units and buy/sell meaning verified and saved as a dated source test.
3. Private receiving wallet/network/contract reconfirmed; the previously disclosed Ramzinex private credential revoked/reissued and segregated from public-rate requests.
4. Real TLS, staging rate-source outage/429/invalid-pair tests, integer-precision/IRT conversion tests, immutable quote expiry tests, isolation/security/MFA and duplicate-claim tests.
5. Full donation, book, service, Golden Talent and eligible journal billing journeys: submit, receipt, notification, manager review and real customer account status, both languages, mobile/desktop.
6. Separate owner-reviewed database migration and one exact-SHA controlled Bertina production deployment with smoke tests and rollback plan.

**Current decision:** Develop against existing modules, not a new master DB. No blank or fictional payment UI; do not turn on money collection until all applicable controls genuinely pass. Acceptance of this contract alone does not assert a live Ramzinex quote or enabled checkout.
