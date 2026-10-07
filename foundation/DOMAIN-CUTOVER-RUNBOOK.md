# Production Domain Cutover Runbook

Target production origin: `https://drjavadrezazadeh.com`

## Current production state
The canonical-origin cutover completed successfully on 6 October 2026. On 7 October 2026 GitHub Pages reported **DNS check successful** and HTTPS enforcement was enabled through the Pages UI. A fresh external Actions runner then resolved the four GitHub Pages apex addresses and completed the production audit across all 55 sitemap targets without a TLS certificate error. GitHub Pages is the current static host and the owned domain is the public canonical origin. DNS/CNAME/nameserver settings are therefore frozen unless a future controlled migration is explicitly approved. This document is retained as an audit/rollback runbook rather than as an instruction to repeat the migration.

**GitHub Pages note:** repository `_redirects` syntax is not relied upon as the active production redirect engine on GitHub Pages. Current SEO safety therefore prioritises stable path identities and CI-enforced zero broken links. If hosting later moves to a platform that supports `_redirects`, those rules must be revalidated before activation.

This runbook was prepared before cutover; write-mode migration should not be repeated unless an intentional future origin migration is approved.

## Pre-cutover
1. Acquire the domain.
2. Decide the canonical host: apex `drjavadrezazadeh.com` is preferred; redirect `www` to apex with 301.
3. Configure HTTPS and verify certificate renewal.
4. Configure hosting/CDN and a staging preview.
5. Deploy and verify the repository `_headers` policy on Cloudflare Pages: global clickjacking/MIME/referrer/permissions protections, `noindex` on Pages preview hosts, and `no-store` + `X-Robots-Tag: noindex` on private/transactional shells.
6. Deploy and verify the repository `_redirects` registry. Confirm every frozen legacy English migration returns HTTP 301 to its approved `/en/` target. `_redirects` rules do not apply to future Pages Functions, so Function-handled routes must reproduce required redirect behaviour in server code.
7. Verify that private/authenticated routes are not exposed as public static assets. Remember that `_headers` does not apply to future Pages Functions; server-generated responses must set their own security/cache headers.
8. Keep payment credentials and backend secrets outside Git.

## Dry run
```bash
node scripts/domain-cutover.mjs https://drjavadrezazadeh.com --dry-run
```

Review every file that would change.

## Atomic URL cutover
```bash
node scripts/domain-cutover.mjs https://drjavadrezazadeh.com --confirm-https-ready
node scripts/seo-regression.mjs
```

The cutover changes canonical URLs, hreflang targets, structured-data IDs/URLs, Open Graph URLs, sitemap URLs and the robots sitemap declaration where the current GitHub Pages origin appears.

## Required production checks
- HTTPS 200 on root, /fa/ and /en/.
- HTTP -> HTTPS 301.
- www -> apex 301.
- Every version-controlled legacy path in `_redirects` returns the expected 301 target.
- After the custom domain is verified, redirect the public `*.pages.dev` hostname to the permanent domain using a Cloudflare zone/account-level redirect rather than a Pages path rule.
- Root remains a neutral language gateway; no IP-forced language redirect.
- Canonical self-reference is on the production domain.
- Reciprocal hreflang is intact for genuine equivalents.
- Sitemap index and all child sitemaps use the production origin.
- NOINDEX and PRIVATE routes are excluded from sitemaps.
- Search Console Domain Property verified.
- Bing Webmaster Tools verified.
- Sitemap submitted to both.
- IndexNow configured only after the production backend/worker is available.
- Analytics configured with consent/privacy review.
- Core Web Vitals measured on real production URLs.
- Payment sandbox tested before live merchant credentials are enabled.
- Cloudflare preview (`*.pages.dev`) responses carry `X-Robots-Tag: noindex`.
- Private/account/assessment/checkout routes carry response-level `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- Add HSTS only after production HTTPS and redirect behaviour are stable; do not preload prematurely.
- Introduce an enforcing Content-Security-Policy only after inline-script/style dependencies are audited and tested.

## Payment gate
Do not enable live payment solely from browser code. The production backend must create payment intents/orders and verify provider callbacks server-side before granting entitlements.

## Rollback
Keep the pre-cutover commit/tag. If canonical/DNS/hosting validation fails, restore the prior deployment while preserving the purchased domain configuration for diagnosis.
