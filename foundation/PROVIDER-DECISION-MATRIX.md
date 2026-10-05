# PRODUCTION PROVIDER DECISION MATRIX — v1.0

**Status:** conditional technical decision.

The ecosystem remains provider-neutral at the API and data-model level.

## Conditional primary path
- public web stays static during migration;
- API edge may use Cloudflare Workers or an equivalent standards-based runtime;
- PostgreSQL/Auth/Storage may use a Supabase-compatible managed service;
- private files use non-public object storage;
- journal publishing stays on a separate OJS stack;
- payments remain behind a replaceable gateway interface.

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

## Current decision
Proceed now with stable contracts and schemas. Bind them to a provider only after the approval gate.
