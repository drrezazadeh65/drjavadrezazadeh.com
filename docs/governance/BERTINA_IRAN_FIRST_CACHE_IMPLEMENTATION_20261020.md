# Bertina Linux / LiteSpeed / Iran-First Performance — v5.2+ implementation directive and evidence ledger

**Owner supplied:** 20 October 2026. **Repository/branch:** `drrezazadeh65/drjavadrezazadeh.com` · `migration/bertina-linux6`. **Scope:** post-release #415 performance and security optimization. **Policy:** forward-only, no parallel caching/deploy architecture, no auto-deployment, no recurring scheduled tasks.

## Verified release and observation boundary
- **Previously released and observed:** `3bdfcf9583b802f54b05e1237e3cec3e76300ea1`; [Deploy to Bertina #415](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39389736872) succeeded. Its origin checksum accepted **898 files**, public apex/www TLS was **6/6**, dashboard privacy was **12/12**, historic path checks **146/146**, browser **215/215**. [Post-release anonymous operational acceptance](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39390174781) passed **17 public checks**. These do **not** certify real payment settlement, JHELA confidential submission, the new cache code, or restoration from independently tested backups.
- **Current source work after #415:** Service Worker policy v2.2 and accompanying synthetic behavior tests. **Not deployed**; only a future guarded owner-controlled release may install the source branch update.
- Bertina cPanel **CLI** owner observations: PHP **8.3.35**, Zend OPcache enabled (128 MB; `validate_timestamps` enabled; recheck 2 seconds), no loaded Redis, Memcached, APCu or igbinary PHP extensions. The CLI SAPI is **not** necessarily the runtime SAPI serving PHP requests.
- Owner HTTP diagnostics showed HTTP/2 200, HTTP/3 `alt-svc` advertised (not independently negotiated), public `Cache-Control: public, no-cache, must-revalidate`, ETag / Last-Modified present; LiteSpeed **server-side cache unconfirmed**. Brotli availability, cache hit ratio, Iranian mobile latency and field Core Web Vitals have **not** been independently measured.
- This report records the owner's measured observations and confirmed repository policies, not hosting assertions derived from marketing.

## Existing systems reused
`sw.js`: JR cache family version stamped to the **exact release SHA** inside the assembled deployment by `scripts/stamp-bertina-release.mjs`, network-first public documents and mutable CSS/JS/JSON, network-only private routes, approved offline media/shell, and purging only obsolete `jr-site-*` cache families. `.htaccess`: canonical HTTPS, historic semantic redirects/410, conditional Brotli/Deflate, public revalidation and private no-store/noindex. `platform/ecosystem-registry.json`, `assets/js/site.js`, `scripts/pwa-private-cache-audit.mjs`, `tests/private-cache-behavior.test.mjs`, `scripts/performance-source-audit.mjs` and existing GitHub read-only compression/PHP diagnostic workflows are the sole existing authorities. Existing build/deploy workflow `.github/workflows/deploy-bertina.yml` is frozen; **do not replace**.

## Proven defects and bounded implementation after #415
1. Service Worker treated `?v=...` and every font path as immutable, even though filename content identity was not established. **Fixed:** only filename-digest candidates use cache-first; ordinary images and fonts revalidate through the existing network-first public runtime. HTTP `immutable` headers remain **off** until true content fingerprints and compatible release invalidation are verified.
2. Encoded or double-encoded private URL segments could evade the direct path-prefix check. **Fixed:** normalize safely and fail closed on ambiguous/un-decodable/traversal paths before any Cache Storage read/write.
3. URL alone did not guard against otherwise public responses with session-related `Set-Cookie`, `Vary: Cookie/Authorization/*`, attachments or partial content. **Fixed:** deny their Cache Storage persistence; retain existing final-URL redirect and `Cache-Control: private/no-store` checks. Cookie header visibility may be restricted by browser Fetch semantics, so server-side private no-store remains essential.
4. A failed Cache Storage open/match/put could make a successful network response fail or return stale content. **Fixed:** treat cache I/O as best effort, prioritize successful live responses and evict old cache entries after failed writes or unsafe responses.
5. Regression fixtures now cover encoded private paths, risky headers, partial/404 responses, mutable font/image freshness, actual filename hash patterns, quota and storage failures. **One intermediary CI revision failed** on an uncovered font interception branch; the branch and tests were corrected before final certification.

## Explicitly deferred — evidence-driven host optimization
- **LSCache:** verify active LiteSpeed cache support on this hosting **account**, authenticated/cookie bypass, purge mechanism and `Vary` before any server full-page caching. Absence of an `X-LiteSpeed-Cache` header alone proves nothing. Do not install WordPress caching plugins; this is not WordPress.
- **Redis / Memcached / APCu:** extensions were absent in CLI and the application has no demonstrated object-cache need. Do not install/inject sidecars or introduce independent data storage. Reassess only with web PHP evidence and measured database bottlenecks.
- **OPcache:** leave the working host configuration unchanged absent safe SAPI-specific performance evidence.
- **Compression:** use the existing `.github/workflows/http-compression-diagnostic.yml` and strict TLS public observations to verify actual Brotli/gzip before adjusting conditional `.htaccess` directives.
- **Real user speed in Iran:** request measurements from real Iranian mobile networks/controlled field RUM with consent and explicit test conditions (TTFB/LCP/CLS/INP, fonts, images, third-party dependencies). Do not invent gains, Core Web Vitals or regional speed percent changes.
- **Immutable headers:** do not assign one-year browser cache to ordinary assets, query-string versions, HTML, API, PWA worker or private pages. Only genuinely content-hashed filenames plus guaranteed URL mutation qualify.

## Acceptance and deployment boundary
- Run `node --check sw.js`, `node --test tests/private-cache-behavior.test.mjs`, `node scripts/pwa-private-cache-audit.mjs`, `node scripts/performance-source-audit.mjs`, plus existing SEO/GEO, browser, mobile, privacy and release-policy regressions **at the same final SHA**.
- Anonymous live checks must verify apex/www trusted TLS, `sw.js` release stamp, `/fa/` and `/en/`, effective public/private HTTP cache headers, `/api/` authorization denial and sensitive route isolation. A source-only pass is not live certification of a future release.
- Existing PHP payment, journal, student, assessment, admin MFA and scientific engines remain untouched. No automatic FTP, database reset/migration, service activation or new recurring automation in this performance work.
- If any CI test fails, the **next performance release is NOT READY**; correct the defect and rerun. Owner explicitly triggers the same guarded one-click workflow when it is independently ready.

## Unrelated live limitations preserved transparently
- Student support `caseSchemaReady=false`, `privatePortal=false` on release #415; guest giving health flag true does not certify private safeguarding portal or case migration.
- JHELA manuscript intake remained `BLOCKED_BY_CONFIGURATION` in strict post-release smoke; technical host and security gates are required before confidential PDF acceptance.
- Checkout health reported enabled; actual gateway settlement, receipt, fulfilment, private author/editor review and scientifically validated Golden Talent/RCAS/BAHAR outcomes are separate proof obligations.
- This runtime cannot directly resolve the public domain; positive on-host observations in this ledger come from documented GitHub Runner TCP/CA verified executions. No independent Iranian speed measurement is available.
