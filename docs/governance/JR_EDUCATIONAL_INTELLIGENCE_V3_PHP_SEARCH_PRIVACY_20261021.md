# JR Educational Intelligence V3.0.6 — PHP Public Catalogue Search Privacy Gate

**Date:** 2026-10-21. **Scope:** Minimal fail-closed PHP validation for the existing public `/api/konkur/programmes` GET search. No learner records, credentials, new database, authenticated endpoint, or deployment are introduced.

## Problem and solution

The V3 tool-call compiler rejects obvious private identifiers before forming a URL. However, the existing public PHP route can be called directly and previously accepted any text up to the existing search limit; JavaScript protection alone does not cover that path. A bounded, pure PHP guard `konkurPublicSearchUnsafe(string $search): bool` now runs after existing size validation and before SQL query construction. The route rejects array-valued `q`, malformed UTF-8, obvious phone/national-ID-length digit runs (including Persian, Arabic and fullwidth numerals separated by punctuation or ZWNJ), URLs, email-like strings and Unicode bidi control characters. Valid Persian academic terms, five-digit programme codes with leading zero and ordinary years continue to pass. Normalization is **for screening only**: existing parameterized SQL receives the original permitted search term.

The guard reuses the Bertina PHP application and database; it never accesses account or candidate information. It is an additional best-effort privacy boundary, **not comprehensive PII detection** and not an authenticated learner-data endpoint. Importantly, a URL rejected by PHP **may already be present in browser history, proxies or hosting access logs**. Do not pass free-text private conversations to public GET parameters; future private assistants require authenticated POST, purpose-specific consent, guardian checks where applicable, data minimisation and host-side log controls. Do not claim this PHP gate prevents upstream logging.

## Deterministic synthetic acceptance

```sh
php -l api/konkur-public-search-guard.php
php -l api/konkur-admission.php
php -l tests/konkur-public-search-guard.php
php tests/konkur-public-search-guard.php
```

The 16 fixture cases contain no actual student information or university admission results. The same lint and PHP assertions are wired into the existing **nondeploying** public-science GitHub Actions workflow. There is no probability model, official admission submission, data import, schema migration, production launch or LLM integration in this change.

## Follow-up gate

Before live assistant integration, audit `q` behaviour and server logs under real TLS, test denial behavior through same-origin PHP with redacted synthetic requests, and keep the reviewed-source/amendment protections of `konkurApprovedCatalogueSql()` unchanged. Continue separate review of outstanding site-wide SEO and publishing CI failures rather than bypassing release gates.
