# Historical Authority Recovery — Bertina Production

Status: Active recovery control  
Canonical origin: https://drjavadrezazadeh.com  
Historical website origin date: 2022-11-18

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
9. HTTPS/www host consolidation stays deferred until a publicly trusted certificate is installed and strictly verified.

## Current evidence

Historical Google Search Console data recovered eight old URLs from the pre-expiry site:
- `/publications/` — already maps one-hop to `/en/publications/`.
- Six former carpet/gabeh product URLs — confirmed by the owner as legitimate old store inventory and consolidated to the historical shop archive.
- `/wp-content/uploads/2022/12/مقاله-اول.pdf` — review-only until the original document or a verified equivalent is recovered.

The owner has also confirmed that the previous shop sold books and carpet/kilim/gabeh products. Unknown product URLs remain unmapped until backlink or archive evidence identifies them.

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
