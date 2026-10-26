# JREI V2 — source-development and acceptance ledger (26 October 2026)

**Scope:** continuation of JREI APEX · ACME · ULTIMATE V2, development-only.  
**Repository:** `drrezazadeh65/drjavadrezazadeh.com`  
**Only branch:** `migration/bertina-linux6`  
**Reconciled predecessor HEAD:** `171515131670e89019ca05d97818dc2ed2374094`  
**Binding V2 prompt SHA-256:** `4fbf188c005eaf54337a83ff089fa4c5c5cc48268e5998631549c7ac787b661b`.

## Evidence and frozen operational baseline

- Prior owner evidence: public Qwen3 4B chat was observed operational on
  drjavadrezazadeh.com via the signed private pilot worker. Node B is the
  32 GB Qwen host, Node A the other reported 16 GB node. This is historical
  OWNER_OBSERVED_OPERATIONAL, not a new uptime or benchmark measurement.
- Bertina release #459 (predecessor HEAD) had accepted deployment checks;
  no subsequent release was requested or triggered by this workstream.
- The uploaded V2 checklist contains 93 entries: 38 marked [x] only within
  their source/owner-observed evidence scope, 8 partial [~], 47 [ ].
  Newly written source is NOT automatically counted as closed live acceptance.
- Source code must preserve existing public Qwen bridge, original signed
  Ed25519 worker queues, account/commerce systems, OJS/JHELA, assessments,
  PWA and canonical bilingual SEO URLs. None were modified here.

## Source changes and traceability

| Scope | Paths | Evidence reached | Not yet demonstrated |
|---|---|---|---|
| P1-1 owner Python planning | `api/jrei-apex-python-plan.php`, `api/jrei-apex-owner-missions.php`, `api/operations.php`, `api/index.php`, `platform/jrei-python/php/jrei-python-internal-client.php` | SOURCE_INTEGRATED: opt-in `plan-python` on existing MFA owner route; fixed intent→DAG, PHP→HMAC Python, output validation, one mother-DB transaction | Running Python service, authorized migration, actual owner transaction and worker execution |
| P1-1 persisted proposal | `docs/migrations/20261026_jrei_apex_python_plan_receipts_mother_mysql.sql` | SOURCE_PRESENT: exact proposal JSON+SHA in a mission FK record, no business DB replacement | Live schema, clone QA, approval and receipt |
| P1-3 HMAC replay | `jrei_core/replay.py`, `jrei_core/auth.py`, `pyproject.toml`, `docs/migrations/20261026_jrei_python_hmac_replay_nonces_mother_mysql.sql` | SOURCE_INTEGRATED: optional durable atomic nonce claim with unique mother-DB key; no silent fallback on DB failure | TLS/migration/least-privilege DB service account, concurrency/clock-skew tests and deployment |
| P1-4 metacognitive evaluation | `jrei_learning/heldout.py`, `jrei_service/app.py`, `api/jrei-python-owner-skills.php` | SOURCE_INTEGRATED: paired correctness, Persian/English regressions, P95, exact sign test and negative evidence hash; owner skills gateway | Independently licensed held-out fixture, actual case receipts, history persistence, reviewed promotion |
| P1-6 portable executable skill | `jrei_skills/arithmetic.py`, `jrei_skills/registry.py`, `jrei_service/app.py`, `api/jrei-python-owner-skills.php` | SOURCE_INTEGRATED: deterministic exact arithmetic, explicit language digit normalization, bounded AST (no `eval`), callable on signed Python API with model switched off | Same-SHA code tests, accepted runtime/cross-language verification, public chat tool routing |
| P1-6 opt-in owner encrypted memory | `platform/jrei-python/jrei_memory/{contracts,store}.py`, `api/jrei-python-owner-skills.php`, `api/index.php`, `api/operations.php`, `docs/migrations/20261026_jrei_python_owner_memory_mother_mysql.sql` | SOURCE_INTEGRATED: MFA account-bound AES-GCM encrypted owner notes, 1–365 day expiry, read and current-row revoke, isolated OFF switches | Clone schema/grants, actual persistence and key recovery, backup expiry, cross-tenant negative testing, consent/public memory separation |
| QA fixtures source | `tests/test_heldout_review.py`, `tests/test_exact_arithmetic.py`, revised skill catalog fixture | SOURCE_PRESENT | All test executions and independent reviewer signatures |

