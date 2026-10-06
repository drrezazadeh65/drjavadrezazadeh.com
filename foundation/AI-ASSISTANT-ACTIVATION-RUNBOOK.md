# Public AI Assistant Activation — Cloudflare Worker

The public assistant is designed to remain usable while the website itself continues on GitHub Pages. It runs as a separate Cloudflare Worker on `assistant.drjavadrezazadeh.com`.

## What is already in the repository

- Public floating assistant UI loaded automatically by `assets/js/site.js`.
- Persian/English app-like assistant sheet.
- Safe local fallback navigation if the AI endpoint is temporarily unavailable.
- Cloudflare Worker source at `edge/assistant/src/index.js`.
- Workers AI binding with the default model `@cf/openai/gpt-oss-120b`.
- Anonymous-device rate limiting.
- CORS restricted to the owned domain and current GitHub Pages origin.
- Retrieval over the public `assets/search-index.json`; no private data source is attached.
- No message persistence on the server and no browser persistence of conversation text.
- Private/account/assessment/checkout surfaces do not load the public concierge.

## One-time Cloudflare activation

In Cloudflare **Workers & Pages → Create application → Import a repository**:

1. Connect GitHub and choose `drrezazadeh65/drjavadrezazadeh.com`.
2. Set the Worker/project name to exactly `drjavadrezazadeh-assistant`.
3. Set the root directory to `edge/assistant`.
4. Keep deploy command `npx wrangler deploy`.
5. Save and Deploy.

The Wrangler configuration declares the AI binding and the custom domain `assistant.drjavadrezazadeh.com`. Cloudflare can issue the subdomain certificate and DNS record after the zone is active.

No OpenAI API key is required for the default Workers AI model. Workers AI includes a daily free allocation on the Workers Free plan; excess use requires an intentional billing change.

## Later optional model upgrade

The runtime is model-adapter based. To use OpenAI-hosted GPT-5.6 Sol later, intentionally enable Cloudflare AI Gateway Unified Billing (or another approved provider credential path), then change `ASSISTANT_MODEL` to `openai/gpt-5.6-sol` and set an AI Gateway ID. Do not put provider API keys in GitHub Pages JavaScript.

## Production verification

After deployment:
- `GET https://assistant.drjavadrezazadeh.com/health` must return status `ok`.
- Open a public Persian and English page and send a test question.
- Verify private app/assessment/checkout pages do not show the public assistant.
- Verify the assistant refuses private-record/payment access and does not invent prices or scientific scores.
- Verify 429 is returned after the configured per-device rate limit is exceeded.


## Lead bank

The assistant includes a separate, consented contact-request form. A visitor may submit either an email address or an E.164 mobile number plus a high-level intent category. Chat messages are not copied into the lead bank.

Lead records are stored in a SQLite-backed Cloudflare Durable Object. NEW leads are automatically pruned after 180 days unless their status has changed. The Worker does not store raw IP addresses, user-agent fingerprints, passwords, student assessment responses or payment data in the lead record.

For protected export, create a runtime secret named `ADMIN_LEAD_EXPORT_TOKEN`. The endpoint `GET /v1/admin/leads` requires `Authorization: Bearer <token>`. Never place this token in GitHub, GitHub Pages JavaScript or public CI logs.

WhatsApp consent is separate. A mobile lead can explicitly opt in to WhatsApp contact, but that consent does not activate WhatsApp by itself and is not marketing consent.

## Authentication boundary

The public assistant is not an authentication mechanism. Site account creation uses email as the only sign-in identifier and email verification as the account-activation authority. The required mobile number is contact data only. Password recovery remains email-only.


## Lead lifecycle statuses

The protected admin API can move a lead through `NEW → CONTACTED → QUALIFIED → CONVERTED/CLOSED`. This is a workflow status only; it does not create an account, entitlement, booking or payment state. The public assistant cannot change lead status.
