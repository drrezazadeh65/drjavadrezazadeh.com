# BitPay production activation checklist

The public website is hosted on GitHub Pages. GitHub Actions secrets do **not** create a runtime payment API.

## Safe production plan
1. Provision an independent HTTPS backend capable of receiving callbacks and persisting orders (e.g. Node server or serverless functions with persistent database).
2. Store `BITPAY_API` in that backend's runtime secret store; never in GitHub Pages JavaScript, repository files, URLs, or chat.
3. Migrate the existing BitPay adapter and callback logic to the selected runtime. The previous `edge/payments` implementation is not deployable without its original provider-specific runtime.
4. Create an immutable server-side order from the authoritative product catalog and verify stock, currency and amount.
5. Call BitPay production create from backend and persist `factorId`, `id_get`, amount, order ID, and pending state.
6. Receive provider callback, independently call BitPay verification from backend, validate returned identifiers/amount and handle duplicate callbacks idempotently.
7. Provide read-only authenticated order status; never accept a browser-provided 'paid' flag.
8. Only then enable checkout buttons and confirm shipping/returns. Run a small controlled live transaction and refund/reconciliation review.

## Current branch scope
This branch only improves checkout presentation in both languages. Payment remains disabled by design. The checkout page remains `noindex`; product page SEO and canonical URLs must remain unchanged.

## Launch blockers
- A selected and deployed independent runtime + persistent database
- Secret configured directly in that runtime
- Backend checkout integration and provider callback verification
- Confirmed fulfillment/returns and authoritative sellable product data
- End-to-end live payment verification and monitoring
