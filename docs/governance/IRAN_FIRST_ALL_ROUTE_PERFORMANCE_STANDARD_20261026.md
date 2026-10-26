# Iran-First Whole-Site Performance Standard — 26 October 2026

**Project:** drjavadrezazadeh.com · **canonical branch:** `migration/bertina-linux6`  
**Scope:** root language gateway, every published `/fa/` and `/en/` article and service, store, JHELA, academic projects, owner tools and private dashboards.  
**Authority:** owner-directed, forward-only development; no intermediate tests, CI invocations, production changes, database updates or deployment. Source-only code now.  
**Priority order:** functional privacy/security + crawlable content > fast and visually stable first screen > readable mobile UX > optional decorative and third-party modules.

## A measurable global objective, not an unsupported guarantee

- **Aspirational lab goal:** Lighthouse mobile Performance **100** on *every route class*, rather than gaming only the language gateway. A universal score of 100 cannot be guaranteed across network speeds, devices and lab conditions.
- **Field CWV good thresholds at p75:** LCP ≤ **2.5 seconds**, INP ≤ **200 ms**, CLS ≤ **0.1**; each must be checked with real-user evidence or an appropriate search-console/CrUX field source where representative data exist. Page-specific and sitewide assessment are both relevant to Google. No actual live Iranian field metrics are available yet.
- **Device/network matrix for the final owner-authorised check:** mid-range Android and lower-end Android at 360–430 px on a real Iranian mobile connection where consented field measurements are possible; slow 4G / constrained RTT synthetic profiles; iOS Safari; tablet; desktop; logged-out and authenticated routes.
- **Sitewide coverage:** `scripts/performance-source-audit.mjs --json` now inventories stylesheet, script and eager-image source costs for *all* HTML pages, including pages the older audit skipped because they were noindex. `scripts/master-semantic-geo-audit.mjs` remains SEO/hreflang/canonical-oriented. Both are **staged, not executed**.
- **No universal 100 from a static audit:** HTTP waterfall, server TTFB, PHP SAPI, JPEG/WebP transfer size, actual cache headers and CWV require final live evidence.

## Implementation in current canonical source

1. **One locally hosted Persian display font:** `Vazirmatn` variable WOFF2, pinned with its content digest and upstream SIL OFL licence; used on H1–H6 without depending on blocked external font CDNs. Ordinary body typography remains lighter. The fingerprinted font is safely browser-cacheable.
2. **Cross-page CSS browser reuse:** the existing secure Bertina release assembler now writes digest-qualified aliases for the common `style.css` and `public-v2.css` and rewrites HTML link references in the sanitized artifact. The original assets remain available for legacy consumers. Server HTTP cache and existing Service Worker were updated to recognize *only* the approved content-digest CSS files as cache-first. All mutable CSS and JavaScript still revalidate; HTML and sensitive routes remain fresh/uncached.
3. **Less initial network contention:** existing `site-extras.js` queues noncritical analytics, concierge assistant, installed-app release notice, supplementary footer modules and the exchange-rate information widget after the window load event and a bounded idle slot. Critical mobile navigation is deliberately left available without waiting for this idle phase.
4. **LCP resource priority:** primary photographic or academic hero assets retain their discoverable HTML URLs and high priority. Small 40×40/70×70 branding marks were demoted from high priority on JHELA and bilingual Golden Talent pages to avoid competing with the main editorial hero.
5. **Read-only final-only regression contracts:** `tests/private-cache-behavior.test.mjs`, `tests/release-fingerprint-core-styles.test.mjs` and source acceptance suites cover the distinction between digest-addressed static content and mutable/private responses; these have **not been run**.
6. **Source performance budgets across all pages:** existing `scripts/performance-source-audit.mjs` now groups per-route HTML, CSS, JS and eager-image costs and surfaces their top contributors instead of reporting only a global passing count. The raw byte counts do not claim Brotli or real network timings.

## Non-regression rule: visuals and SEO are co-equal to speed

The owner requires **all current visual effects to survive** performance work, with a richer luxury identity where the effects can be implemented efficiently. Do not remove cinematic approved imagery, homepage portrait pointer tilt, the 15 visual banners, premium gradients, journal artwork, motion-enabled product cards, mobile app shell or branded storefront effects merely to increase a Lighthouse result. Progressive enhancement must leave HTML headings, text, links and images available without JS, preserve their natural layout and retain the approved black/gold/ivory identity.

Source additions dated 26 October:
- `assets/css/style.css`: additive gold illumination, subtle depth on service/news/authority/product cards, stronger focus indicators and continued use of existing transform effects.
- `assets/css/store-premium-editorial-2026.css`: brass-edged book bibliography cards with subtle hover lighting.
- `assets/css/journal-v2.css`: restrained scholarly card depth and navigation highlights.
- `assets/css/jr-bilingual-semantic-flow-2026.css`: Persian VIP gold focus and hover detailing.
- Effects are restricted to genuine hover/fine pointer devices and avoid nonessential continuous animation. `prefers-reduced-motion: reduce` continues to be respected. There is no new third-party JS, tracking, imagery, hidden-until-visible SEO content or constant compositing budget.

