# GSC indexing triage — owner-run, bounded, direct API
**Branch:** migration/bertina-linux6 · **Property:** https://drjavadrezazadeh.com/ · **Date:** 2026-10-21

## Purpose and guarantee
Investigate pages that Google has *not* indexed without confusing eligible public pages with protected noindex/private pages, historical 410s or legitimate alternate canonicals. The existing direct Google OIDC/WIF connection is reused. No GSC Wizard, new service account, new GitHub Action, custom Google credentials, API write, sitemap submission or production deployment is needed.

The official Search Console URL Inspection API offers one-URL-at-a-time status. It does **not** expose the site's property-wide Page Indexing reasons or a total inventory of every excluded URL. Its results describe Google's indexed version, not a live crawl or an approval to submit for indexing.

## One owner-run diagnostic test
1. Visit the existing workflow:
   https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/google-search-console-sync.yml
2. Select **Run workflow**, branch **migration/bertina-linux6**.
3. Set **indexation_triage = true** and **sample_size = 90**.
4. Run once (read-only) from GitHub account `drrezazadeh65`. Both workflow and Python enforce the exact branch and owner actor. Check Google Search Console OIDC and GA4 verification jobs. Push-run defaults to false.
5. Read the result from the job's **GSC_INDEXATION_TRIAGE=OBSERVED** summary: total sampled, grouped indexing coverage, separate counts for services, guides, news, journal and other pages, Google-selected canonical self/other/unknown and availability of last-crawl timestamps.
6. Keep the exact Commit SHA and timestamp. Do not treat partial API failures, skipped steps, empty metrics or unauthenticated errors as successful indexing verification.

Only source-approved public same-origin HTML routes listed in the existing XML sitemaps are eligible. Deterministic, balanced sampling helps detect *types* of problems across the site but is not a statistically representative population estimate. No Google result for any specific URL is logged and no raw URL inspection response or token is saved.

## Independent complete Google Page Indexing UI check
In your Search Console's exact URL-prefix property, open **Indexing → Pages** and read the actual Indexed/Not indexed totals and breakdown by **Why pages aren't indexed**. Inspect examples for **Crawled – currently not indexed**, **Discovered – currently not indexed**, alternate or duplicate canonical, not found, soft 404, forbidden, server errors and noindex. Compare actual Google-selected vs declared canonicals via per-URL inspection. Record observation date and whether values are from Google UI, API samples, the site's source, or a third-party estimate.

For each issue:
- public indexable canonical URL absent from Google: inspect content and internal links first; avoid blind repeated submission;
- Google-selected alternate canonical: verify exact source HTML, reciprocal hreflang, redirect targets and genuine near-duplicate content;
- legitimate member-only endpoints, purchase pages and scientific assessment outputs: KEEP noindex/no-store;
- verified permanently retired product URLs: KEEP accurate HTTP 410;
- crawl failures or incorrect HTTP 4xx/5xx on intended public URLs: repair origin only after independently verifying status;
- low-value/near-duplicate articles: consolidate or improve in place while preserving the frozen public URL contracts;
- sitemap entries: 197 distinct public URLs in six approved source sitemaps at the 2026-10-21 baseline; this is source parity, not indexed-count parity.

## Exit criteria
Produce one dated read-only evidence record with real Google indexed vs excluded totals, per-reason counts, 90-URL sample-by-section counts, source SHA and *named public URLs needing legitimate remediation* identified from owner Search Console UI. Then fix only demonstrated defects and rerun the full release gates **once** at the accepted final SHA before owner-deploy.

No broad "request indexing all", no mass disavow, no redirect-all-404-to-home, no deletion of old SEO assets and no GTM/Clarity activation solely because GSC is reachable.
