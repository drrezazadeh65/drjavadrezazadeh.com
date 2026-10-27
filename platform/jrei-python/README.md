# JREI APEX V2 — Python intelligence core (source-stage first increment)

**Branch:** `migration/bertina-linux6`  
**Directive:** `JREI_APEX_ACME_ULTIMATE_MASTER_V2_2026-10-26.md`  
**Mode:** SOURCE INTEGRATED (feature flags OFF); **NOT** installed, tested, production deployed or observed operational.

## Functioning source algorithms

- `jrei_learning.prioritizer.prioritize` deterministically orders aggregate, source-referenced learning gaps with disclosed weights, a stable sort, rights/evidence review, and explicit learning-method choices. It creates **no** knowledge promotion, experiments, model updates or DB records.
- `jrei_core.mission.propose_mission` builds a cycle-checked task DAG using exactly the existing `platform/jrei-v5/jrei-scoped-mission-planner.mjs` mission kind allowlist. It is proposal-only, and does not reimplement JS execution permissions.
- `jrei_skills.evidence_revision.triage_evidence_revision` performs fixed-function source-revision review triage using hash/version metadata only: withdrawal, rights, independent review, changed content, and freshness. It returns only review recommendations; supplied metadata does **not** attest source rights or approval. Its static capability catalog names the exact permitted calls, not dynamically loaded plugins.
- `jrei_service.app` supplies guarded `/internal/v1/` routes for the above capabilities. Health exposes actual service-process response, not fictitious model/host/DB status.
- `jrei_learning.heldout.review_heldout` performs reproducible paired baseline/challenger calculations over SHA-identified Persian/English held-out cases, including exact discordant-case sign tests, P95 comparisons and negative evidence hashes. It never certifies fixture independence or grants automatic promotion.
- `jrei_skills.arithmetic.calculate_exact` executes bounded exact integer/fraction arithmetic over an AST allowlist, including Persian/Arabic digits, without calling Qwen, `eval()`, shell, network or MySQL. It is a private signed skill, not yet wired into the public chatbot.

The registered, model-free `jrei_skills` catalog and `evidence_revision` function are callable only through the original owner access controls when separately activated; no automatic execution or knowledge promotion is possible. The Python server is **not** deployed on Bertina and need not run under LiteSpeed. It is designed for a separate approved Windows/VPS/container worker. Do not expose the Python service, move Qwen ports, or enroll Node A/B from these files. Localhost-only is the recommended source evaluation binding. The OpenAPI schema is intentionally not publicly served.

## Private bridge contract

The original SUPER_ADMIN/MFA operations router now imports the private PHP adapter through `api/jrei-python-owner-skills.php`; its new `/api/admin/operations/jrei-python-skills` route is source-integrated but returns NOT ENABLED unless the independent private Python switches and credentials are approved and provisioned. It uses a private configured origin and HMAC authentication with timestamp and nonce, strict route allowlist, TLS verification and bounded response. The Python guard refuses all non-health operations unless `JREI_PYTHON_PRIVATE_ENABLED=1` and `JREI_PYTHON_HMAC_KEY` is a valid, privately provisioned key. The PHP origin and secret are never public settings. Requests are signed over the exact string:

`POST\n<route>\n<unix-seconds>\n<random-nonce>\n<raw-json-body>`

This HMAC **only** identifies the server-to-server caller. It is not owner identity, MFA authorization, commercial entitlement or permission to operate tools. The nonce cache is local to one process: horizontal replication must wait for an owner-reviewed durable, shared replay ledger in the *existing* `drjavad1_store`, or an equivalent securely provisioned central replay service. Do not claim horizontally safe replay prevention yet.

## Existing platform ownership

The PHP/MariaDB site remains authoritative for `drjavad1_store`, owner MFA, `customer_accounts`, `commerce_orders`, JREI job leases/keys, news publication, assessments, private logs and scientific review. Existing JS evaluation logic retains its exact authority; Python only prioritizes future candidate experiments. No new database is created or accessed by this first increment.

