# Production Domain Cutover Runbook

Target production origin: `https://drjavadrezazadeh.com`

This runbook is intentionally prepared before domain purchase. Do not run the write-mode cutover until DNS, TLS and hosting are ready.

## Pre-cutover
1. Acquire the domain.
2. Decide the canonical host: apex `drjavadrezazadeh.com` is preferred; redirect `www` to apex with 301.
3. Configure HTTPS and verify certificate renewal.
4. Configure hosting/CDN and a staging preview.
5. Configure production security headers at the hosting/CDN layer.
6. Verify that private/authenticated routes are not exposed as public static assets.
7. Keep payment credentials and backend secrets outside Git.

## Dry run
```bash
node scripts/domain-cutover.mjs https://drjavadrezazadeh.com --dry-run
```

Review every file that would change.

## Atomic URL cutover
```bash
node scripts/domain-cutover.mjs https://drjavadrezazadeh.com
node scripts/seo-regression.mjs
```

The cutover changes canonical URLs, hreflang targets, structured-data IDs/URLs, Open Graph URLs, sitemap URLs and the robots sitemap declaration where the current GitHub Pages origin appears.

## Required production checks
- HTTPS 200 on root, /fa/ and /en/.
- HTTP -> HTTPS 301.
- www -> apex 301.
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

## Payment gate
Do not enable live payment solely from browser code. The production backend must create payment intents/orders and verify provider callbacks server-side before granting entitlements.

## Rollback
Keep the pre-cutover commit/tag. If canonical/DNS/hosting validation fails, restore the prior deployment while preserving the purchased domain configuration for diagnosis.
