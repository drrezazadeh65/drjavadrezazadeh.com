# INDEXNOW READINESS

**Status:** READY / NETWORK SUBMISSION GATED BY PRODUCTION DNS-TLS

The repository now contains a standards-based IndexNow integration prepared for the canonical production origin `https://drjavadrezazadeh.com`.

## Implemented

- Public verification key file at `/5bea74dc73880cd2b2a1a35a649e62de.txt`.
- `scripts/indexnow-submit.mjs` validates indexable canonical URLs and supports a full sitemap-derived initial submission.
- `.github/workflows/indexnow-submit.yml` provides a manual dry-run workflow.
- The integration is intentionally fail-closed: network submission is disabled until the production domain, HTTPS and key-file retrieval are independently verified.
- Private and noindex HTML routes are excluded when changed-file submission mode is used.

## Activation sequence

1. Verify production apex DNS and HTTPS.
2. Verify `https://drjavadrezazadeh.com/5bea74dc73880cd2b2a1a35a649e62de.txt` returns HTTP 200 and exactly the expected key.
3. Run the production health audit in strict mode.
4. Change `INDEXNOW_ENABLED` to `1` only after those checks pass.
5. Submit the current sitemap URLs once, then automate only new/updated indexable URLs.

IndexNow is a discovery notification mechanism, not an indexing or ranking guarantee.
