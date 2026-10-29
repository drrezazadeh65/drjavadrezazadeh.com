# ADR-JREI-PORTABILITY-001 — Independent AI domain, single canonical source (2026-10-29)

**Status: SOURCE CONTRACT WIRED; NOT DEPLOYED, NOT DOMAIN-MIGRATED, NOT TWO-PC ACCEPTED.**

**Canonical source:** `drrezazadeh65/drjavadrezazadeh.com` at `migration/bertina-linux6`.
**Owner goal:** buy a future dedicated `.ai` domain and move JREI independently of the existing site, with no repeated desktop installer for ordinary code updates.

## Decision

Use a **modular monorepo and separate runtime/deployment boundary**, not another divergent branch, duplicate AI engine, second administration panel or new business database.

The JREI Python packages, approved local models and outbound Windows workers are AI-side deployable units. The existing Bertina site is a *client and owner-authority gateway* for protected actions, business services, journal, commerce, search/indexing and existing administrative MFA. AI-service source may later be deployed from the exact approved SHA to a separate host/domain while the website keeps its own established URL/canonical/hreflang and one-click production workflow.

```text
  GitHub canonical branch (versioned code, not an always-running model)
             | approved independent package/revision
             v
  JREI AI private runtime (Windows/VPS, future dedicated .ai frontend)
       |                     ^
       | existing signed      | versioned private HMAC/API
       | outbound worker      | at configured PRIVATE service origin
       v                     |
  Existing Bertina gateway + mother DB + MFA + signed lease/nonce queue
       |
       +--> existing drjavadrezazadeh.com website, unaffected on AI downtime
       +--> existing JREI owner dashboard, with OFFLINE/DEGRADED truthfulness
```

**Separation is logical now; deployment independence remains future work.**
The dedicated domain (e.g. any owner-purchased valid `https://<name>.ai` origin) is **not** assumed purchased, DNS-resolved, controlled or TLS-ready. A domain name is a public frontend identity; it is not permission to expose owner-only Python routes, port 8092 or port 8082.

## Existing implementation paths and authority

| Existing code | Role | Portability gap |
| --- | --- | --- |
| `platform/jrei-python/` | model-independent Python learning, metacognitive and read-only intelligence services | no independent production host or accepted state |
| `platform/jrei-v5/windows-worker/jrei-worker.mjs` | current signed Ed25519 outbound Windows node to existing Bertina queue | `API_ORIGIN` is fixed to `https://drjavadrezazadeh.com`; node trust and original DPAPI identity must be retained |
| `platform/jrei-v5/windows-worker/jrei-repo-auto-sync.ps1` | GitHub fast-forward-only update of the canonical branch | source synchronization does not prove running revision switched or GPU/skills active |
| `platform/jrei-v5/windows-worker/jrei-windows-app-auto-update.ps1` | existing conditional owner-approved guarded local upgrade | final two-PC acceptance and safe handover still unverified |
| `platform/jrei-python/php/jrei-python-internal-client.php` | existing private allowlisted HMAC client, server-side origin | depends on separately configured private origin and secrets |
| `api/jrei-python-owner-skills.php`, `api/operations.php` | existing owner role/MFA/CSRF authority | do not grant actions based on new domain or service authentication alone |
| `api/jrei-hybrid-worker.php` and original mother DB | signed outbound worker auth and job leases | no bypass or replacement of original Ed25519 replay controls |
| `platform/jrei-python/jrei_service/windows_command_center.py` | existing local private 8092 service | browser URL/port is local only; not an Internet-facing AI domain |

## This source increment (non-destructive)

1. `platform/jrei-python/jrei_core/portability.py` provides pure validation of a candidate HTTPS hostname and a truthful status snapshot. `JREI_FUTURE_AI_PUBLIC_ORIGIN` is read from **local service environment only**, not from browser input or model output. Candidate name never authorizes DNS change or starts a worker. No private data, tokens or machine IDs are returned.
2. `platform/jrei-python/jrei_service/app.py` exposes `GET /internal/v1/architecture/portability`, behind the **existing** `require_internal_gateway`. It is an internal status route, not a public site URL or an alternative control plane. It explicitly reports no independent deployment and no migration.
3. Source changes are deliberately limited to JREI Python and this ADR. No API PHP routing, MFA, mother DB, key, Windows scheduled-task action, DNS, production site, external port, model weights, or CI/deployment workflow is changed.

## Planned domain migration without repeated installer

A. **Extract/configure at the correct boundary:** preserve the existing legacy worker endpoints and original signed identity. A later reviewed **versioned** worker contract may introduce a pinned allowlisted owner-configured API origin, compatible with existing `origin` checks and with explicit TLS/certificate validation; never accept a job/model-selected URL. Reject unknown origins and downgrade to safe offline state. A website `.com` client may still use Bertina as a gateway to a separately hosted private AI backend.

B. **Make runtime movable:** package the exact approved Python core as an independent deployable artifact; keep training weights and private memory outside Git. Provide a manifest of exact source SHA, model/artefact hashes, encrypted export/restore rules, host dependencies and rollback procedure. Do not copy business tables or private signing keys into a public AI repository.

C. **Keep worker communication outbound-only:** Windows connects to a trusted HTTPS endpoint and sends signed jobs/results; the `.ai` domain is a public product gateway, not a raw PC socket. Reuse the existing Ed25519 queue/leases; retain per-node revocation and signed identity. A later move of the queue/controller requires approved compatibility period, nonce/replay/lease migration, and dual-site rollback, not a one-sided URL replace.

D. **Preserve site resilience:** browser-facing `.com` requests use versioned AI capabilities via the existing protected backend adapter, with timeout and nonfabricated offline fallback. AI outage must not disable shop, payments, journal, login, SEO, administrative core or existing public URLs.

E. **One-time cutover only after evidence:** owner controls the new domain; independently verify DNS, TLS, HMAC/service authentication, node signatures, actual both-PC availability, live 8092 source revision, memory restore, private/public isolation, no regression, fallbacks and rollback. Capture a real signed owner acceptance receipt for the exact source and new host. Only then gradually route approved AI traffic, with source/site releases remaining independent.

## Operational nonclaims and next dependency

- GitHub **does not provide continuous execution of the model** and GitHub connector access does not provide direct remote execution on Windows.
- Existing Windows installers, GPU tasks and old models remain unchanged. Present source is not proof of the future `.ai` platform running.
- The current initial portability snapshot is an implementation fact sheet, **not** measured host readiness or production acceptance.
- Do not run tests or deploy Bertina on behalf of this source-only increment. Do not automatically enable private Python, public inference or model self-promotion.

**Next source engineering target:** isolate the signed worker's currently hard-coded `API_ORIGIN` behind an exact allowlisted, owner-approved compatibility config with safe default **without changing active behavior**, then create separate packaging/manifest and per-service release gates. Final integrated acceptance comes later under owner authorization.
