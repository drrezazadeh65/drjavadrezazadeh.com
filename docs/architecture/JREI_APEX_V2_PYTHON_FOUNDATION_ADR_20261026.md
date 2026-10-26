# ADR: JREI APEX V2 Python-first, additive intelligence core
Date: 2026-10-26 · Branch: `migration/bertina-linux6` · State: SOURCE_ONLY

## Context and decision
The 26 October APEX / ACME / ULTIMATE V2 directive requires a Python intelligence kernel while preserving Bertina PHP 8.3, the existing `drjavad1_store` mother database, the original outbound-only signed Windows worker and the JavaScript learning/news modules. The repository was inspected at initial HEAD `8c520127021b90e59fa7099138c96deea8ba3a45`. Existing `jrei-scoped-mission-planner.mjs` and `jrei-learning-loop.mjs` remain the authoritative compatibility boundaries for mission kind vocabulary and evaluated retrieval promotion.

## First code increment
`platform/jrei-python/` contains:
- Typed Pydantic gap/mission/event envelopes, with aggregate-only evidence inputs, tenant-data separation and forbidden operation fields.
- A real deterministic and interpretable model-free learning opportunity ranking algorithm. Outputs are only experiment proposals, never autonomous promotions.
- A DAG validator matching the existing JS scoped mission kinds; produces no execution or authorization claim.
- A private FastAPI read-only proposal interface, disabled by default, and a PHP HMAC adapter not wired into any public or owner route.

The PHP bridge requires an explicitly configured private URL and shared secret. The key, origin and original owner MFA authority are never stored in the repository. The only unsigned GET endpoint is a liveness indicator and explicitly declares DB/model/node state unknown or not connected. HMAC authentication identifies only the internal service, not the human owner. The in-memory replay cache is suitable only for one isolated service process and is NOT a vertically or horizontally scalable durable replay solution.

## State authority map
| Domain | Existing authority | New Python behaviour |
|---|---|---|
| Login, MFA, customer consent | Existing PHP + `drjavad1_store` | Not touched |
| Commerce, payments, entitlements | Existing PHP and `commerce_orders` | Not touched |
| Evaluated retrieval and learning promotions | Existing JREI JS and mother DB | Only rank candidate gaps |
| Signed Node A/B, local model and encrypted queue | Existing PHP/Windows worker | Not touched |
| News editorial/CMS and official rights | Existing News system | Not touched |
| Persistent missions, owner audit, memory | Future additive mother-DB integration | Not implemented |
| Public chat/mobile product | Existing public API + future separate tenant | Not touched |

## Required follow-up sequence
1. Inspect actual mother DB schema read-only under authorized controlled runtime; propose additive, idempotent persistent mission/event and nonce storage, requiring backup/restore gates.
2. Connect the Python API only via original MFA-guarded PHP owner actions; add durable mission IDs, expiry, approval, revoke, emergency stop and evidence.
3. Integrate real model routing through the existing signed outbound Windows worker protocol; keep `127.0.0.1:8081` private and model rights/quality owner gates intact.
4. Add reviewed knowledge source ingestion, metacognitive held-out experiments and existing JREI News bridge; verify with independent QA only when explicitly authorized.
5. Stage public tenant identity, consented memory and Android client independently of owner roles; provision multi-machine scaling behind durable leases and permissions.

## Non-regression and evidence policy
No pre-existing source file, public route, working payment, SEO rule, DB schema, worker key, production secret or deployment workflow was edited. Node A/B identity remains unresolved without signed evidence. Host Cron, live model, Windows nodes, editorial publication and scientific improvements are UNKNOWN. Source commits are SOURCE_PRESENT, not TESTED_AT_SHA, DEPLOYED_AT_SHA or OBSERVED_OPERATIONAL. No tests, SQL migrations, Cron operations or deployment were invoked. Rollback is confined to these additive source files. 
