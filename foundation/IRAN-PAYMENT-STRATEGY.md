# IRAN PAYMENT STRATEGY — v1.0

**Decision date:** 2026-10-05  
**Status:** FROZEN PRIORITY / PROVIDER SELECTION IN PROGRESS

## 1. Strategic decision

For the first production release, payment is designed primarily for **Iranian users and Iranian rial/toman commerce**.

Priority use cases:
- Golden Talent assessments and reports;
- consultation services;
- physical books;
- eBooks/workbooks/toolkits;
- courses or webinars;
- other domestic educational services.

International payment is **not a launch dependency** and is deferred until a real user/business need justifies it.

## 2. Currency rule

The platform stores monetary values in a canonical currency representation.

For Iranian commerce:
- database/API currency code: **IRR**;
- internal amount: integer in rial;
- UI may display **تومان** for user familiarity;
- conversion rule: 1 toman = 10 IRR;
- no floating-point money arithmetic;
- every order stores the currency and amount snapshot used at checkout.

This prevents ambiguity between rial and toman.

## 3. Gateway architecture

The commerce engine remains gateway-neutral, but the first adapters should target Iranian payment providers.

Candidate priority:
1. ZarinPal
2. NextPay
3. Zibal
4. other authorised Iranian PSP/payment-yar providers after technical/legal review.

Provider selection is based on:
- merchant eligibility;
- onboarding requirements;
- API quality;
- callback verification;
- settlement reliability;
- refund support;
- reporting/reconciliation;
- support;
- fee model;
- operational continuity.

## 4. Current public-source observations

### ZarinPal
The current official site describes:
- IPG/payment-gateway services;
- smart routing across multiple bank gateways;
- daily settlement;
- developer/API documentation;
- merchant onboarding through its dashboard.

### NextPay
The current official site describes:
- payment-yar status under Shaparak/Central Bank framework;
- direct payment gateway via API/web service;
- payment links;
- daily settlement;
- multi-gateway switching.

### Zibal
Zibal is retained as a candidate for comparative technical/onboarding review before final gateway approval.

No provider is considered approved merely because it is listed here.

## 5. Production flow

`Order → PaymentIntent → IranianGatewayAdapter → Bank/PSP → Callback → Server Verification → Payment → Entitlement/Fulfilment`

Rules:
- browser redirect is never sufficient proof of payment;
- callback/server verification is mandatory;
- idempotency prevents duplicate payment/order state transitions;
- gateway reference and reconciliation status are stored;
- failed/abandoned attempts remain distinct from verified payments;
- refunds use a provider adapter where supported;
- financial logs are auditable.

## 6. Product-specific behaviour

### Golden Talent
After verified payment:
- grant assessment access, report access or human-review entitlement according to purchased product;
- never unlock a report merely because the browser returned from the bank;
- assessment/report version remains fixed to the purchased entitlement where applicable.

### Books
After verified payment:
- physical books create fulfilment/shipping state;
- digital books create time/identity-bound digital entitlement;
- inventory is not decremented permanently until payment verification policy says so.

### Consultation
Depending on service policy:
- payment may be required after triage and before confirmation;
- booking status and payment status remain separate but linked.

## 7. Tax/accounting and merchant identity

Before launch we must confirm:
- merchant/account-holder identity;
- settlement account/Sheba;
- required Iranian business/identity documentation;
- invoicing/accounting requirements;
- refund/cancellation rules;
- any required e-commerce trust/merchant prerequisites for the selected provider.

These are external operational dependencies and must not be guessed in code or public copy.

## 8. Security

- gateway credentials only in server secrets/environment variables;
- no secrets in Git;
- no raw card data stored;
- callback signatures/references verified server-side;
- rate limiting and replay protection;
- payment event audit trail;
- production and sandbox/test credentials separated.

## 9. Roadmap consequence

Domestic Iranian payment moves ahead of international payment.

International gateways remain architecturally possible through the same adapter interface, but are **DEFERRED** for the first production release.
