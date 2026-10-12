# Stage 09 — Commerce, revenue and service fulfilment acceptance (2026-10-12)

Status: **PARTIAL / LIVE ACCEPTANCE OPEN**. This is a scoped, source-audited record, not proof that money moved or that live MySQL inventory is correct. Applies only to the canonical `drrezazadeh65/drjavadrezazadeh.com` branch `migration/bertina-linux6`. No second checkout, no restored retired providers and no deployment trigger.

## Preserved commercial baseline

- **Books:** `roshanaei` (سپید), `tariki` (تاریکی), `bonbast` (بن‌بست); the existing catalogue retains approved cover paths and **2,000,000 IRT per book**, with no price/media reset. The owner reported **initial stock of 1,000 physical copies of EACH book**, not verified present stock. NEVER upsert/reseed a live stock count to 1,000 on deployment. Historical sales, cancellations and adjustments must first be reconciled from production records.
- **Shipping policy:** free postal shipping paid by the store; stated expected dispatch/delivery window **10–14 working days**, subject to a validated logistics process. Do not claim real parcel tracking until a carrier event actually exists.
- **Services:** preserve all **21** standard SKUs and their existing server-authoritative prices and published terms. Preserve all **6** VIP SKUs and prices, with secure selected-SKU checkout; capacity, scheduling and delivery are independent obligations.
- **Provider:** existing Bertina PHP/MySQL + BitPay callback; do not substitute legacy Cloudflare/Worker/D1/payment/SMTP stacks. `IRT` is toman; the exact current gateway multiplier and bank settlement currency must be privately verified before controlled real-money testing.
- **Privacy and discoverability:** public product/service catalogue indexable as appropriate; API, cart, payment result, verified order list, CRM, schedules, child/student and administrative data `no-store/noindex`; consent-based access only.

## Verified source facts and limitations

1. `api/index.php`: `/commerce/create` creates an order using server catalogue prices and gateway send; `/commerce/callback` checks provider response against stored `id_get`, amount, `factorId` and transitions `pending -> paid` with a conditional SQL update. A replay on the same paid order does not repeat that transition. This is **source-level idempotency**, not a validated simultaneous/concurrent production test nor end-to-end bank reconciliation.
2. `/commerce/status` requires a per-order HMAC-signed, Secure/HttpOnly/SameSite browser proof to reveal order status. Source-only receipt fixtures exist. No user should be granted service entitlement, shipment or refund merely because the browser returned from the gateway.
3. `docs/BERTINA_MYSQL_SCHEMA.sql` currently has `commerce_orders` but **no committed live-verifiable stock ledger, stock reservation/expiry, parcels, returns, refund state machine or unique provider transaction constraint**. `book-catalog.json` has only `inventory_state: IN_STOCK` with no remaining-count. Do not infer stock from the initial 1,000.
4. New **source-only** `GET /api/commerce/history` uses the verified and active session account plus a bound `customer_email = ?` lookup, limits the response to 50 orders, excludes customer/address and provider identifiers, and never asserts fulfilment. `fa/app/account/orders/` consumes this endpoint with `credentials: same-origin` and `cache: no-store`. This does **not** prove the unpublished endpoint works on Bertina or verify all historic guest-order identity cases.
5. Service and VIP checkout availability flags depend on existing private booking switches. An enabled capability is not an actual appointment, delivered manuscript, workshop or awarded entitlement. Existing /assistant/v1/leads returns a configuration error; persistent consented CRM remains unverified.

## Additional private payment-provider evidence (reviewed 2026-10-12)

Four BitPay **purchase-notification emails** dated 2026-10-08 through 2026-10-11 were observed in the owner's connected mailbox: three described as payment tests and one as a voluntary-support payment. This demonstrates that provider notifications have reached the mailbox, and refines the earlier generic statement that no gateway events existed. It does **not** establish successful matching MySQL order rows, unambiguous callback idempotency, merchant settlement, no chargeback, or service delivery. No email body, card detail, account credential, customer identity, wallet ID or transaction ID is copied into this public repository. Verification must use authorized private reconciliation evidence.

## Acceptance gates and current dispositions