### New owner API invocation shape (not yet live)

From the already-MFA-protected endpoint `POST /api/admin/operations/jrei-apex-missions`:
```json
{"action":"plan-python","intent":"LEARNING_EVIDENCE_REVIEW","requestKey":"0123456789abcdef0123456789abcdef"}
```
The `requestKey` is caller-generated high-entropy idempotency material, not
an authorization token. Other original intent codes remain allowlisted.
When Python is disabled, the receipt table is absent, or the owner policy
has changed, new Python planning fails closed and the old path is preserved.

From `POST /api/admin/operations/jrei-python-skills`:
```json
{"action":"calculate","payload":{"expression":"۱۲ × ۷"}}
```
```json
{"action":"heldout-review","payload":{"schema_version":"jr.jrei.heldout-review.v1","experiment_id":"example-exp-001","baseline_version":"baseline-001","candidate_version":"candidate-002","policy_version":"policy-001","fixture_sha256":"<real SHA-256>","fixture_declared_independent":false,"fixture_rights_declared_eligible":false,"cases":[]}}
```
The held-out example is intentionally **not** a valid evaluation request:
empty cases are rejected; real SHA evidence, rights and independent review
are mandatory. No invented test fixture or performance claim is supplied.

## Explicit OFF/default safety gates

- `JR_JREI_APEX_MISSION_PYTHON_PLAN_ENABLED`: OFF
- `JR_JREI_APEX_MISSIONS_OWNER_WRITE_ENABLED`: retains previous independent state
- `JR_JREI_PYTHON_INTERNAL_ENABLED`: retains previous independent state
- `JREI_PYTHON_PRIVATE_ENABLED`: independently OFF unless provisioned
- `JREI_PYTHON_REPLAY_BACKEND`: `process_local` source/single-process only;
  select `mother_mysql` for future multi-process staging with validated TLS,
  restricted nonce INSERT grant and approved migration.

Neither the new flags nor the migrations have been activated. Existing Qwen
provider controls are unchanged. New maths/evaluation code does not implement
Qwen fine-tuning or autonomously ingest private conversations.

## Outstanding gates: closure order

1. Same-SHA static/type/contract fixtures, then isolated staging acceptance
   when owner authorizes; abort on any PHP↔Pydantic wire mismatch.
2. Mother-DB schema inspection, independent restore rehearsal, clone migration,
   actual replay collision test, least-privilege and TLS validation.
3. Existing owner dashboard source integration/UX for `plan-python`, real
   mission ID persisted and inspectable graph, documented revoke/stop outcomes.
4. Signed durable leases/checkpoints and independent worker execution receipts:
   no fabricated VERIFIED event or silent conversion of QUEUED to EXECUTED.
5. Accept opt-in owner memory end-to-end on a clone, including MFA-scoped
   tenant isolation, encryption/key recovery, expiry and current-row revocation.
   Public-account consented memory is not implemented. Add source-rights/
   version-aware knowledge objects, revocation and retrieval guards.
6. Real metacognitive loop: gap→priority→experiment→heldout evaluation→
   reviewed reusable skill→reversible promotion, including negative results.
7. Original JREI News official-source→CMS publication receipt→correction/
   withdrawal→retrieval bridge; do not build a parallel CMS.
8. Public tenant isolation, durable conversations, pricing/entitlements,
   Android artifact and independent scientific/financial/privacy acceptance.
9. Authorized final CI, QA, production release and post-release monitoring,
   distinct from any source commit.

**Truth boundary:** all new entries are SOURCE_PRESENT or SOURCE_INTEGRATED.
No TESTED_AT_SHA, DEPLOYED_AT_SHA or newly OBSERVED_OPERATIONAL evidence
was produced for these changes. No production test, MySQL modification,
worker installation, model reload, Cron change, source crawl, payment activation
or deployment was performed.
