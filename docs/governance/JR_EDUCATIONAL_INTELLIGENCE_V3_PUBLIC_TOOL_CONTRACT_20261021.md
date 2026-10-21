# JR Educational Intelligence V3 — Public Catalogue Tool Contract

**Date:** 2026-10-21. **Status:** Tested local candidate, not integrated or deployed.

The public tool compiler accepts only `SOURCE_REVIEWED_CATALOGUE_QUERY` with bounded `year`, `group`, `q`, `limit` and `page` arguments, mirroring the existing PHP `/api/konkur/programmes` GET contract. It rejects unknown tools, extra keys, malformed arguments, private identifiers in the tool envelope, invalid pagination and obvious URL-unfit search strings. The query compiler does not fetch data, authenticate callers, approve source documents, submit official applications or predict admissions. The PHP source review and amendment checks remain authoritative; any future response consumer must use the existing catalogue adapter and validate trusted response provenance.

Search hygiene is limited and does not guarantee personal-data detection. A future authenticated educational assistant must avoid passing free-form conversations or private learner data to public URL parameters, and must enforce identity, consent and guardian permissions on the server. No model provider, student data store or database migration is enabled by this module.

## Local test

`node --check platform/educational-intelligence-public-tool-v3.mjs`

`node --test tests/educational-intelligence-public-tool-v3.test.mjs`

Ten synthetic tests pass locally, including Persian/Arabic-digit identifier screening. A future integration change must add the new files to the existing `.github/workflows/public-scientific-experience-qa.yml` path filters and nondeploying test step, run hosted CI, and obtain a reviewed merge/commit before considering production release.