| Gate | Exact required proof | State |
|---|---|---|
| 09.1 Payment create and receipt | Authorized low-value real checkout, server-origin order row, bank reference and own-account receipt all reconcile | **OPEN — real-money authorization and independent evidence absent** |
| 09.2 Settlement | Order ID + factor + gateway request/verified callback + bank/merchant settlement matched without amount/currency drift | **OPEN** |
| 09.3 Replay/concurrency | Simultaneous duplicate callback/checkout tests with one terminal payment transition and one fulfilment event; cross-order provider ID uniqueness | **PARTIAL (conditional SQL only)** |
| 09.4 Purchase history | Verified email/account ownership, 401 guest/disabled/unverified, isolation between customers, private customer UI | **SOURCE IMPLEMENTED; isolated fixture/CI and live account QA required** |
| 09.5 21 services/6 VIP | Paid order -> controlled entitlement -> mutually exclusive booking slots -> notifications -> document/consultation delivered -> acceptance | **OPEN** |
| 09.6 Three book stock counts | Owner stock-count evidence, backfilled movements, physical recount, no reseed/no negative available quantities | **OPEN** |
| 09.7 Reservations and cancellations | Atomic InnoDB quantity reservation with unique order/SKU, TTL expiry, confirmed conversion on payment, explicit release and refunds | **OPEN** |
| 09.8 Shipping | Paid/allocated order -> dispatch -> carrier + tracking -> delivered timestamp -> customer-only tracking | **OPEN** |
| 09.9 Notifications, delays, refunds | Reliable send-attempt log, retries, honest failure display, authenticated refund request, reviewed payment reversal ledger | **OPEN** |
| 09.10 Consultation CRM | Verified account contact, versioned consent + scope, deduped leads, case owner, booked slot, revocation and audit history | **OPEN** |

## Implementation and safety order

1. **Preserve recovered production state** before schema migration, commerce deployment or public financial operations: owner-private encrypted full-site + MySQL backup, independent ciphertext reread, isolated matching-DB restore and genuine signed nine-condition receipt. Source archives and green CI do not replace this.
2. Capture live book counts without resetting them: add reversible, additive stock/movement/reservation schema, migrate via audited one-time stock reconciliation, `SELECT ... FOR UPDATE` atomic reservation and explicitly defined expiry/cancellation state machine. Never silently oversell or accept money for unavailable physical stock.
3. Establish a bank-authoritative reconciliation ledger, unique provider transaction identity, structured callback replay tests, safe retry/idempotency keys and an exception queue for captured-but-unfulfilled orders. Do not make a bank refund claim without bank proof.
4. Link 21+6 published SKUs to private appointment/service-delivery cases only after verified settlement and required buyer/guardian consent. Support customer-only booking, rescheduling, cancellations, audit trails, and proof-of-completion; human review for sensitive student records.
5. Register shipping partner/carrier, tracking code and timestamps only from authorized operator/provider events. Public pages show generic policies; private dashboard shows *its own* shipment events.
6. Implement notification outbox with deduplicated delivery attempts, bounded retries and provider error records; authenticated, audited refunds and escalation. Never email confidential student data or expose records to SEO crawlers.
7. Only after release checks, private production tests and owner-authorized controlled transaction, reconcile provider statement, receipt, inventory, entitlement, shipment and settlement. **Do not mark Stage 09 complete before all applicable gates pass.**

## Tests and deployment evidence

New scoped source tests: `tests/bertina-account-order-history.php`, existing `tests/bertina-receipt-access.php`, `tests/bertina-receipt-contract.php`, and `scripts/commerce-receipt-contract-audit.mjs`, wired into `.github/workflows/account-commerce-consistency.yml`. These test private history and receipt contracts **without** real customers or payment. The new page and PHP route are committed to source only. CI outcome and current Bertina live SHA must be separately observed.

Cross-stage dependencies: stage 7 unified admin action authorization (no fabricated executors), stage 8 secure customer workspace, and SEO default standard remain unchanged. **Issue #60 stays open; no deployment until private recovery gate is genuinely satisfied.**

## Stage09 implementation checkpoint — isolated-source continuation

