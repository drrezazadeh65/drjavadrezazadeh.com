# BitPay production activation — Cloudflare only

Status: NOT CERTIFIED FOR PUBLIC PAYMENT (2026-10-09). This checklist applies exclusively to the approved GitHub Pages + Cloudflare Worker/D1 architecture; no retired hosting or database integrations are permitted.

The public website is hosted on GitHub Pages. A GitHub Actions secret does not create a deployed payment backend or an authenticated customer account.

## Production release sequence

1. Identify the authoritative deployed Cloudflare Worker entrypoint and confirm that it serves the public checkout origin. The repository contains both `payment-api/` D1 commerce modules and `edge/payments/` Durable Object book-payment code; do not mistake either source tree for proof of deployment.
2. Verify actual Cloudflare Worker secrets, D1/DO bindings, production routes, TLS, CORS and callback URLs without publishing credentials.
3. Apply and verify the commerce database schema in the correct D1 environment; confirm order persistence, uniqueness constraints, immutable amount and provider transaction IDs.
4. Use only the server-authoritative product catalog for prices and stock; do not trust client-supplied amounts or completion states.
5. Verify merchant-book fulfilment, returns, service booking capacity and VIP scope. Free shipping to the buyer does not remove the requirement to confirm dispatch and returns.
6. Enable the commerce `ORDER_EMAIL_FULFILMENT_CONFIRMED` gate only after server-verified email identity, durable order/customer linkage and actual transactional receipt delivery work. No SMS/phone verification. The connected Resend domain is currently `partially_failed`; repair DNS and verify delivery before enabling.
7. For purchased student services, release Eitaa support only from a server-verified paid order, email-authenticated student session and active non-refunded entitlement; never embed the handle in public HTML/JS.
8. Independently verify the BitPay callback response amount, factor, status and transaction identifiers against the stored order. Test duplicate and forged callbacks, failure paths and refund reconciliation.
9. Complete a controlled low-value live transaction with explicit owner authorization, a verified persisted payment, delivered receipt and print-ready invoice before enabling public payments.
10. Confirm 27 service pages, the bookstore, bilingual canonical paths, the frozen SEO standard, accessibility, mobile navigation, sitemap, images and all GitHub Actions gates on the final deployed commit.

## Fail-closed rules

- `COMMERCE_ENABLED` is not by itself proof of readiness. The commerce backend additionally requires a configured gateway amount multiplier, order-linked email fulfilment and the appropriate category flag.
- `/commerce/health` must expose explicit boolean category capabilities; the frontend must never treat an absent flag as permission to collect payment.
- `/commerce/create` must reject unconfirmed book fulfilment, service capacity and VIP booking even if a client bypasses the frontend.
- The 10,000-toman test flow is not a substitute for a production sale and does not certify customer records, receipts or fulfilment.
- Never claim a production release is complete from code commits or green source-level CI alone; obtain live Cloudflare and email-provider evidence.

See `foundation/V4.4-EXECUTION-AND-EMAIL-CLOSURE-2026-10-09.md` and `foundation/ACTIVE-INFRASTRUCTURE-POLICY-2026-10-09.md`.