## Not enabled or accepted

No real owner command submission, persisted mission history, Python worker polling, model inference, memory, live news bridge, self-coding, continuous crawl, public AI product, mobile app or migration is claimed. Those are subsequent source integration requirements. A source commit is not runtime proof.

**Source-only QA rule:** no integration, production, host, model or migration tests were executed by this workstream. Final tests and any release require separate owner authority.


## V2 additive development continuation (26 October; no new deployment)

The live public signed Qwen bridge, existing outbound Windows workers, Node B
(32 GB / Qwen host), PHP/MariaDB, original MFA gateway and website pages are
**unchanged**. The existing public success is historical OWNER_OBSERVED_OPERATIONAL,
not a claim of continuous multi-node monitoring or Python service activation.

- `api/jrei-apex-python-plan.php` is an additive owner-only `plan-python`
  action behind the EXISTING `/admin/operations/jrei-apex-missions` gateway
  (same SUPER_ADMIN, recent MFA, same-origin CSRF and rate controls).
  It maps the six original owner intent codes to a bounded DAG, requests a
  HMAC-signed *non-executing* Python plan, strictly validates its result,
  then persists the mission and Python proposal inside the original
  `drjavad1_store` transaction. The original `plan` and `cancel`
  actions remain unchanged. Owner snapshots show plan digests and graph steps
  (not receipts of real worker execution).
- New switch `JR_JREI_APEX_MISSION_PYTHON_PLAN_ENABLED` defaults **OFF**.
  The existing owner-write and private-Python switches remain independent.
  `docs/migrations/20261026_jrei_apex_python_plan_receipts_mother_mysql.sql`
  is a proposed additive table, **not an applied migration**. New plans fail
  closed when the approved table/service/switch is absent.
- `jrei_core.replay` optionally claims signed HMAC nonces atomically using
  a unique key in `drjavad1_store`. Select
  `JREI_PYTHON_REPLAY_BACKEND=mother_mysql` and separately provision restricted
  TLS DB credentials and the additive
  `20261026_jrei_python_hmac_replay_nonces_mother_mysql.sql` migration
  **only after** independent approval and clone testing. In this mode,
  DB failure returns 503 and never falls back to per-process memory.
  `process_local` remains strictly single-process/source-evaluation only and now requires an explicit `JREI_PYTHON_SINGLE_PROCESS_ASSERTED=1`; otherwise all private operations fail closed. This assertion does not itself prove host topology.
- The signed `/internal/v1/skills/arithmetic/calculate` route is called using owner skills `{"action":"calculate","payload":{"expression":"۱۲ × ۷"}}`; correctness still requires same-SHA QA and independent model-off acceptance.
- The HMAC-guarded `/internal/v1/learning/heldout/review` endpoint is
  reachable by the existing SUPER_ADMIN/MFA `jrei-python-skills` router
  with `{"action":"heldout-review","payload":{...}}`. It accepts no
  raw transcripts, awards no scientific validation, changes no model
  weights or live knowledge, and does not store its results. Original
  `catalog` and `triage-evidence` actions remain intact.
- Source fixtures under `tests/` have been extended but have **not been
  executed**. Runtime adoption requires separately authorised acceptance.

### Encrypted owner-memory source increment

`jrei_memory` provides owner-only AES-256-GCM (AESGCM) encrypted note storage
against an additive proposed `drjavad1_store` table:
`docs/migrations/20261026_jrei_python_owner_memory_mother_mysql.sql`.
The record is bound to the existing MFA account, with explicit purpose
(`OWNER_WORK_NOTE`, `OWNER_RESEARCH_NOTE`, `OWNER_PREFERENCE`),
a 1–365 day retention deadline, a caller-generated idempotency key,
and a current-row ciphertext-erasure revocation operation. Saved notes do
NOT become public retrieval, shared knowledge or model training material.

