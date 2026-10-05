# PAYMENT PROVIDER ABSTRACTION — v1

## Objective

Iranian and international checkout must share one commerce model without exposing gateway-specific logic to the browser.

`Frontend → POST /v1/checkout → Server provider selection → Provider → Verified callback/webhook → Payment → Entitlement`

## Client contract

The browser may send only:
- `product_key`
- `market` (`IR` or `INTERNATIONAL`)
- a safe `return_path`

The browser does **not** choose the actual provider, amount, payment truth or entitlement.

## Server responsibilities

The server resolves:
- active product/price;
- canonical currency and amount snapshot;
- eligible provider;
- idempotency key;
- order and payment intent;
- redirect URL/client token.

After return/callback, the server independently verifies the provider result before updating `payment`, `customer_order` and `entitlement`.

## Iran market

- canonical database currency: IRR;
- UI may display toman;
- first adapter slot: ZarinPal after merchant/API credentials are supplied;
- provider remains disabled until credentials, callback domain, refund policy and production environment are verified.

## International market

- initial catalogue currency: USD;
- card-first customer UX is preferred;
- actual card provider remains `pending_kyb_provider` until merchant eligibility is confirmed;
- optional stablecoin settlement is not assumed and may be enabled only when the selected provider explicitly supports it for the merchant entity and service model.

## Security

Secrets stay in environment/secrets management only. No raw card data, private key, merchant secret or webhook secret belongs in Git, HTML, JavaScript, analytics or chat logs.

## Entitlement rule

A browser redirect to a success page never unlocks Golden Talent. Only a server-verified payment event may grant assessment, report, BAHAR or professional-review access.
