# PRODUCTION PROVIDER DECISION MATRIX — v1.0

**Status:** conditional technical decision.

The ecosystem remains provider-neutral at the API and data-model level.

## Conditional primary path
- public web stays static during migration;
- API edge may use Cloudflare Workers or an equivalent standards-based runtime;
- PostgreSQL/Auth/Storage may use a Supabase-compatible managed service;
- private files use non-public object storage;
- journal publishing stays on a separate OJS stack;
- payments remain behind a replaceable gateway interface; **the first production payment adapters are Iranian, with IRR as the canonical transaction currency.**

## Fallback path
If a managed provider is unavailable or unsuitable:
- self-host PostgreSQL;
- use a standards-based authentication layer;
- use S3-compatible private storage;
- deploy the API on an eligible VPS or cloud environment.

## Current cost observations
Supabase currently offers a free tier suitable for development and a paid production tier starting from USD 25/month. Cloudflare Workers currently offers a free tier and a paid plan starting from USD 5/month.

## Provider approval gate
A provider is approved only after:
- account access is confirmed;
- test deployment succeeds;
- backup/export path is verified;
- pricing is acceptable;
- secrets remain outside Git;
- migration/exit path is documented.

## Payment-provider priority

The launch market is primarily Iranian. Payment-provider evaluation therefore prioritises authorised Iranian payment gateways/payment-yar services.

First comparison set:
- ZarinPal
- NextPay
- Zibal

International gateways are deferred and are not a launch dependency.

See `/foundation/IRAN-PAYMENT-STRATEGY.md`.

## Current decision
Proceed now with stable contracts and schemas. Bind hosting/auth/storage to a provider only after the approval gate. Bind commerce first to an approved Iranian gateway adapter after merchant eligibility and callback-verification testing are confirmed.
