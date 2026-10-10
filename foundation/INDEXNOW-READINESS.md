# INDEXNOW — LIVE ACTIVATION CONTRACT

**Status:** MANUAL BERTINA SUBMISSION / FAIL-CLOSED VERIFICATION
**Canonical origin:** `https://drjavadrezazadeh.com`

Production HTTPS is active and the repository contains the public IndexNow key file. Bertina reports Certum DV installed; strict public HTTPS/key verification is required for every separately requested live submission.

## Active behaviour

- Public verification key: `/5bea74dc73880cd2b2a1a35a649e62de.txt`.
- `scripts/indexnow-submit.mjs` accepts only canonical URLs on the production origin.
- Noindex/private pages are excluded from changed-file submission.
- `.github/workflows/indexnow-submit.yml` is manual-only and guarded to `migration/bertina-linux6`; ordinary source changes do not submit URLs.
- Before every live submission the workflow verifies:
  1. the production origin is reachable over HTTPS; and
  2. the live key file returns exactly the expected key.
- Current manual dispatch submits the canonical sitemap set. The retained changed-page code path is not selected by the manual-dispatch resolver; it is not active automatic submission.
- Workflow discovery/dispatch depends on GitHub's default-branch definition; the older `main` is not the Bertina source. Do not treat a migration-only workflow as independently dispatchable until that prerequisite is reviewed.
- Failure of HTTPS/key verification blocks submission rather than silently falling back.

IndexNow is a discovery-notification mechanism. Acceptance by the IndexNow endpoint is not an indexing or ranking guarantee.
