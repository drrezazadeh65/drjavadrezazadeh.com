# Transactional Email Activation — v4.3.0

Status: EMAIL PROVIDER PARTIALLY FAILED (RECHECKED 2026-10-09) / RUNTIME INTEGRATION PENDING  
Provider: Resend  
Domain: `drjavadrezazadeh.com`

## Verified state

- An earlier activation check recorded sending readiness, but the live Resend audit on 2026-10-09 now reports **partially_failed**; do not treat sending as verified end-to-end.
- Sending capability is enabled.
- Receiving capability remains enabled.
- Open tracking is disabled.
- Click tracking is disabled.
- No production API key is stored in this repository.
- No transactional email was sent during this activation work.
- Latest provider DNS check: DKIM verified and inbound MX verified; sending SPF MX, SPF TXT and sending-path CNAME reported failed. Sending/receiving capability switches are enabled, but those switches do not resolve the DNS failures.
- Do not replace the existing inbound MX with Cloudflare Email Routing without first selecting one provider to own inbound delivery; see `foundation/V4.4-EXECUTION-AND-EMAIL-CLOSURE-2026-10-09.md`.


## Published templates

The production provider now contains three published website templates with stable aliases:

- `website-email-verification-v43`
- `website-password-recovery-v43`
- `website-order-confirmation-v43`

The verification and password-recovery templates require backend-generated short-lived URLs. The order-confirmation template must only be triggered after authoritative server-side payment verification.

## Security boundary

Do not create or expose a Resend API key until a secure runtime secret destination exists. Keys must never be committed to GitHub Pages, browser JavaScript, public JSON, documentation, logs or chat transcripts used as deployment configuration.

When the authenticated backend is provisioned:

1. create a sending-only provider credential restricted to the verified domain where supported;
2. store it directly in the runtime secret store;
3. call templates by alias;
4. generate verification/recovery tokens server-side;
5. use generic recovery responses to avoid account enumeration;
6. rate-limit verification and recovery delivery;
7. log delivery metadata without storing message secrets;
8. test delivery to controlled addresses before account activation is opened publicly.

## Template semantics

### Email verification
Variables:
- `VERIFY_URL`
- `EXPIRY_MINUTES`

### Password recovery
Variables:
- `RESET_URL`
- `EXPIRY_MINUTES`

Reset URLs must be single-use and short-lived.

### Order confirmation
Variables:
- `ORDER_REF`
- `ORDER_TOTAL`
- `ORDER_STATUS_URL`

This template is not an order-authority mechanism. It reflects a payment/order state already verified by the backend.

## Completion gate

Transactional email is not fully production-complete until the secure backend/runtime has a provider secret, signed-token flow, rate limiting and end-to-end delivery verification. Provider/domain/template readiness is complete.
