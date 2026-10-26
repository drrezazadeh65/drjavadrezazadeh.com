# JR Cache Standard v2.2 — Bertina Linux

Status: production cache contract  
Scope: Bertina Linux/LiteSpeed-compatible HTTP cache, Service Worker/Cache Storage, PWA, browser cache and strictly non-stored private content. Implementation: [Bertina Iran-first evidence ledger](docs/governance/BERTINA_IRAN_FIRST_CACHE_IMPLEMENTATION_20261020.md).

## Core rules

1. **Fresh HTML wins over cache.** Public documents are network-first and use Fetch `cache: "reload"` while online. Cache Storage is only an offline fallback.
2. **Mutable code is never allowed to hide a deploy.** CSS, JavaScript, JSON, and manifests are network-first with browser HTTP-cache bypass while online.
3. **Private and transactional routes are never persistently cached.** Login, registration, accounts, assessments, dashboards, checkout, consultation requests, and other personal surfaces use `no-store`.
4. **Immutable means actual filename content identity.** Only asset URLs with sufficiently strong filename content fingerprints may use Cache Storage cache-first. A query parameter such as `?v=` or a stable font filename is not proof of immutability.
5. **Unversioned media is fresh-first.** Replacing an image at the same URL must become visible without requiring the user to clear cache.
6. **Service Worker updates bypass the HTTP cache.** Registration uses `updateViaCache: "none"`, checks for updates on every page load, calls `skipWaiting()`, and claims clients immediately.
7. **Exact-release cache family.** The Bertina assembler stamps `sw.js` to the immutable commit SHA; activation removes older `jr-site-*` families and never touches other apps' caches.
8. **Members receive app-like speed without caching personal data.** Shared shell assets may be cached; authenticated/private responses remain `no-store`.
9. **No manual cache clearing is part of the normal release process.** Public changes must become visible on ordinary navigation/reload. The existing owner-controlled Bertina deployment stamps the assembled worker to the exact approved SHA; the retired main-branch cache-writer does not publish.
10. **Bertina is the current HTTP authority.** `.htaccess` supplies public conditional revalidation and private no-store/noindex where the host honors its directives. LiteSpeed full-page caching, Redis/Memcached availability and Brotli delivery must not be asserted without account-specific evidence. The old GitHub Pages/`_headers` account is historical, not the active deployment contract.

## Policy matrix

| Resource class | Online strategy | Cache Storage | Target HTTP policy on controllable hosting |
| --- | --- | --- | --- |
| Public HTML | Network first, `cache:"reload"` | Offline fallback only | `Cache-Control: no-cache` |
| Mutable CSS / JS / JSON / manifest (including `?v=`) | Network first, `cache:"reload"` | Latest successful copy | `Cache-Control: no-cache` |
| Bertina-generated SHA256 filename CSS (`style.<digest>.css`, `public-v2.<digest>.css`) | Exact-digest cache first | Yes, public only | `public, max-age=31536000, immutable` after release verification |
| Genuinely content-fingerprinted images | Cache first | Yes | Potential `public, max-age=31536000, immutable` **only after** actual content-hash build verification and host delivery tests |
| Current unversioned images | Network first | Latest successful copy | Short cache only |
| Fonts | Cache first **only** for content-fingerprinted filenames; otherwise fresh first | Safe copies only | Mutable filenames revalidate; immutable only with verified digest-named assets |
| Login/account/private app | Network only, `cache:"no-store"` | No | `Cache-Control: no-store` |
| Checkout/payment | Network only, `cache:"no-store"` | No | `Cache-Control: no-store` |
| Service Worker | Update check on every load, `updateViaCache:"none"` | Browser-managed SW store | `Cache-Control: no-cache` |
| Offline shell | Precached | Yes | Versioned with SW cache family |

## Whole-site shared styles — source contract added 26 October 2026

The existing guarded `scripts/build-public-site.mjs` now invokes
`scripts/release-fingerprint-core-styles.mjs` after its previous security and
route validations. It copies the unmodified original `style.css` and
`public-v2.css` as content-SHA256-suffixed aliases, then changes stylesheet
`href` references in **every staged public/private HTML file** to the
content-addressed aliases. Subsequent releases build fresh paths whenever
the underlying CSS changes. The original mutable URLs stay in place for
unconverted dynamic consumers, with revalidation.

Only these two approved file names and the self-hosted Persian variable
font with a pinned digest-qualified name receive immutable HTTP hints in
the existing Bertina `.htaccess`. The Service Worker permits exact-alias
cache-first for the two approved CSS entries while retaining reload-first
navigation, unversioned CSS/JS, no-store and no offline replay for private
routes. The approved immutable font also uses the existing fingerprint-safe
font handling. Release SHA stamping, CDN removal and no parallel caches remain
unchanged.

**Status:** staged in source, no end-to-end build, browser cache,
LiteSpeed-host response or Iranian mobile check yet. Do not assert an
achieved performance improvement or permission to deploy. Existing source
and PWA regressions plus digest alias checks are to be executed once,
at the owner-authorised final acceptance stage.

## Automatic invalidation

The old `release-cache-reset.yml` writer is **retired** and does not change source code or deploy. `scripts/stamp-bertina-release.mjs` stamps `.public-site/sw.js` using the approved full Git commit SHA within the frozen owner-controlled release. Activation removes only older JR cache families. Mutable public content remains fresh-first with `cache: "reload"`, without relying exclusively on a worker update.

This mechanism cannot remotely erase arbitrary browser storage outside the site's own controlled Cache Storage, and it must never delete authentication state or user preferences. The contract is therefore cache obsolescence and revalidation, not destructive client storage clearing.

## Release invariants

- Do not add public HTML, CSS, or JavaScript back to `PRECACHE`.
- Do not use cache-first for mutable CSS/JS. Approved content-digest CSS release aliases are not mutable.
- Do not cache authenticated responses, account data, assessment results, payment state, or personalized API responses. Also reject cookie-sensitive `Vary`, `Set-Cookie` where browser-readable, attachments, partial bodies and redirects into private URLs.
- When a static asset is intentionally made immutable, change its URL when its content changes. Cache Storage failures must never defeat a successful online fetch.
- Preserve `updateViaCache:"none"` on every Service Worker registration surface.
- Every cache-policy change must pass Browser QA, SEO/GEO regression, link integrity, and PWA checks.

## User-facing freshness guarantee

While the user is online, ordinary navigation or reload should display the latest successfully deployed HTML, CSS, JavaScript, and unversioned media without requiring DevTools, cache deletion, or private browsing. Persistent caches are only used as offline fallback or for resources explicitly safe to retain.
