# Website v5.2 — BitPay order reconciliation & 24-hour book holds
19 October 2026 — source-stage owner-only operational contract

## Authority and source of truth
Production: one existing Bertina PHP/MySQL database, `commerce_orders`,
`commerce_payment_claims`, `commerce_book_reservations`,
`commerce_book_stock`, `commerce_stock_movements`, `commerce_outbox`
and existing `operations_audit`. This document creates **no parallel ledger**
and authorizes **no deployment**, database edit or real charge.

Important: the Iranian provider `bitpay.ir` is **not** the unrelated
international cryptocurrency processor `bitpay.com`. Do not use the latter's
invoice APIs or expiry policy to claim a terminal failure at `bitpay.ir`.

## Payment-success / local-pending exception

A `pending` order may already have been successfully paid. A screenshot,
status in the merchant panel, missing callback or absence of a payment claim is
**not sufficient** to set `state='paid'`.

For a genuine **donation** recovery, a fresh-TOTP `SUPER_ADMIN` may use the
existing owner commerce workspace after deployment and take the following steps:

1. Identify the pending donor order from the private, bounded queue, noting
   its order ID, the expected amount and the masked `id_get` suffix.
2. In the **real Iranian BitPay merchant panel**, retrieve the complete
   `id_get` and positive `trans_id` for that exact, completed transaction.
   Do not share API keys or actual donor identifiers in GitHub, screenshots
   or support chats.
3. Submit the values using the owner-only confirmation form. The server calls
   the **existing** `gateway-result-second` with the private API key, and
   revalidates verified status `1` or `11`, `amount` and `factorId`
   against the existing pending order.
4. Only the established `stage9FinalizePayment` InnoDB transaction may
   create the payment claim, mark paid and emit one order-paid outbox event.
   Replayed callbacks cannot duplicate claims or charge a second time.
5. Separately check receipt delivery and the provider/bank settlement.
   A matched internal claim alone is not proof of either.

No second donation is initiated. If `trans_id` or the gateway verification
is unavailable, **leave the donation pending** and obtain formal provider
evidence. The UI and endpoint cannot manufacture transaction metadata.

## Physical book unpaid / 24h hold exception

The 24-hour period is measured from `commerce_orders.created_at`, with the
existing database clock. At 24 hours the order becomes **eligible for review**,
not automatically proven unpaid.

After independent verification that the exact provider request has a terminal
`failed` or `cancelled` status (and can no longer settle), the freshly
authenticated `SUPER_ADMIN` can use the existing owner commerce panel.
The approved function locks the original pending order, verifies `id_get`,
age, absence of prior payment/claim, valid book items and a live reservation.
It calls existing `stage9ReleaseBooks` inside the same database transaction,
then marks the order `cancelled`, preserves the original financial record
and writes the existing owner audit log.

**Fail-closed conditions:** younger than 24h, changed gateway reference,
paid/other order state, claim present, no book reservation, invalid owner MFA,
missing CSRF, unknown provider status, failed stock update, duplicate release
or database/schema inconsistency. No direct SQL updates or deletion of orders.

There is currently **no independently validated negative-status endpoint for
`bitpay.ir` by `id_get` alone** in the existing adapter. Therefore
unattended automatic release must remain OFF. An owner attestation cannot
establish machine-verifiable provider status; do not misrepresent it as such.
If the provider documents a verifiable terminal-state endpoint, implement and
test it with private credentials, safe retries and eventual-settlement guards
*before* enabling unattended release via existing Bertina cron.

## Acceptance / evidence boundaries

- Tests run against the isolated `operations_fixture` database only.
- Positive payment recovery and terminal book cancellation must use no live
  credentials or provider transactions in CI.
- Assert wrong amount, factor, id, early expiry, repeated callback, unauthorized
  role, missing CSRF and race safety.
- Confirm final CI on the **exact** release HEAD and the Bertina schema before
  any owner-approved production deployment.
- After deployment, reconcile actual order cases separately; staged code has
  **not** changed historical pending records on Bertina.

## Deployment control

Use the existing owner-frozen
`.github/workflows/deploy-bertina.yml` on
`migration/bertina-linux6`, only after explicit final owner authorization.
Do not unfreeze or replace that workflow, add cron activation automatically,
or perform a production payment reconciliation as part of source staging.