The following implementation is now recorded in the canonical branch **but is not deployed or proven on the Bertina production database**:

- `docs/migrations/20261012_stage09_commerce.sql`: eight additive InnoDB tables (three-book physical stock, per-order reservations, movement ledger, unique provider transaction claims, deduplicated outbox, service/VIP follow-up cases, parcels and customer refund-review requests). Migration has **no production inventory seed or financial mutation**; actual quantity must be reconciled privately first. Customer refund requests have a unique `(order_id, requester_account_id)` constraint.
- `api/commerce-stage9.php`: transactional stock reservations in deterministic SKU order, paid sale commitment, operator-only reservation release helper, unique BitPay transaction ownership, fresh row-locked amount/factor comparison, one paid-order event and follow-up cases for actual service/VIP purchases. Absent stock/schema or uncertain gateway outcomes **fail closed / retain inventory holds for review**, rather than fabricating available copies or silently releasing potentially paid reservations.
- `api/index.php`: checkout health now gates new monetary orders on the installed stage09 schema; book checkout additionally requires every current book SKU to have a privately reconciled stock row. Existing non-monetary book order capture remains distinct and never proves allocation/payment. Callback uses the atomic finalizer. New owner-only `GET /commerce/fulfilment` requires an active verified account, exact order/email match and a stored provider claim before showing shipment/service records. New `POST /commerce/refund-request` creates a **review request only**, with no bank reversal or automatic cancellation.
- `fa/app/account/orders/` plus `assets/js/account-order-history.js`: customer-only order records, on-demand carrier/tracking and service status, and deliberate refund-review form. All private requests use same-origin credentials and no-store; missing shipment/booking/bank evidence is never filled with invented data.
- Automated source/fixture checks: `tests/stage09-commerce-atomic.php` (stock rollback/replay/unique claims), `tests/stage09-fulfilment-privacy.php` (authenticated ownership, no unclaimed tracking) and `tests/stage09-refund-privacy.php` (no unauthorized/duplicate review). These execute in the existing Account Commerce Consistency workflow.
- Genuine **isolated MySQL8 multiprocess** acceptance: `tests/stage09-mysql.php`, integrated into the existing Operations Control Center QA MySQL service. It initiates two competing physical-book reservations and two callback-finalization processes and checks one winner, stock conservation, provider uniqueness and outbox/case dedupe. **Test existence is not evidence of a PASS; cite an actual completed run before closing these fixture gates.**

### Deployment and finance hold (mandatory)

1. First execute the signed nine-check Bertina/MySQL backup and isolated restore in the owner's trusted private environment; certify a readable, restorable, independently copied snapshot. Current GitHub source cannot substitute.
2. Run read-only discovery on **existing** paid/unsettled orders, actual remaining copies, previous physical transfers and any duplicated BitPay provider transaction IDs. Reconcile historical paid records into the payment-claims ledger **only after verifying trustworthy original bank/provider data**; do not assume earlier paid orders are absent.
3. Run reviewed additive migration exactly once with schema/engine/index introspection, no automatic 1000-stock seed, then explicitly insert/count/sign off actual stock rows. Drain or individually reconcile old pending book payments that predate reservations.
4. Verify all CI and source/live SHA gates. Only then serialize one Bertina deployment with safe rollback and strict external HTTPS checks. If schema/stock are unavailable, the new source intentionally disables monetary checkout rather than accepting an oversold or untracked order.
5. Run an explicitly authorized **new** real-money control transaction and compare BitPay payment, callback, unique claim, bank settlement statement, email receipt, buyer-account history and subsequent delivery events. Earlier notification emails count as provider notifications only, not a new approved transaction or proof of settlement.
6. Add controlled administrator workflows with MFA and audit trails before recording stock adjustments, dispatch, actual booking/delivery, provider reconciliation, notification-outbox execution or actual bank refunds. Their tables are not proof that those workflows exist.

The stage is **PARTIAL**: CI status, production migration, monetary reconciliation, actual stock, 21+6 booking/delivery, reliable notification dispatcher, bank refund and carrier integration remain external/live acceptance gates.
