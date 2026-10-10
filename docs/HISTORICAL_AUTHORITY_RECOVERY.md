# Historical Authority Recovery — Bertina Production

Status: Active recovery control  
Canonical origin: https://drjavadrezazadeh.com  
Historical website origin date: 2022-11-18  
TLS observation: Bertina reported Certum DV installed on 2026-10-11 at 00:42 Asia/Tehran; strict proxy-mediated apex/www transport requests pass. Independent origin-certificate and complete historical redirect certification remain pending.

## Objective

Recover legitimate historical authority from previous versions of this same domain without creating soft-404s, redirect chains, topical deception, fake inventory, or spam-policy risk.

## Non-negotiable rules

1. Never redirect an unknown historical URL to the homepage by default.
2. Never redirect historical public authority into private/noindex routes.
3. Use one-hop 301 redirects only when the destination is genuinely equivalent or a truthful consolidation page.
4. Preserve `/` directly and consolidate historical `/shop/` to `/fa/shop/`.
5. Legitimate former commerce that no longer exists may be consolidated into `/fa/archive/legacy-shop/` only when the archive explicitly contains the former material.
6. Unverified old URLs remain 404/review candidates until evidence exists.
7. Verified hacked/spam URLs use 410 rather than borrowing current authority.
8. Former book-product URLs should map to the exact current book page when identity is proven; do not send them to the carpet/gabeh archive.
9. Preserve active canonical HTTPS/apex consolidation. Exact public historical mappings must run first, so HTTP/HTTPS, apex/www and slash/slashless forms reach the verified destination in one 301.

## Current evidence

Historical Google Search Console data recovered eight old URLs from the pre-expiry site:
- `/publications/` — already maps one-hop to `/en/publications/`.
- Six former carpet/gabeh product URLs — confirmed by the owner as legitimate old store inventory and consolidated to the historical shop archive.
- `/wp-content/uploads/2022/12/مقاله-اول.pdf` — review-only until the original document or a verified equivalent is recovered.

The owner has also confirmed that the previous shop sold books and carpet/kilim/gabeh products. Unknown product URLs remain unmapped until backlink or archive evidence identifies them.

The registry contains 15 authority redirects and seven historical candidates. The six-product archive is a truthful discontinued-catalog consolidation; it does not reconstruct the original detailed product pages.

The supplied Ahrefs overview shows 359 referring domains for the domain scope and four for the www scope, with DR 0 and zero reported organic traffic/keywords. These are differently scoped summaries, not a target-URL inventory or proof of ranking recovery. The supplied Referring Domains link is inaccessible from this execution environment; Backlinks/Best by links target-URL evidence is still required to identify additional destinations.

Verified release evidence: PR #31 merged at `90d889c6`, the historical-date PR #32 at `724fcece`, and PR #33 at `882f6635`. Bertina deploy [38087632105](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38087632105) verified 553 managed files for `30b1dfc1`. Audited production base `c3a2fbb9` differed from that deployed commit only in excluded workflow YAML. Historical live run [38087711342](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38087711342) checked two former products, `/shop/` and the archive using certificate-bypassed origin requests; it did not certify all URLs or public TLS.

A strict proxy-mediated GET matrix against that deployed release completed 137 checks: 46 passed; 90 HTTP/www historical slash/slashless variants and one query check failed the direct-destination assertion because transport consolidation ran first. The source correction requires a new release and strict independent-runner verification before claiming the live chain is repaired. No merge or deployment is performed by this reconciliation.

## Data sources, highest confidence first

- Ahrefs Backlinks export with Target URL and referring-domain metrics
- Google Search Console historical page performance and URL Inspection
- Existing Bertina/Apache access and error logs
- Internet Archive snapshots
- old WordPress backups, media and sitemap files
- Bing Webmaster inbound-link data when connected
- verified owner records

## Ahrefs workflow

Export Backlinks (not only Referring Domains) with Target URL. Then run:

    node scripts/historical-backlink-import.mjs backlinks.csv recovery-report.json

The importer groups backlinks by historical target URL, counts referring domains, estimates an evidence score, and assigns a recovery action. No URL is auto-redirected solely because of a high score; semantic verification remains mandatory.

## 404 intelligence workflow

Export/download the Apache access log and run:

    node scripts/historical-404-log-analyzer.mjs access.log historical-404s.json

Prioritize URLs with external referrers, multiple referring domains, human-like requests, repeated crawler hits, and strong backlink evidence.

## Release gates

    node scripts/historical-authority-audit.mjs
    node --test tests/historical-authority-recovery.test.mjs

The Bertina Master SEO workflow runs both automatically.

After an authorized deployment, `.github/workflows/deploy-bertina.yml` runs:

    node scripts/historical-authority-live-verify.mjs historical-live-report.json

This script uses normal CA/hostname verification without certificate bypass, DNS overrides or redirect following. Its 137 GET checks cover all 15 registered mappings over four origins and both slash forms, each unique indexable/self-canonical 200 destination, canonical root behavior, a shop tracking query, and genuine 404 responses for an unknown product and the unresolved PDF. JSON evidence records the checked source SHA and network context; technical indexability is not proof of search-engine indexing.

Verification runs within the deployed release job after checksum/origin checks, avoiding a separate push race. The standalone workflow is read-only and manual with an active-branch guard, but dispatch discovery requires its definition on GitHub's default branch. Since `main` remains the older baseline and untouched, do not rely on `workflow_run` or independent manual discovery for a migration-only file.

## Current historical commerce consolidation

The following verified former products consolidate one hop into `/fa/archive/legacy-shop/`:
- فرش ماشینی کد 2-7801-8833
- فرش ماشینی کد 2-7801-9735
- فرش ماشینی کد 4301-4917
- فرش ماشینی کد 4301-5021
- گبه ماشینی کد 1009-2
- گبه ماشینی کد 3001-3283

The archive carries no current price, stock, offer or checkout claims.

## Future decisions

When the Ahrefs target-URL export is available:
1. identify all old landing pages with backlinks;
2. separate homepage/shop, books, academic content, former commerce, media/PDFs, taxonomy pages, and junk;
3. restore exact content where it remains useful;
4. map proven books to exact current book pages;
5. map consolidated legitimate commerce only to a page that actually contains its historical content;
6. leave unknown URLs 404 until verified;
7. use 410 only for verified junk/hacked/spam pages;
8. rerun Master SEO and Bertina deployment smoke tests after every redirect batch.
