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
5. **Owner-directed removal (2026-10-11):** six historical non-book product URLs and the retired archive now return 410 Gone. No public page, archive, internal link, or sitemap promotes the discontinued product category. Do not redirect its backlinks to unrelated academic services or books.
6. Unverified old URLs remain 404/review candidates until evidence exists.
7. Verified hacked/spam URLs use 410 rather than borrowing current authority.
8. Former book-product URLs should map to the exact current book page when identity is proven; do not send them to the carpet/gabeh archive.
9. Preserve active canonical HTTPS/apex consolidation. Exact public historical mappings must run first, so HTTP/HTTPS, apex/www and slash/slashless forms reach the verified destination in one 301.

## Current evidence

Historical Google Search Console data recovered eight old URLs from the pre-expiry site:
- `/publications/` — already maps one-hop to `/en/publications/`.
- Six confirmed non-book historical commerce URLs — now deliberately retired with 410 Gone after the owner's explicit instruction to remove their public representation.
- `/wp-content/uploads/2022/12/مقاله-اول.pdf` — review-only until the original document or a verified equivalent is recovered.

The owner has also confirmed that the previous shop sold books and carpet/kilim/gabeh products. Unknown product URLs remain unmapped until backlink or archive evidence identifies them.

The active registry now contains nine semantic 301 redirects, six retired 410 product candidates and one unresolved historical PDF for review. The removed archive is no longer indexable or included in the public sitemap.

The supplied Ahrefs overview shows 359 referring domains for the domain scope and four for the www scope, with DR 0 and zero reported organic traffic/keywords. These are differently scoped summaries, not a target-URL inventory or proof of ranking recovery. The source summaries do not contain a target URL for each backlink. A Backlinks/Best by links export with Target URL, Source URL, source domain, follow/nofollow and DR is required before making additional URL-specific decisions. No new redirect may be generated merely to recover an impressive raw domain count.

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

This script uses normal CA/hostname verification without certificate bypass, DNS overrides or redirect following. Its live GET checks cover nine registered semantic 301 mappings, the retired 410 routes over four origins and both slash forms, each unique indexable/self-canonical 200 destination, canonical root behavior, a shop tracking query, and genuine 404 responses for an unknown product and the unresolved PDF. JSON evidence records the checked source SHA and network context; technical indexability is not proof of search-engine indexing.

Verification runs within the deployed release job after checksum/origin checks, avoiding a separate push race. The standalone workflow is read-only and manual with an active-branch guard, but dispatch discovery requires its definition on GitHub's default branch. Since `main` remains the older baseline and untouched, do not rely on `workflow_run` or independent manual discovery for a migration-only file.

## Current retired-commerce boundary (2026-10-11)

The six previously recognised non-book product URLs are retained only as internal historical identifiers for exact 410 Gone rules. The old public archive HTML has been deleted, its sitemap listing removed and its former public route now also returns 410. For URLs genuinely withdrawn by the owner, SEO authority is not assumed transferable to unrelated pages.

The former root `/shop/` is a different case: it remains a one-hop 301 redirect to `/fa/shop/`, the active bookshop. Former book and scholarly URLs must be assessed individually and mapped to an equivalent current route only when the identity and intent are supported by evidence.

A release must pass `scripts/public-retired-commerce-audit.mjs`, the historical-authority tests and a trusted-TLS live response matrix. A 410 rule is a deliberate removal signal, not an assurance that all previously earned link equity is recoverable.

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
