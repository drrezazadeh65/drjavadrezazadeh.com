# INDEXNOW — LIVE ACTIVATION CONTRACT

**Status:** LIVE AUTOMATION ENABLED / FAIL-CLOSED VERIFICATION  
**Canonical origin:** `https://drjavadrezazadeh.com`

The former DNS/TLS activation gate is closed. Production HTTPS is live and the repository contains the public IndexNow key file.

## Active behaviour

- Public verification key: `/5bea74dc73880cd2b2a1a35a649e62de.txt`.
- `scripts/indexnow-submit.mjs` accepts only canonical URLs on the production origin.
- Noindex/private pages are excluded from changed-file submission.
- `.github/workflows/indexnow-submit.yml` now runs on relevant main-branch changes.
- Before every live submission the workflow verifies:
  1. the production origin is reachable over HTTPS; and
  2. the live key file returns exactly the expected key.
- Sitemap/search-index/catalogue structural changes submit the current canonical sitemap set.
- Ordinary HTML changes submit only changed indexable canonical pages.
- Manual full submission remains available.
- Failure of HTTPS/key verification blocks submission rather than silently falling back.

IndexNow is a discovery-notification mechanism. Acceptance by the IndexNow endpoint is not an indexing or ranking guarantee.
