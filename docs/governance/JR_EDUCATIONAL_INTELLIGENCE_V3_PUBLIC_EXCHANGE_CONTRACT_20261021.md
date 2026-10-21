# JR Educational Intelligence V3 — Bound Public Catalogue Exchange

**Date:** 2026-10-21. **Version:** 3.0.4. **Status:** Source-only, nondeploying CI; no live LLM, student-data persistence, or production API integration.

The pure `reviewPublicCatalogueExchange(proposedCall, response)` function binds the existing public tool compiler to the existing source-labelled PHP catalogue adapter. The only accepted tool remains `SOURCE_REVIEWED_CATALOGUE_QUERY`. For a claimed reviewed response it verifies the exact requested admission year (through the adapter), echoed page and limit, maximum row count, and requested examination group on every row. Non-reviewed responses carrying records are rejected. It never calls the network, executes PHP, accesses the database, stores private data, computes eligibility or predicts admission.

The source of truth remains `api/konkur-admission.php`, where reviewed document/page/offering and amendment gates are enforced in SQL. This client-side/pure structural boundary **cannot authenticate a response or independently certify that its PDF source is authentic**. Call it only after a trusted same-origin backend response. The PHP API does not echo the search term; this module cannot prove that returned records correspond to a particular search phrase. Server-side query enforcement and safe rendering are mandatory. The test fixtures are synthetic and are **not** actual approved university offerings.

## Test and release controls

```sh
node --check platform/educational-intelligence-public-exchange-v3.mjs
node --test tests/educational-intelligence-public-exchange-v3.test.mjs
```

Twelve local synthetic tests cover request-tool restrictions, private-looking input rejection, year and pagination binding, result-size limits, group mismatch, incomplete review, false admission claims and output minimisation. The existing nondeploying `.github/workflows/public-scientific-experience-qa.yml` runs the same checks on pushes and selected PRs. This module does not activate the public assistant, make the model operational, publish any catalogue rows, or authorise a production deployment.

**Next gate:** authenticate and rate-limit any future PHP assistant endpoint, validate response origin, verify consent and guardian/ownership for private learner operations, and test source/amendment review against the deployed mother schema before using live data.
