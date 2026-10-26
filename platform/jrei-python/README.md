# JREI APEX V2 — Python intelligence core (source-stage first increment)

**Branch:** `migration/bertina-linux6`  
**Directive:** `JREI_APEX_ACME_ULTIMATE_MASTER_V2_2026-10-26.md`  
**Mode:** SOURCE PRESENT; **NOT** installed, tested, production deployed or live-integrated.

## Functioning source algorithms

- `jrei_learning.prioritizer.prioritize` deterministically orders aggregate, source-referenced learning gaps with disclosed weights, a stable sort, rights/evidence review, and explicit learning-method choices. It creates **no** knowledge promotion, experiments, model updates or DB records.
- `jrei_core.mission.propose_mission` builds a cycle-checked task DAG using exactly the existing `platform/jrei-v5/jrei-scoped-mission-planner.mjs` mission kind allowlist. It is proposal-only, and does not reimplement JS execution permissions.
- `jrei_skills.evidence_revision.triage_evidence_revision` performs fixed-function source-revision review triage using hash/version metadata only: withdrawal, rights, independent review, changed content, and freshness. It returns only review recommendations; supplied metadata does **not** attest source rights or approval. Its static capability catalog names the exact permitted calls, not dynamically loaded plugins.
- `jrei_service.app` supplies guarded `/internal/v1/` routes for the above capabilities. Health exposes actual service-process response, not fictitious model/host/DB status.

The Python server is **not** deployed on Bertina and need not run under LiteSpeed. It is designed for a separate approved Windows/VPS/container worker. Do not expose the Python service, move Qwen ports, or enroll Node A/B from these files. Localhost-only is the recommended source evaluation binding. The OpenAPI schema is intentionally not publicly served.

## Private bridge contract

Existing PHP code can explicitly import `php/jrei-python-internal-client.php` when an owner-authorized later integration is ready. It uses a private configured origin and HMAC authentication with timestamp and nonce, strict route allowlist, TLS verification and bounded response. The Python guard refuses all non-health operations unless `JREI_PYTHON_PRIVATE_ENABLED=1` and `JREI_PYTHON_HMAC_KEY` is a valid, privately provisioned key. The PHP origin and secret are never public settings. Requests are signed over the exact string:

`POST\n<route>\n<unix-seconds>\n<random-nonce>\n<raw-json-body>`

This HMAC **only** identifies the server-to-server caller. It is not owner identity, MFA authorization, commercial entitlement or permission to operate tools. The nonce cache is local to one process: horizontal replication must wait for an owner-reviewed durable, shared replay ledger in the *existing* `drjavad1_store`, or an equivalent securely provisioned central replay service. Do not claim horizontally safe replay prevention yet.

## Existing platform ownership

The PHP/MariaDB site remains authoritative for `drjavad1_store`, owner MFA, `customer_accounts`, `commerce_orders`, JREI job leases/keys, news publication, assessments, private logs and scientific review. Existing JS evaluation logic retains its exact authority; Python only prioritizes future candidate experiments. No new database is created or accessed by this first increment.

## Not enabled or accepted

No real owner command submission, persisted mission history, Python worker polling, model inference, memory, live news bridge, self-coding, continuous crawl, public AI product, mobile app or migration is claimed. Those are subsequent source integration requirements. A source commit is not runtime proof.

**Source-only QA rule:** no integration, production, host, model or migration tests were executed by this workstream. Final tests and any release require separate owner authority.
