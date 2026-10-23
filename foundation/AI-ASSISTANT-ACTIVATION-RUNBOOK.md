# Public Site Guide — Runtime-Neutral Activation Runbook

**2026-10-23 architecture update:** the canonical development branch is `migration/bertina-linux6`, and the hosting target is the existing **Bertina Linux / LiteSpeed / PHP 8.3** installation with the same single customer/operations mother database. GitHub Pages was an earlier hosting stage, **not** the current target. The existing store, checkout, services and public URLs must not be replaced or disabled to activate a new assistant. A live model-serving backend has **not** been independently verified or authorized by this source document.

## Current source contract — live production behaviour must be verified separately

- The bilingual floating site guide remains available on appropriate public pages.
- It uses local, deterministic guidance and links when no secure runtime endpoint is configured.
- It does not read private student/account/payment records.
- Conversation text is not persisted.
- Lead capture through the assistant is disabled until a secure server-side runtime exists.
- Auth, private student, assessment and checkout surfaces remain excluded from the public guide.

## Runtime boundary

The existing Bertina PHP API and private configuration provide a potential future server-side boundary; merely having PHP hosting is **not** proof that an LLM endpoint, retrieval system, reviewed scientific model or lead store is operational. Model credentials, admin tokens, protected student evidence, payment details and private data must never be placed in repository files, public JavaScript, URLs or browser storage.

A future live assistant may be activated only after an independent HTTPS backend is deliberately provisioned. The backend must provide:

1. server-side secret storage;
2. rate limiting and abuse controls;
3. a privacy-safe request boundary;
4. explicit consent for any contact-record storage;
5. protected administrative access;
6. health monitoring and rollback;
7. strict separation from private assessment, account and payment data.

## Activation contract

When an independently approved secure runtime is provisioned and final acceptance is authorized:

- expose the existing trusted same-origin `/api/assistant/v1/chat` route through the page-level `jr-assistant-endpoint` meta tag only after real server readiness is independently established; until then the browser must retain deterministic static fallback and the route may remain deliberately unavailable;
- keep the frontend fallback operational when the endpoint is unavailable;
- enable lead capture only after a real protected lead store exists;
- verify CORS against the canonical site origin;
- test Persian and English behaviour;
- verify that private routes do not load the public guide;
- verify that the assistant does not invent prices, affiliations, publication status or scientific validation.

## Current status

The static bilingual guide is the production-safe mode. Live AI and assistant-side lead capture are intentionally deferred rather than falsely presented as active.


## Source governance required before any live AI activation

- Existing `platform/educational-intelligence-v3.mjs` and specialised public catalogue/evidence/consent adapters are deterministic pure contracts, not a deployed LLM or scientific authorization. Their source-reviewed metadata cannot independently verify original 1405 official PDFs, amendments, eligibility rules, calibrated admissions probability, or age/guardian consent.
- Public query tools must use explicitly allowlisted same-origin public endpoints and revalidate source approval and provenance on the server. They must not infer private learner, guardian, account or financial authority from chat text, model tool names or browser-supplied consent flags.
- `platform/assistant-runtime-policy.json` records that the current public guide persists no conversation history on the server or across visits. The optional browser visitor-correlation token is **per-page memory only**, not persisted local storage. The 12/minute figure is a future rate-limit target, not evidence of active backend enforcement.
- Any future model's boundary must include approved tool registration, model-adapter provenance, prompt-injection isolation, source/date/issuer freshness, consent scope, bounded nonpersonal logs, human escalation and a reversible global OFF switch. Personal admission probabilities and paid scientific inferences remain OFF absent independent validation.
- Existing site guidance continues without model access, assistant lead-bank, bulk email campaigns or forced personal-data capture. Original private assessment, account, checkout and services routes stay excluded.
- Source completion does not verify host readiness. No model credentials belong in GitHub; first real activation needs owner permission and one final acceptance programme, without disrupting current store or services.
