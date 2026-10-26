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

## OPcache status confirmed by owner

**26 October 2026:** The owner explicitly confirmed that **OPcache has already been enabled automatically and remains enabled** in Bertina's PHP Selector. Do not repeatedly ask the owner to enable it, reset domain/account extensions, or toggle it without evidence of a concrete malfunction. This confirmation resolves the owner's extension-selection question; no additional PHP extension is required to continue source development.

At the one final owner-authorised acceptance window, distinguish the owner's confirmed selector setting from separately observed **web-SAPI usage**, memory utilisation and timestamp/invalidation behaviour. Such a diagnostic is about measuring existing configuration, **not an instruction to change OPcache**. Prioritise route-by-route resource budgets, safe cache headers, LiteSpeed response behaviour and Iranian connection latency next.

## Bertina PHP Selector extension selection — owner-provided panel, 26 October

The owner provided the list of **available** cPanel PHP Selector extensions. This listing contains names such as `opcache`, `apcu`, `redis`, `memcached`, `brotli`, `imagick`, `intl`, `mbstring`, `pdo_mysql`, `mysqlnd`, `gd` and `vips`. Availability on the list **does not indicate activation** for the production domain or PHP web SAPI.

**No extensions are required to continue Git development. No DB schema or PHP Selector action was performed.** At the owner-authorised host verification stage, prefer domain-specific settings for `drjavadrezazadeh.com`, not irreversible account-wide changes impacting other sites.

- **OPcache is confirmed enabled in the PHP Selector by the owner; keep the setting unchanged.** At final QA only, observe whether the web SAPI is using it effectively, with sensible memory and release invalidation. This is an observation task, not an activation request. PHP-FPM, LiteSpeed LSAPI and CLI may expose different options.
- Preserve the website's actually needed `pdo_mysql` / `mysqlnd`, `mbstring`, `intl`, `curl`, `openssl`, `fileinfo`, `gd`, `zip`, `zlib` and existing journal/OJS dependencies. Optional `imagick` should follow real image processing use rather than be enabled reflexively.
- **Do not indiscriminately enable `redis`, `memcached` or `apcu`**. These provide no automatic site speed improvement unless an explicit, permissioned application cache consumer is configured. An enabled PHP `redis` extension does not install/start a Redis server. Any later use must preserve the existing single mother database and segregate private/customer data.
- The PHP Selector's `brotli` extension does not itself enable HTTP Brotli compression in LiteSpeed. That is a web-server response/header concern, independent of PHP extensions.
- Avoid performance overhead from live request-level `xdebug`, `newrelic`, `elastic_apm` and profiling agents unless an authorised, narrowly scoped diagnostic is deliberately needed. Never disable required PHP security, crypto, JSON or core modules as a speed shortcut.
- Account settings may apply to all hosted domains by default; check **Per Domain Settings** first.

**Information still needed at final host gate:** whether `opcache` is presently checked/enabled **for this domain** and whether LiteSpeed's full-page cache feature is licensed/configured for the account. No credentials, phpinfo dump or access to phpMyAdmin need be posted here.

## Further source corrections after OPcache confirmation (26 October)

The owner confirmed **OPcache already active**. No PHP Selector changes, database edits, production tests, release builds or deployments followed that confirmation.

Additional source-only refinements:

- **Persian headings and mobile reading flow:** `assets/css/journal-v2.css` now overrides the legacy Tahoma rule that loaded after `style.css`; `assets/css/store-premium-editorial-2026.css` consistently applies the locally hosted Persian display face to store headings H1–H6. Both preserve body text, English scholarly pages, cover art and commerce behavior. This corrects source precedence, not yet a measured visual outcome.
- **Network-transfer reduction:** `assets/js/site-extras.js` no longer imports the 20-KB mobile shell on journal/private paths where the module would immediately exit. It skips public concierge assets on account, login, assessment and checkout shells and avoids update-notice CSS/JS for first-time visitors without a controlling service worker. Decorative portrait tilt is disabled for browsers explicitly requesting data saving or reporting 2G. Public/mobile navigation and protected modules remain unchanged.
- **Whole-site SEO audit cost:** `scripts/master-semantic-geo-audit.mjs` now reuses a single parsed page-evidence record for reciprocal hreflang validation rather than re-reading the same HTML repeatedly. No automatic canonical rewrite or submission to Google is attempted.
- **Final-only acceptance contracts:** `tests/iran-first-bilingual-presentation-contract.test.mjs` covers local licensed fonts, RTL and LTR behavior, private-route transfer guards and coverage assertions; other existing suites cover browser comments, admin evidence alarms, immutable CSS and protected paths. These files have not been executed.

After source development concludes, measure **all representative route families**, not merely the language gateway. Specifically require Iran-representative mobile results, full waterfall accounting, Bertina HTTP cache headers and negative tests that public assets never cache personalised data.

## Private owner workspace — source-level request budget reduction

The original Persian administrator shell includes **22 separately linked CSS files** and its English equivalent includes **20**. All inspected style sources had no `@import` or `@charset` directives, and their only examined `url()` reference was the root-absolute local display font.

`scripts/release-bundle-owner-styles.mjs` now packages **one ordered CSS stylesheet per admin language**, preserving existing cascade order and rewriting links **only in the sanitized owner-approved release artifact**. The original 22/20 CSS sources remain available, and all owner form IDs, report modules, MFA gates, private `noindex` tags and canonical page URLs are unchanged. The two bundles have content-SHA256-qualified names. LiteSpeed's `.htaccess` and the existing Service Worker now permit immutable browser reuse of **those public stylesheet bytes only**. The owner dashboard HTML, sessions, API, payment, JREI data and personal information remain uncacheable.

The build deliberately refuses unexpected CSS `@import`/`@charset` or relative `url()` statements rather than silently changing resource paths. Final-only source acceptance was staged in `tests/release-bundle-owner-styles.test.mjs`; **it has not been executed**. Reducing twenty-plus CSS request round trips to one is a source-level architectural change, not yet evidence of faster real-page Core Web Vitals. Actual CSS transfer sizes, compression, and mobile waterfall must be verified during consolidated final QA.

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
