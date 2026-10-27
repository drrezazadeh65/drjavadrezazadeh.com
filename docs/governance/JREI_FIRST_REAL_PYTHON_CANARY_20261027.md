# JREI first exact signed mission — design and operational boundary (2026-10-27)

Repository: drrezazadeh65/drjavadrezazadeh.com
Branch: migration/bertina-linux6
Owner priority: **real Python execution**, not a source-only proposal; preserve working Qwen and signed nodes.

## Runtime contract

1. Signed-in SUPER_ADMIN with recent original MFA triggers a **single immutable canary** via `POST /api/admin/operations/jrei-python-canary` with `{"action":"run-fixed-arithmetic","requestKey":"32 lower-case random hex"}`; same-origin CSRF and rate gate obligatory.
2. Original `drjavad1_store` new `jrei_python_canary_jobs` row is `QUEUED`, deduplicated by original owner ID and request key. It expires in 600s; no open-ended task execution.
3. Existing registered, unrevoked Ed25519 Node B signs `POST /api/jrei/v1/python-canary/poll`. The PHP original verifier validates existing `permitted_task`, public key, fresh timestamp, one-time durable replay nonce. Transaction locks one job and grants an explicit <=60s lease to that node.
4. Windows separate optional `start-python-canary` mode rejects any task except exact `12*7`. It invokes the **already-running Python 8091 service** through loopback-only `POST /internal/v1/worker/arithmetic`. Python checks socket peer and exact expression; bounded, deterministic `84/1`, without models, file IO, secrets, network, DB or PII.
5. The same Node B sends original-signed `POST /api/jrei/v1/python-canary/complete` including expected fixed-result contract and original short-lived lease ID. Server checks owning node, timeout, state and exact result atomically; stores digest and `COMPLETED` receipt.
6. The MFA-only owner GET returns immutable completed evidence and explicit `modelInferenceVerified:false`, `autonomousLearningVerified:false`. Owner UI is in the original app admin JREI panel.
7. All routes and Node mode default **OFF** behind `JR_JREI_PYTHON_CANARY_ENABLED=true`. No new public Windows TCP port. Existing Qwen worker, Python health worker and original JREI Mission Plan journal are untouched.

## Status (must update using operational evidence, not GitHub CI)

- Code: staged in canonical development branch.
- CI: separately checked on exact SHA; PASS only when confirmed.
- Mother DDL: proposed only; requires production table inventory, recoverable backup, disposable clone migration first.
- Bertina release: gated manual workflow only.
- Windows: new code requires `git pull --ff-only`, then Python *scheduled process restart* to load new local route, and an independent optional Node worker process with existing protected config and Ed25519 key. NEVER restart Qwen or re-enrol the node.
- Owner acceptance: submitted owner test job; first new `COMPLETED` row with `84/1` and fresh server completion time. Further generalized tool access, crawling, learning and News require separate authorization, review, evidence and release.

No deployment, SQL migration, Windows service restart, site interaction or production completion has been performed by this source increment.

## Post-foundation engineering continuation, 27 October 2026

The original Node-B signed 8091 liveness report was **owner verified on live Bertina mother DB**: one `RESPONDING` observation in `jrei_python_node_health`. This verifies **liveness communication only**, not Python skill execution or autonomous learning.

### New owner operational preflight (source, not live)

- Private `GET /api/admin/operations/jrei-python-canary/preflight` is guarded by the existing SUPER_ADMIN + current MFA session and has its own bounded rate gate. It reports the real mother table and signed-node-health schema readiness, separate private feature-switch states, count and latest timestamp of currently ENABLED and nonrevoked signed Python-node reports within 90 seconds, as well as persisted counts for queued, leased, completed and expired jobs.
- A reported `operationallyPollable=true` requires the canary and signed-health flags, both tables and a **fresh registered enabled node report**. It does not imply any Python job completed or model weights changed.
- The bilingual administrator JREI panel can show owner preflight and automatically inspect a submitted job's DB receipt for a bounded interval. Reads and writes have separate rate quotas; transient failure never emits a false COMPLETED status.
- Windows optional canary task registration now checks the local **actual fixed Python arithmetic endpoint** (`84/1`) before registering any new task. Mere `/health` responsiveness is insufficient.
- The disposable MySQL 8.0 test fixture models just the necessary original registered node fields to exercise preflight and owner lease tests. **Never apply the test stub SQL to Bertina.**

### Auto-install closure, separate from public deployment

- The already-tested 30-minute Windows Git updater transfers reviewed branch source without restarting Python or Qwen.
- The owner-opt-in installer stages Python 3.13 in a separate immutable virtualenv using an offline local wheelhouse, tests the full Python suite and exact local skill, switches only the `JREI-Python-Core` scheduled task on successful acceptance, and restores the previous action if cutover fails.
- Installation is additionally gated on an **exact source-tree approval manifest**. Receiving a new Python source revision is not proof it may run.
- A successfully restored but failed attempted upgrade returns a nonzero process exit status for the Git supervisor, and is never called a successful installation.
- CI reference for the previously successful complete Windows stage, cutover and injected rollback: `https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/40445645576`. Latest modified installer and first mission CI must be checked on **their exact commit SHA** before enabling.

### Remaining real operational gates

1. Complete all exact-SHA CI jobs (including Windows rollback status and canary owner preflight tests), provider/deployment compatibility, and backup+restore rehearsal.
2. Inspect original live `drjavad1_store` table catalog, apply **only reviewed additive** `docs/migrations/20261027_jrei_python_canary_roundtrip_mother_mysql.sql` after real backup and clone review. Do not execute the CI-only node fixture.
3. Trigger owner-approved canonical branch guarded Bertina release; verify actual release SHA. Enable the separate `jrei_python_canary_enabled` private flag only after schema and signed worker acceptance.
4. On owner Windows, auto-sync receives revised code. After approved source-tree Windows install acceptance and valid current wheelhouse, the local Python version may be promoted under the existing owner-approved auto-install policy. Start the separate fixed canary outbound task only with its original Ed25519 identity and after valid local Python skill verification.
5. Owner JREI panel submit bounded job; read actual `COMPLETED` state and `84/1` receipt from **production mother DB**. Distinguish signed worker claimed result from independently verified model quality.
6. Only then progress to audited, rights-cleared evidence retrieval, owner-scoped memory, knowledge gaps, paired held-out measurement and JREI News editorial operation. No fake autonomous learning or news status.

The completed isolated tests support code correctness; they **do not establish that this canary has run on the user's Bertina site**.
