# CDN / Cache Policy — JR Cache Standard v2.0 Companion

Status: active production policy companion.  
Canonical source: `/CACHE_STANDARD.md`.

## Current hosting reality

The public site currently runs on **GitHub Pages**. GitHub controls origin/edge HTTP cache headers and the repository cannot override those headers per route. Therefore freshness for mutable content is enforced primarily through:

- Service Worker fresh-first routing;
- Fetch `cache: "reload"` for public HTML, CSS, JavaScript, JSON, manifests and unversioned media;
- `updateViaCache: "none"` for Service Worker update checks;
- immediate Service Worker activation with `skipWaiting()` and `clients.claim()`;
- versioned URLs whenever a resource is intentionally made cache-stable.

The repository `_headers` file is a migration contract for any future hosting provider that supports custom response headers. It has no effect on GitHub Pages.

## Public static delivery

The current public assets are not fully content-fingerprinted. Therefore:

- do not use year-long or `immutable` browser caching for existing non-hashed files;
- do not cache-first public HTML, CSS or JavaScript;
- do not precache mutable public documents or mutable code in the Service Worker;
- allow public documents and code to use cached copies only as offline fallback;
- treat unversioned images as fresh-first;
- cache versioned/fingerprinted media and fonts only when their URL guarantees identity.

## Private / transactional surfaces

Account, authentication, assessment, checkout, consultation-intake and other personalized or transactional routes are network-only:

```
Cache-Control: no-store
```

They must never be persisted in Service Worker Cache Storage. On a future controllable origin/CDN they must also emit `X-Robots-Tag: noindex, noarchive` where appropriate.

## PWA delivery

- `sw.js` is checked on every page load with `updateViaCache: "none"`.
- new workers use `skipWaiting()` and `clients.claim()`;
- old `jr-site-*` cache families are deleted during activation;
- public HTML and mutable code are network-first;
- offline HTML is fallback-only;
- private routes are `no-store`;
- no manual cache deletion is part of the release process.

## Future content-hashed asset phase

Only after the build pipeline emits filenames such as:

`app.4f29c1.js`  
`style.883a91.css`

may those exact immutable assets use:

```
Cache-Control: public, max-age=31536000, immutable
```

HTML, Service Worker scripts, manifests, personalized responses and mutable metadata remain revalidatable or non-storable.

## Release verification

Every release must verify:

1. ordinary navigation reveals the latest deployed HTML and code without manual cache purging;
2. private/transactional content is never written to Cache Storage;
3. Service Worker updates bypass HTTP cache;
4. old cache families are invalidated;
5. Browser QA passes;
6. SEO/GEO and PWA privacy audits pass;
7. no future CDN/origin rule overrides the privacy/freshness contract.

## Rollback

If a future cache rule causes stale public code or persistence of private data, disable the offending rule and return to the canonical JR Cache Standard v2.0 behavior.
