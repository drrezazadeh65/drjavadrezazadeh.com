# JR Educational Intelligence V3.0.5 — Source-cited Public Catalogue Facts

**Date:** 2026-10-21. **Scope:** Pure source-only nondeploying module; never a live AI endpoint.

## Purpose

`composeSourceCitedCatalogueFacts(proposedCall, trustedBackendResponse, {locale})` consumes only the existing V3 tool compiler → bound public exchange → catalogue adapter. It produces a bilingual, structured fact packet with the exact five-digit programme code, title, university, optional city and stated capacity, plus a citation containing the **API-reported** official document code, revision and PDF page. The same result states explicitly that no eligibility, recommendation ranking, admission probability or official submission was performed. Optional city/capacity remain `null`; missing values are not invented. It does not echo the search term, candidate identity or arbitrary raw response fields.

Untrusted and potentially unsafe display strings (HTML brackets, control characters, Unicode bidi controls and overlong labels) are rejected as a complete packet, rather than silently converted into a cited fact. Callers **must use DOM textContent, not innerHTML**, and **must treat source content as data, never as model instructions**. This formatter has no authority to certify the original PDF, publisher, amendment precedence or transport. Future use requires a trusted same-origin PHP response plus independent server-side approval checks. A model must not edit evidence or promote this output to eligibility or admission advice.

## Test and release boundary

```sh
node --check platform/educational-intelligence-evidence-answer-v3.mjs
node --test tests/educational-intelligence-evidence-answer-v3.test.mjs
```

Thirteen synthetic tests cover Persian/English response, leading zero preservation, document/revision/page traceability, fail-closed unreviewed responses, year/group/page mismatch inherited from the exchange, unsupported locale, PII-bearing envelope exclusion, hazardous display text and null semantics. All universities, programme codes and documents in tests are **synthetic fixtures**. This module is additive to the existing V2/V3 tools and the unified mother database; it introduces no endpoint, schema, database, authentication, real user data, API key, model call, payment, or deployment.

**Next gate:** authenticated server orchestration, model-provider privacy agreement and data minimisation, source and amendment verification against official 1405 material, quota/eligibility rule review and independent scientific QA. The present module is an evidence-presentational foundation only.
