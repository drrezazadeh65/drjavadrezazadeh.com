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
