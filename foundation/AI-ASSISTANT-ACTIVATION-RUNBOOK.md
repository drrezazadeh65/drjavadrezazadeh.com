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
