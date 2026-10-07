# JR Cache Standard v2.1

Status: production cache contract  
Scope: browser HTTP cache, GitHub Pages edge cache, Service Worker/Cache Storage, PWA, future CDN/origin hosting

## Core rules

1. **Fresh HTML wins over cache.** Public documents are network-first and use Fetch `cache: "reload"` while online. Cache Storage is only an offline fallback.
2. **Mutable code is never allowed to hide a deploy.** CSS, JavaScript, JSON, and manifests are network-first with browser HTTP-cache bypass while online.
3. **Private and transactional routes are never persistently cached.** Login, registration, accounts, assessments, dashboards, checkout, consultation requests, and other personal surfaces use `no-store`.
4. **Long-lived caching is only for immutable/versioned resources.** Versioned/fingerprinted images and fonts may use cache-first behavior.
5. **Unversioned media is fresh-first.** Replacing an image at the same URL must become visible without requiring the user to clear cache.
6. **Service Worker updates bypass the HTTP cache.** Registration uses `updateViaCache: "none"`, checks for updates on every page load, calls `skipWaiting()`, and claims clients immediately.
7. **A new Service Worker cache family invalidates all old JR caches.** Old `jr-site-*` caches are deleted during activation.
8. **Members receive app-like speed without caching personal data.** Shared shell assets may be cached; authenticated/private responses remain `no-store`.
9. **No manual cache clearing is part of the normal release process.** A successful deploy must become visible through ordinary navigation/reload. Every main-branch change to HTML, public assets, platform JSON or the manifest triggers an automatic Service Worker cache-family bump; the cache-bump commit itself does not retrigger that workflow.
10. **GitHub Pages limitation is explicit.** GitHub Pages controls its own HTTP response cache headers. The Service Worker therefore bypasses the browser HTTP cache for mutable resources. The repository `_headers` file is the canonical policy for a future host/CDN that supports custom response headers.

## Policy matrix

| Resource class | Online strategy | Cache Storage | Target HTTP policy on controllable hosting |
| --- | --- | --- | --- |
| Public HTML | Network first, `cache:"reload"` | Offline fallback only | `Cache-Control: no-cache` |
| CSS / JS / JSON / manifest | Network first, `cache:"reload"` | Latest successful copy | `Cache-Control: no-cache` |
| Versioned/fingerprinted images | Cache first | Yes | `public, max-age=31536000, immutable` when filenames are content-hashed |
| Current unversioned images | Network first | Latest successful copy | Short cache only |
| Fonts | Cache first inside versioned SW cache | Yes | `public, max-age=31536000, immutable` when versioned |
| Login/account/private app | Network only, `cache:"no-store"` | No | `Cache-Control: no-store` |
| Checkout/payment | Network only, `cache:"no-store"` | No | `Cache-Control: no-store` |
| Service Worker | Update check on every load, `updateViaCache:"none"` | Browser-managed SW store | `Cache-Control: no-cache` |
| Offline shell | Precached | Yes | Versioned with SW cache family |

## Automatic invalidation

The `release-cache-reset.yml` workflow runs after every relevant main-branch site change and on formal releases. It updates `CACHE_VERSION` in `sw.js`; activation deletes prior `jr-site-*` cache families. Browser HTTP cache is still bypassed for mutable resources through `cache: "reload"`, so freshness does not depend on the Service Worker update alone.

This mechanism cannot remotely erase arbitrary browser storage outside the site's own controlled Cache Storage, and it must never delete authentication state or user preferences. The contract is therefore cache obsolescence and revalidation, not destructive client storage clearing.

## Release invariants

- Do not add public HTML, CSS, or JavaScript back to `PRECACHE`.
- Do not use cache-first for mutable CSS/JS.
- Do not cache authenticated responses, account data, assessment results, payment state, or personalized API responses.
- When a static asset is intentionally made immutable, change its URL when its content changes.
- Preserve `updateViaCache:"none"` on every Service Worker registration surface.
- Every cache-policy change must pass Browser QA, SEO/GEO regression, link integrity, and PWA checks.

## User-facing freshness guarantee

While the user is online, ordinary navigation or reload should display the latest successfully deployed HTML, CSS, JavaScript, and unversioned media without requiring DevTools, cache deletion, or private browsing. Persistent caches are only used as offline fallback or for resources explicitly safe to retain.
