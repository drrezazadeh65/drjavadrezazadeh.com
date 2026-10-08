# Public Site Guide — Runtime-Neutral Activation Runbook

The public website is hosted on GitHub Pages. No live server-side AI runtime is currently part of production.

## Current production behaviour

- The bilingual floating site guide remains available on appropriate public pages.
- It uses local, deterministic guidance and links when no secure runtime endpoint is configured.
- It does not read private student/account/payment records.
- Conversation text is not persisted.
- Lead capture through the assistant is disabled until a secure server-side runtime exists.
- Auth, private student, assessment and checkout surfaces remain excluded from the public guide.

## Runtime boundary

GitHub Pages is static hosting. Model credentials, admin tokens, contact records and private data must never be placed in repository files, public JavaScript, URLs or browser storage.

A future live assistant may be activated only after an independent HTTPS backend is deliberately provisioned. The backend must provide:

1. server-side secret storage;
2. rate limiting and abuse controls;
3. a privacy-safe request boundary;
4. explicit consent for any contact-record storage;
5. protected administrative access;
6. health monitoring and rollback;
7. strict separation from private assessment, account and payment data.

## Activation contract

When a secure runtime is chosen:

- expose a single production chat endpoint through a page-level `jr-assistant-endpoint` meta tag;
- keep the frontend fallback operational when the endpoint is unavailable;
- enable lead capture only after a real protected lead store exists;
- verify CORS against the canonical site origin;
- test Persian and English behaviour;
- verify that private routes do not load the public guide;
- verify that the assistant does not invent prices, affiliations, publication status or scientific validation.

## Current status

The static bilingual guide is the production-safe mode. Live AI and assistant-side lead capture are intentionally deferred rather than falsely presented as active.
