# CDN / Cache Policy — Pre-Production Baseline

Status: provider-ready, production verification pending.

## Principle

The current public assets are **not content-fingerprinted**. Therefore the project must not apply long browser TTLs or `immutable` caching to the existing `/assets/**` tree. Cloudflare Pages' default static-asset behaviour is the safer baseline until a hashed-asset build pipeline exists.

## Public static delivery

For the current static site:

- keep Cloudflare Pages' deployment-aware CDN behaviour;
- keep browser freshness governed by Pages' ETag/revalidation defaults;
- do not add a Cache Rule that forces long Edge or Browser TTLs across HTML, CSS, JavaScript or the current non-hashed media tree;
- do not use `Cache-Control: immutable` for non-fingerprinted files;
- allow Brotli/Gzip and Cloudflare's normal static-asset optimisation;
- preserve the Service Worker's network-first policy for CSS/JavaScript so a successful deploy is not masked by an older app-shell copy.

## Private / transactional surfaces

Account, assessment, checkout, consultation-intake and other private/transactional static shells must remain:

```
Cache-Control: no-store, max-age=0
X-Robots-Tag: noindex, noarchive
```

The repository `_headers` policy defines these rules for Cloudflare Pages static responses. Any future Pages Function/API response must set its own cache/security headers because `_headers` does not govern Function-generated responses.

## PWA-specific delivery

- `sw.js` and `site.webmanifest` must remain deploy-fresh; do not introduce long browser TTLs for them.
- CSS/JavaScript are network-first inside the Service Worker.
- Images/fonts may use the Service Worker's cache-first strategy because a new Service Worker version controls app-shell updates.
- PWA launcher icons are part of the versioned app shell.

## Future hashed-asset phase

Only after the build pipeline emits content-hashed filenames such as:

`app.4f29c1.js`
`style.883a91.css`

may those hashed assets use an aggressive browser policy such as:

```
Cache-Control: public, max-age=31536000, immutable
```

HTML, service-worker scripts, manifests and mutable metadata must remain revalidatable even after that migration.

## Production verification

At domain cutover, verify:

1. HTML and mutable assets are not trapped behind long browser TTLs.
2. private/transactional responses are `no-store`.
3. a normal deploy makes updated CSS/JS visible without manual cache purging.
4. Cloudflare Cache Rules do not override the repository privacy/cache contract.
5. Pages Functions, if introduced, reproduce the required private-response cache headers.
6. Cloudflare's public delivery still emits expected ETag/compression behaviour.

## Rollback rule

If any Cache Rule causes stale public code or caches a private response, disable that rule first and return to the Cloudflare Pages default public behaviour while retaining explicit `no-store` rules for private surfaces.
