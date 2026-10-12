# GSC evidence — 2026-10-12

**Source:** Google Search Console via authenticated GSC Wizard connector. Dated observations, **not** a traffic/ranking forecast or a live source-of-truth replacement. Property: `https://drjavadrezazadeh.com/`.

## Property and performance

- Latest settled performance day observed: **2026-10-09** (Google Search Console data maturity; time basis America/Los_Angeles).
- Trailing 28-day GSC Search performance: **28 impressions, 2 clicks, 7.14% CTR, weighted average position approximately 7.11**. The very small number of impressions means the average position is not representative of a mature search presence.
- GSC Wizard indexing tracker checked at `2026-10-12T12:16:38Z`: **142 tracked, 117 indexed, 23 not indexed, 2 pending/unknown, 0 recorded warnings/errors**, tracker health score **86/100** (provider's internal health metric, not a Google ranking score).
- Tracker's 30-day coverage breakdown before the new inspection batch: **117 Submitted and indexed; 18 URL is unknown to Google; 5 Discovered - currently not indexed; 2 unknown**. This is a dated inventory and can change.

## Sitemaps and source/internal link parity

- GSC accepted/downloaded the index sitemap and `sitemap-fa.xml`, `sitemap-en.xml`, `sitemap-services.xml`, `sitemap-news.xml`, `sitemap-core.xml`, with **zero warnings and zero errors** in the reported sitemap rows.
- The sitemap table separately showed `indexed: 0` in sitemap content rows while the URL-inspection tracker was already reporting many indexed URLs. Treat these as differently scoped/provider-lagged counts, **not** proof that every sitemap URL is unindexed.
- Canonical GitHub source has **15 news URLs** in `sitemap-news.xml`; all **15** are also linked from `fa/akhbar/index.html`. These include 13 new 2026 scholarly/service/news articles plus two earlier entries. This is source-link parity, not an independent external HTTP 200 crawl.

## Fresh 13-article Google URL Inspection sample (same day)

**11 directly confirmed `Submitted and indexed`:**

1. `ecosystem-education-research-2026`
2. `professional-services-public-guide-2026`
3. `golden-talent-developmental-framework-2026`
4. `support-talented-students-opportunity-2026`
5. `bookstore-books-and-student-support-2026`
6. `customer-dashboard-one-account-2026`
7. `educational-guidance-evidence-based-2026`
8. `academic-research-editing-services-2026`
9. `teacher-schools-professional-learning-2026`
10. `humanability-language-assessment-framework-2026`
11. `how-to-use-educational-services-2026`

**2 direct inspections remain `URL is unknown to Google`:**

- `international-research-collaboration-2026`
- `ai-search-and-scientific-content-2026`

All these full URLs use `https://drjavadrezazadeh.com/fa/akhbar/{slug}/`. The first seven selected inspections explicitly returned equality between user-declared and Google-selected canonical. Other returned Google canonicals were the inspected self URLs. Do not infer these indexed URLs have organic clicks, high positions or broad topical authority.

## Action and safeguards

- Both unknown pages are present in existing source sitemap and news listing. No duplicate submission or false 404 redirect is justified solely by `URL is unknown to Google`. Recheck future URL Inspection/crawl evidence before editing.
- The registered canonical branch is `migration/bertina-linux6`. Any source-side SEO change must preserve public path, metadata, internal links, mixed-language canonical governance and latest valid design/media.
- `Ahrefs` free Domain Rating query was attempted via the connected tool but returned `Insufficient plan`. External referring-domain/broken-backlink coverage therefore remains **BLOCKED**; do not fabricate Ahrefs figures or subscribe/buy paid API access without owner authorization.
- No conversion/revenue uplift is claimed. Source-side service/VIP checkout routing fixes were committed but were not yet certified as a released Bertina production build at evidence recording.

## Acceptance status

`SOURCE-ECOSYSTEM-SEC-25` and SEO observations: **partially evidenced**, not complete. Live release parity, ongoing GSC/IndexNow outcomes, external broken-target matching, field Core Web Vitals, conversion attribution and scientific claims remain independent acceptance tasks.

## Same-day later URL-inspection recheck

Both previously `URL is unknown to Google` news posts now returned **`Discovered - currently not indexed`** in a fresh Google URL Inspection query on 2026-10-12:

- `international-research-collaboration-2026`
- `ai-search-and-scientific-content-2026`

This is a real change in Google's reported discovery state, **not** an index confirmation or organic impression. Retain existing self canonical, source news links and sitemap; do not create duplicate routes or unrelated redirects. The other 11 indexed article proofs above remain separately evidenced.