Release acceptance must compare screenshots/video of key effects to the previous approved build at mobile, tablet and desktop resolutions, including touch devices, pointer hover, keyboard navigation and reduced-motion settings. **These tests are deferred and not executed.** Lab 100 is a target only; removal of functioning design to game a numeric score would be a regression.

## Existing Bertina evidence and host verification requests

The previously reviewed `docs/governance/BERTINA_IRAN_FIRST_CACHE_IMPLEMENTATION_20261020.md` records owner-provided PHP CLI 8.3.35 with **OPcache enabled, 128 MB and 2-second timestamp revalidation**. Redis, Memcached and APCu were **not installed in the CLI** at that time. This is **not evidence of the web-facing LSAPI/PHP SAPI**. The earlier documented compression diagnostic observed **Brotli and gzip** on sampled static/public paths; HTTP/2 was observed and HTTP/3 was advertised by Alt-Svc, but actual HTTP/3 negotiation and LiteSpeed full-page cache were **not established**.

Ask Bertina support or inspect cPanel/LiteSpeed configuration **at final acceptance**, without installing a second proxy/cache stack:

- Confirm web-serving **PHP OPcache**: loaded, enabled, not memory-exhausted, correct web SAPI, timestamp handling compatible with the guarded deploy.
- Confirm **LSCache** account-level entitlement and allowed public-cache configuration. Static HTML often already exists as a file; do not turn on full-page caching for API, JREI personalized responses, journal confidential documents, login, checkout, profile, dashboards, student data or payment results.
- Confirm **HTTP/2** and *negotiated* HTTP/3 where available, active Brotli/gzip, ETag/Last-Modified, immutable aliases with real `Cache-Control` headers, and absence of proxy-level cache override that would store user-specific responses.
- Confirm origin routing and Iran connectivity realities with legitimate, consented tests; do not assume that CDN marketing or country of hosting guarantees low regional latency.
- No new PHP extension is currently a demonstrated prerequisite for static-site or heading performance. **OPcache is the only priority PHP extension to ensure active** in the production SAPI. Redis/Memcached/APCu are optional only if *measured* dynamic database or repeated computation is a bottleneck, with an approved integration and no parallel mother database.
- Keep Cloudflare removed as previously ordered. Do not add third-party JavaScript, font libraries, cross-origin scripts or unreviewed performance plugins.

## Final-owner QA matrix, after coding is complete only

| Route class | Representative routes | LCP and render critical path | Interaction and privacy |
| --- | --- | --- | --- |
| Language gateway | `/` | local fonts, early portrait, CSS | functional language choice |
| Persian/English home | `/fa/`, `/en/` | one hero high priority, smaller shared CSS, deferred optional JS | mobile dock & install button |
| Articles/News | `/fa/akhbar/`, `/fa/rahnamaha/`, `/en/news-insights/` | content visible without JS, lazy offscreen images | moderated comments only if enabled |
| Store | `/fa/shop/`, `/en/shop/` | approved cinematic hero, crawlable static book metadata | payment/cart **no-store**, checkout not cached |
| VIP and services | `/fa/vip/`, `/en/vip/`, `/fa/khadamat/`, `/en/services/` | lightweight typography, content H1–H3, no unexpected third-party requests | availability/booking live gates |
| JHELA | `/journal/`, `/journal/fa/` | first meaningful wordmark, optimized hierarchy | author/reviewer private routes no-store |
| Golden Talent / RCAS / BAHAR | public introductions in both languages | resource-specific heroes, no excessive priority hints | research status, no personal answer in cache |
| Dashboards and authentication | `/fa/customer-dashboard/`, `/en/account/`, private tests | quick shells without blocking external assets | no browser/shared storage of personal responses |

**Success evidence needed for release:** no source regression, full protected-route coverage, per-URL lab profile, representative Iran field conditions, enabled-host web PHP diagnostics, cache behavior on Bertina after a guarded release and a practical rollback plan. Aim to optimize every page rather than forcing arbitrary changes to fabricate a Lighthouse score.

## Reference standards (current as of 26 October 2026)

- Google Search Central, [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) and [Page Experience](https://developers.google.com/search/docs/appearance/page-experience): current SEO interpretation and p75 targets.
- Chrome/Web.dev, [LCP request discovery](https://developer.chrome.com/docs/performance/insights/lcp-discovery), [Fetch Priority](https://web.dev/articles/fetch-priority): prioritize the first meaningful image, not all images.
- Web.dev, [Back/forward cache](https://web.dev/articles/bfcache), updated October 2026: instant back/forward navigation can be important on weaker networks.
- LiteSpeed [Cache basics](https://docs.litespeedtech.com/lscache/basics/): cache eligibility and private/public separation.
- PHP [OPcache installation](https://www.php.net/manual/en/opcache.installation.php): verify loaded web SAPI before changing PHP configuration.
- MDN, [Speculation Rules API](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API): progressive enhancement, but **do not prefetch confidential endpoints or indiscriminately spend Iranian users' bandwidth**. No speculative navigation was enabled in this source phase.

**Status: SOURCE DEVELOPMENT ONLY — NO TESTS, NO DEPLOY, NO VERIFIED SPEED GAIN.**
