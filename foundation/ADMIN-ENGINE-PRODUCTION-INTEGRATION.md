# Private admin reporting: integration handoff

**Status: NOT DEPLOYED.** Passing source-level tests does not establish a production admin service.

## Existing infrastructure reviewed
- Static admin shell: `fa/app/admin/index.html` (no operational session gate).
- Cloudflare assistant: `edge/assistant/src/index.js` with public-facing AI and lead capture.
- Cloudflare payments: `edge/payments/src/index.js` with payment state.
- Neither the public assistant nor the payment worker should be reused as an admin identity provider.
- Private report factory: `platform/admin-engine-report-worker.mjs`.
- Private browser controller: `platform/admin-engine-status-controller.mjs`.

## Required production wiring
1. Provision a **separate admin Cloudflare Worker** behind an identity provider that verifies an email-confirmed account, ADMIN/SUPER_ADMIN role, and phishing-resistant MFA server-side. No phone verification. Never accept a browser-supplied role or `mfa_verified` flag.
2. Configure a same-origin reverse proxy for `/api/v1/admin/engine-status`, or host the protected admin page and API together on the same authenticated origin. The current static GitHub Pages shell is **not** an access-control boundary.
3. Inject `verifySession({request,env,ctx})` using the actual provider's cryptographically validated session and a server-owned authorization store.
4. Inject `collectSignals` with **server-owned**, timestamped health telemetry. An arbitrary JSON object or client claim is not a verified signal.
5. Ensure responses have `no-store`, `noindex`, no sensitive error payloads, and append-only access/audit events with retention policy.
6. Serve an authenticated admin document with a `#admin-engine-status-table` element, and explicitly call `mountAdminEngineStatus({document,fetcher:fetch,origin:location.origin}).refresh()` from its module entrypoint. Do not mount it on the public shell before session enforcement.
7. Validate negative and positive auth paths in staging; do not copy real user/payment data into test fixtures. Confirm all seven deployment gates in `platform/admin-engine-deployment-gate.mjs`.

## Non-goals
No public engine metrics endpoint; no static build-time tokens; no fake traffic counts; no claims that the 13 engines are all healthy. Avoid Vercel and Neon, which are retired from this infrastructure.
