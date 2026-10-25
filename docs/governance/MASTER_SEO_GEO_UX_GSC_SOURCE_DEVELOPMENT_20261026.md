# 2026-10-26 Master Search Console / SEO / GEO / UX Recovery — Source Development Record

**Repository:** drrezazadeh65/drjavadrezazadeh.com  
**Only development branch:** `migration/bertina-linux6`  
**Host:** Bertina PHP / LiteSpeed; canonical origin `https://drjavadrezazadeh.com`  
**Owner directive:** implement source changes first; **no intermediate tests, CI invocation, migrations, production checks or deployment**. Complete all feasible development, then run one owner-authorised integrated acceptance and publish separately.  
**Evidence tier:** owner-provided Search Console screenshots + inspected repository source, **not live server verification**.

## Search Console evidence — do not misinterpret

Owner screenshots dated 26 October 2026 show 30 clicks and 417 impressions for the selected three-month view. A separate report shows **14** pages described as `Crawled — currently not indexed`; one attempted validation shows **12 failed** examples and **2 pending** examples, with failure recorded 20 October. Examples visibly include `/fa/vip/university-selection/`, `/fa/vip/educator-development/`, `/fa/vip/golden-talent-signature/`, `/en/vip/research-publication/`, `/en/vip/educator-development/`, `/en/vip/university-selection/`, `/en/vip/academic-direction/`, `/en/vip/` and `/en/shop/`. Other examples not fully legible in the image must be obtained from a proper Search Console export before page-specific conclusions.

Additional Search Console notices concern `Excluded by noindex` and `Alternate page with proper canonical tag`. These are **not universally defects**:
- `noindex` on login, checkout, personal dashboards, confidential submission and other governed private routes is required.
- An alternate with a proper canonical may be expected for genuine duplicates or URL aliases. Do not rewrite a known self-canonical solely because Google listed a canonical exclusion.
- Cross-language pages represent independent Persian/English editorial products. Only equivalent, reciprocal, self-canonical, indexable routes belong in hreflang pairs.
- `feed.xml` is a syndication feed, not a normal HTML landing page. A Search Console exclusion is not evidence that the feed is broken or should be indexed as an article.
- `/journal/fa/reviewer-registration/` is a public information/interest page. Do not turn it into a private submission portal or expose review data to address an indexation warning.

Search visibility is a search-engine decision, not a deterministic result of source code. After publication, reassessment must use dated GSC URL Inspection and page indexing exports; **no guaranteed indexing or ranking is claimed**.

## Changes implemented at source level

1. Added `assets/css/jr-bilingual-semantic-flow-2026.css` for scoped `dir`, textual alignment, bidirectional content isolation, heading wrapping, overflow management and responsive reading.
2. Added low-specificity logical-content rules to shared `assets/css/style.css`, covering journal and public pages that do not run the optional site extras loader.
3. Shared public pages receive lightweight zero-specificity semantic rules directly from `assets/css/style.css`, avoiding late deferred-stylesheet insertion. Standalone Persian VIP pages link the dedicated semantic stylesheet in the HTML head; `site-extras.js` retains only the versioned moderated-community asset loader.
4. Retained the existing community authentication, owner feature gates, moderated publication and anti-abuse controls. Added stable read-side keyset pagination to `api/community.php`, safe public loading of older approved comments to `assets/js/community-comments.js`, bilingual pagination labels, recoverable request failure messages and supplementary CSS.
5. Updated `scripts/community-service-bundle.mjs` to reference the versioned community frontend assets without changing the opt-in/buyer-verification constraints.
6. Added distinct evidence-oriented methodological sections to the six Persian and six English VIP description pages without inventing outcomes, payment readiness, validated psychometrics, review certificates or personal research data.
7. Refined Persian VIP descriptions and linked the Persian standalone pages to the scoped semantic stylesheet.
8. Changed the Persian news archive's fifteen linked story-card titles from H2 to H3 beneath the collection's H2 and retained appearance in `assets/css/editorial-launch-2026.css` and `assets/css/jr-ecosystem-design-v2.css`.
9. Updated `<lastmod>` for modified VIP pages and the English VIP hub in `sitemap-services.xml` and `sitemap-en.xml`, and the corresponding child sitemap dates in the root index. No route/canonical/sitemap membership was removed.
10. Extended `llms.txt` with evidence-qualified public references to bilingual VIP and bookstore pages.
11. Added `scripts/master-semantic-geo-audit.mjs` as a **staged, read-only** source inventory for one final acceptance window, and connected its strict mode to the existing Bertina master SEO acceptance workflow. The scanner has **not been executed**.
12. Strengthened the English VIP hub's comparison and low-specificity VIP typography without changing established URLs. Versioned existing site/community resources and staged, but did not execute, compatible community pagination assertions.
13. Future source-only commits use `[skip ci]` because the repository's existing Actions may otherwise start automatically on push. No intentional/manual test was invoked in this development phase; **automatic runs from earlier unmarked commits were not audited or ruled out**.

## Verification gates to run only after development

**SEO + technical:** compare GSC exported affected URLs against the frozen URL manifest and route policy; HTML 200/301/404 semantics; a single descriptive H1 in main; heading hierarchy; useful copy with distinct intent; canonical and exact reciprocal hreflang; private noindex; sitemap URLs and actual lastmod; robots policies; crawlable public resources; JSON-LD parser and provable entity identity; internal links; mobile layout; HTTP status, redirect chains, feed/XML content type.

**GEO / scientific integrity:** clear author identity, evidence/provenance, distinguish current service from provisional research framework, FAQ extractability, accurately scoped `Service`, `Person`, `Article`, `BreadcrumbList` structured data only where supported. Never add fabricated `Review` or `AggregateRating` solely for search rich-result eligibility.

**Community:** independently confirm owner-provisioned five-table schema, account verification, `JR_COMMUNITY_ENABLED` and `JR_COMMUNITY_MIGRATION_APPROVED` are intentionally enabled **only after** acceptance and security/privacy authorization. Verify GET accepted 20-row pagination and stable cursors, all-page approved rating aggregates, POST CSRF/Origin checks, rate limits, anti-spam, pending/private separation, moderator MFA, reply state transitions, owner erasure and accessible mobile UIs. Services do not collect unverified purchaser star ratings.

**UX and performance:** 320 / 390 / 430px Android, iOS-sized touch targets, tablet and desktop; RTL/LTR mixed-script text, form affordances, large text and assistive technology; critical page Core Web Vitals LCP/INP/CLS from field data where available; caching, compressed assets, canonical assets and backend failure behaviour.

**Operations:** source audit script, project SEO regressions, security tests, PHP lint, isolated fixture database, authenticated browser journeys and rollback-capable Bertina final deployment gate. No actual database migration in this source-development phase.

## Explicitly unresolved / evidence required

- Whether the production community feature flags, PHP configuration, authenticated sessions, comment writes and moderator UI are functional is **unknown**. Git commits do not prove these.
- Whether all 14 Google-excluded pages become indexed is unknowable from code and must be monitored after Google re-crawls.
- Search Console URL Inspection, complete CSV exports, HTTP response headers, production redirect behaviour and Core Web Vitals have **not been live-tested** during this development-only phase.
- Some pages outside the SEO-focused touched set may still need manual heading and alignment repair after the final read-only inventory runs.
- No independent final security or accessibility sign-off; no claims of live payment, journal submission or JREI model activation are made.

**Release state: SOURCE CHANGES ONLY — NOT QA-PASSED, NOT DEPLOYED.**
