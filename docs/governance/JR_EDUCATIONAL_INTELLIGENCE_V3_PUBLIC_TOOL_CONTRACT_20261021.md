# JR Educational Intelligence V3 — Public Catalogue Tool Contract

**Date:** 2026-10-21. **Status:** Source-only, CI-tested safety boundary; not connected to a live assistant or deployed.

The public tool compiler accepts only `SOURCE_REVIEWED_CATALOGUE_QUERY` with bounded `year`, `group`, `q`, `limit` and `page` arguments, mirroring the existing PHP `/api/konkur/programmes` GET contract. It rejects unknown tools, extra keys, malformed arguments, private identifiers in the tool envelope, invalid pagination and obvious URL-unfit search strings. The query compiler does not fetch data, authenticate callers, approve source documents, submit official applications or predict admissions. The PHP source review and amendment checks remain authoritative; any future response consumer must use the existing catalogue adapter and validate trusted response provenance.

Search hygiene is limited and does not guarantee personal-data detection. The v3.0.3 guard normalizes compatibility and Persian/Arabic digits only for screening, strips separators only for detecting long numeric identifiers, and blocks bidi-control spoofing while allowing ordinary Persian ZWNJ terms. A future authenticated educational assistant must avoid passing free-form conversations or private learner data to public URL parameters, and must enforce identity, consent and guardian permissions on the server. No model provider, student data store or database migration is enabled by this module.

## Local test

`node --check platform/educational-intelligence-public-tool-v3.mjs`

`node --check platform/educational-intelligence-public-search-guard-v3.mjs`

`node --test tests/educational-intelligence-public-tool-v3.test.mjs tests/educational-intelligence-public-search-guard-v3.test.mjs`

The public tool compiler and Unicode search guard are covered by the existing nondeploying `.github/workflows/public-scientific-experience-qa.yml` workflow. This is a conservative public-search filter, not proof that a query contains no personal information. Review hosted CI before considering any future server-side integration or production release.