These operations are reachable only from the existing
`/admin/operations/jrei-python-skills` endpoint, which now injects
`owner_account_id` from the verified PHP session. The browser cannot select
or override an owner account; the Python backend uses account-scoped bound
SQL parameters. Separate OFF switches:
`JR_JREI_PYTHON_OWNER_MEMORY_ENABLED` and
`JR_JREI_PYTHON_OWNER_MEMORY_REVOKE_ENABLED` on Bertina,
and `JREI_PYTHON_OWNER_MEMORY_ENABLED` /
`JREI_PYTHON_OWNER_MEMORY_REVOKE_ENABLED` on the private Python host.
The AES-GCM key and restricted DB/TLS credentials are provisioned privately,
never committed. Key rotation, audit, retention purge/backup expiry,
data-subject requests, cross-tenant test and disaster recovery remain
independent acceptance gates. Revocation does NOT erase historical backups.

**This is owner work-memory source only**. A separate lawful, consented
public-user memory implementation is still required. No service, key,
table or feature switch was activated by this commit.

### Exact outstanding acceptance gates

1. Independent read-only comparison to the mother DB schema, verified backup
   and restore, and approved migrations on a disposable clone.
2. Replay ledger uniqueness under concurrent Python processes and TLS failure;
   single-process fallback must never silently activate in multi-worker mode.
3. Same-SHA PHP/Python contract tests; disabled-flag, CSRF/MFA, missing-table,
   idempotency, concurrent-request, cancellation and control-revision races.
4. Actual running private Python worker (approved independent host), owner
   mission ID and stored DAG receipt observed; reconciliation/lease and signed
   outcome are a **later** execution phase, not a consequence of plan creation.
5. Independent held-out fixture rights, leakage audit and bilingual scientific
   review; a statistically promising challenger cannot self-promote.
6. Separate owner release authorization before applying a migration, changing
   live flags, touching nodes or deploying new web code.

**Evidence taxonomy:** all newly added features are SOURCE_PRESENT or
SOURCE_INTEGRATED. No TESTED_AT_SHA, DEPLOYED_AT_SHA or new
OBSERVED_OPERATIONAL assertion follows from these commits.

### Source-only private owner Qwen draft seam (later-stage code; default disabled)

`jrei_core.local_model_draft` adds **one** local inference adapter targeting only
`http://127.0.0.1:8081/v1/chat/completions` (unchanged installed Qwen alias
`jrei-qwen3-4b-q4km`). It uses no proxy, redirects, cloud API, arbitrary
tool list, user files, student records, SQL, model-update facility or inbound
Windows listener; JSON response size and tokens are bounded, and model access
is single-concurrency within this Python process. The original signed outbound
Qwen public worker stays separate and is not modified. Existing public Qwen
model or worker files are **not** replaced.

The new route `POST /internal/v1/model/owner-draft` requires the original
private HMAC middleware, an existing PHP `SUPER_ADMIN` MFA/CSRF owner session,
**and three distinct opt-in conditions**:

- private Bertina config `jrei_python_internal_enabled` (existing OFF gate);
- private Bertina config `jrei_python_owner_model_draft_enabled` (new OFF gate);
- private Python environment `JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED=1` and
  separately owner-attested `JREI_PYTHON_LOCAL_MODEL_RIGHTS_OWNER_REVIEWED=1`.

This is **not** a direct Bertina→Windows connection design. The direct private
client works only with an explicitly provisioned reachable PRIVATE Python
origin, preserving the production Windows outbound-only security constraint.
Do NOT publish a Windows port or infer private-network reachability merely
because this code is committed.

A result is always labelled `UNVERIFIED_MODEL_DRAFT`. It contains a SHA-256
of returned text and a bounded latency, not reviewed evidence, a scientific
finding, a permitted public answer, or actual source citations. There is no
automatic persistence, retriever-citation promotion, continuous training,
node enrollment, LLM-as-tool execution, News publication or paid product.
Private model use requires independent owner model licensing and quality
acceptance. Every new permission remains explicitly OFF without that decision.

**Owner code-only directive:** This change was committed to the development
branch. No QA, runtime installation, live config edit, database migration,
service reload, or Bertina deployment was performed here.
