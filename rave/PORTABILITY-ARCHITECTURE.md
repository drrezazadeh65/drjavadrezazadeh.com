# RAVE Portability-First Architecture Contract

Status: binding foundation policy (feature branch, not yet production deployed).

## Primary design principle
GitHub is the source of truth for versioned source, workflows, configuration, tests, documentation and release manifests. GitHub Pages currently serves the static website. The architecture must allow a near-term move to another hosting provider without changing public URLs or rewriting domain logic.

## Infrastructure boundaries
- GitHub Pages is a **replaceable deployment target**, never a runtime dependency.
- GitHub Actions is a **replaceable job runner**; RAVE's CLI must also run locally or in any standard CI runner.
- Cloudflare Workers is an **optional adapter only** for existing approved backend/API integrations. No RAVE core module may import Cloudflare-specific APIs.
- No Cloudflare DNS, Pages, CDN, D1, KV, Queues, R2, Vercel or Neon dependencies.
- DNS management remains outside RAVE. The actual DNS provider must be verified, not assumed.
- Never commit API keys, personal customer records, credentials, or production database snapshots.

## Portable layers
1. Core: platform-neutral Node.js (ES modules), using standard Web APIs where practical.
2. Adapters: optional external service connectors isolated behind documented interfaces.
3. Storage: JSON audit artifacts for non-sensitive evidence; future production storage via environment-configured adapter.
4. Scheduling: GitHub Actions today, cron/container scheduler tomorrow, both invoke the same CLI.
5. Deployment: static assets with relative asset paths and canonical URLs based on PUBLIC_SITE_ORIGIN.
6. Domain: domain-specific public URL manifest and redirects are preserved across hosting migration.

## Migration acceptance gates
- A clean checkout builds and audits without Cloudflare credentials.
- CLI runs with Node.js 20+ on a local machine or generic Linux runner.
- No hard-coded github.io origin, Workers hostnames, or deployment secrets in core.
- Bilingual /fa/ and /en/ paths, canonical/hreflang, sitemap, robots, 301 redirects and SEO release gates remain stable.
- CI runs the same tests before and after migration.
- Payment/email/auth backends are migrated separately, with rollback and security review.
- A staging cutover must pass HTTPS, DNS, SEO, forms, payment and transactional email smoke tests before production DNS changes.

## Non-goals
This document does not initiate a migration or claim that a new host has been selected.
