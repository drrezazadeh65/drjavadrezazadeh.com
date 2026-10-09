# Active Infrastructure Policy — 2026-10-09

## Authoritative owner decision

Only GitHub Pages and Cloudflare are in scope for the current site and commerce architecture. Disconnected providers and plugins are not part of this project's active infrastructure, and may not be restored without a new explicit owner decision. Any other integration explicitly retired by the owner is likewise excluded. This document governs future website development and audits; it does not claim to remove platform connections from external account settings.

## Active infrastructure and responsibility

| Function | Active platform/boundary | Scope |
| --- | --- | --- |
| Source control and release evidence | GitHub (`drrezazadeh65/drjavadrezazadeh.com`, `main`) | Code, commit history and CI |
| Public site hosting | GitHub Pages | Published public site; preserve current canonical routes |
| DNS and edge controls | Cloudflare | DNS, TLS/edge configuration and related routing, subject to live verification |
| Dynamic commerce and payment integration | Cloudflare Worker / D1-based commerce code | **Deployment and live-payment readiness must be checked independently** |
| Canonical public origin | `https://drjavadrezazadeh.com` | Canonical, hreflang, sitemap, identity references |
| User communications | Email | Account identity, verification, recovery and general correspondence |
| Purchased student support | Eitaa, entitlement-controlled | Only eligible students with verified purchase; not a public channel |

Do not infer that an aspirational `app.` subdomain, a server scaffold, or a green CI deployment from a retired provider represents a live system. The future dedicated-server topology documents are **design targets**, not proof of currently active infrastructure. Treat unconfirmed production claims as unverified.

## Production commerce architecture

Obsolete hosted-backend scaffolds and their testing workflows have been removed from the active GitHub source tree. No inactive provider may serve as a deployment target or production-readiness signal.

The active commerce implementation currently resides under `payment-api/` and `edge/payments/` and is called by the public checkout; it must be assessed using Cloudflare-side status and actual verified transaction tests. Exact Cloudflare deployment and secrets remain subject to live verification.

## Release rules

1. Public-site release evidence must come from GitHub revision, GitHub Pages publishing, the canonical public domain, relevant Cloudflare Worker endpoints and a live external crawl—not a retired platform.
2. Preserve the frozen 2026 bilingual SEO standard, `/fa/` and `/en/` URLs, and all existing canonical paths. Do not create 404s or silent redirects.
3. The full academic identity of Dr. Javad Rezazadeh Yazdeli remains the first level of the site's brand; commercial offerings are subordinate applications of scholarly and educational practice.
4. No SMS or phone authentication; verification and recovery rely on email. No public disclosure of an Eitaa student-support link.
5. Only report a payment, email, customer-entitlement or deployment workflow as operational after checking the actual active endpoint and its persistence, idempotency and authorization.
6. Do not reinstall or propose a removed application merely because stale files, GitHub commit statuses or historical documents mention it.
