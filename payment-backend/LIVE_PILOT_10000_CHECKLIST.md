# One-off live payment pilot: 10,000 toman (100,000 IRR)

Status: PREPARATION ONLY. No real-money endpoint or checkout URL has been enabled.

## Hard gates before any live request
1. Obtain the *official production* BitPay merchant/API contract and confirm the merchant account is approved for live settlement. Sandbox URLs/keys must never be used for real money.
2. Confirm the provider's minimum amount and currency (IRR vs IRT). Server-authoritative amount MUST be 100000 IRR, not supplied by browser.
3. Confirm production DATABASE_URL and apply/inspect the payment_orders schema, unique provider transaction constraints and atomic settlement semantics.
4. Implement an isolated, server-side one-off pilot order (not a book purchase), authorized for exactly one attempt. Require a short-lived one-time server-side authorization and protect against CSRF, repeated requests and unsolicited origins. Never publish a generic low-price checkout route.
5. Production adapter must initiate and verify server-to-server using documented production endpoints; check merchant identity, order ID, amount, currency, status and unique transaction ID before recording payment.
6. Redirect/callback alone MUST NOT mark paid. Ensure idempotency, timeout, retry/reconciliation and failure/refund handling.
7. Verify production Vercel environment permissions and secrets; never commit credentials, expose them to client code or paste them into chat.
8. Run CI and end-to-end provider tests; review logs with secrets redacted. Require explicit final human confirmation before opening the bank payment page.

## Current repository facts
- /api/health responds with livePayments=false.
- /api/payments/create currently uses payment-test URLs and catalog-derived book amounts.
- /api/payments/callback currently verifies through the sandbox adapter.
- /api/payments/verify currently returns 503.
- Existing checkout catalog is NOT suitable for a 10,000-toman pilot.
- Do not change the public GitHub Pages domain, SEO URLs, /fa/ or /en/ routing for this pilot.

## Release decision
Do not merge live-payment changes or enable live payments until all gates above pass.
