# JREI Python — signed outbound Windows-node liveness bridge

**Status:** source integrated, isolated Node/PHP checks, **NOT deployed, NOT mother-migrated, NOT owner-enabled**. Date 27 October 2026. Official branch `migration/bertina-linux6`.

## Verified owner Windows baseline (owner screenshots)

- Python 3.13.15, complete offline wheelhouse, `jrei-intelligence-core==0.1.0` installed in `%LOCALAPPDATA%\JREI-Python\venv`.
- 59 unit cases reported OK by the owner; local FastAPI `127.0.0.1:8091/internal/v1/health` returned `service_process: RESPONDING`, `production_ready: false` and `mother_db: NOT_CONNECTED`.
- Original signed Windows Qwen model remains loopback-only `127.0.0.1:8081`. Original three JREI tasks were reported Running earlier. `JREI-Python-Core` task is now Running (Task Scheduler `267009` means currently active); starts at that Windows user's *logon*, not as an OS boot/24-hour server service.
- This is **owner-observed runtime evidence**, not proof of learning, Python↔Bertina communication, crawling or publishing.

## What this increment implements

1. Additive **proposed, unapplied** mother-DB table `jrei_python_node_health` in `docs/migrations/20261027_jrei_python_node_health_mother_mysql.sql`. Node ID bound to the original signed registered node; process schema and observed/received times only. No key, secret, model weights, student data, raw conversations or corpus.
2. `api/jrei-python-node-health.php`: read-only contract validator, bounded monotonic signed-node observation store and privileged snapshot. Only `RESPONDING` and `UNAVAILABLE` status; any older-than-120-second or extra-field input denied.
3. New `POST /api/jrei/v1/python-node/heartbeat`: only HTTPS; strictly OFF behind private env `JR_JREI_PYTHON_NODE_HEARTBEAT_ENABLED=true` after owner acceptance. Uses original `jrHybridAuthenticate`, same registered Ed25519 node, same durable `jrei_hybrid_node_nonces` replay ledger, existing `jrei_hybrid_nodes` ENABLED/not revoked plus allowed Windows type and server rate limit. Dedicated minimal response; no arbitrary user URL or job execution.
4. Owner-only `GET /api/admin/operations/jrei-python-node-health` reuses original SUPER_ADMIN, current MFA session and rate gate. Emits live freshness only for an enabled, nonrevoked node and a matching signed RESPONDING observation seen ≤90 seconds ago. **Node-reported**, not independent process or scientific validation.
5. New optional CLI mode `node jrei-worker.mjs start-python-health <existing-private-config>` shares the **same** DPAPI-protected current Windows node key and original outbound `post` signing helper; it never generates keys or modifies the existing Qwen model/Pilot workers. Its only local target is fixed `http://127.0.0.1:8091/internal/v1/health`; its only remote target is the fixed HTTPS site. It cannot execute a task, crawl, train, deploy or publish.
6. Source QA: `tests/jrei-python-node-health-bridge.test.mjs` and `tests/jrei-python-node-health-php-contract.php`. GitHub Actions isolated workflow under `.github/workflows/jrei-python-signed-node-bridge-qa.yml`.

## Release gates and exact closure sequence

1. **QA:** same-commit Node contract tests; PHP -l plus PHP strict-validator unit tests; existing Bertina provider guard, SEO and payment/auth regression. Reject any failure.
2. **Mother schema:** inspect live `drjavad1_store` collations and the original registered-node table, independently verify a backup and restore, then apply the additive SQL to a disposable cloned database before any live migration.
3. **Bertina release:** owner-approved existing `deploy-bertina.yml` `workflow_dispatch` only from `migration/bertina-linux6`. Deploying PHP alone does not enable the flag/migrate mother.
4. **Owner acceptance:** apply approved additive mother migration; set *only* `JR_JREI_PYTHON_NODE_HEARTBEAT_ENABLED=true` securely on Bertina, leaving Python skill execution and News independent OFF. Confirm PHP release SHA equals reviewed branch.
5. **Windows source sync (no re-enrollment):** on the owner's 32GB Windows PC, pull this reviewed commit into `%LOCALAPPDATA%\JREI-Python\repo` (check `git status` before pull; do not overwrite local modifications). The existing private config should be at `%LOCALAPPDATA%\JREI\jrei-worker-config.json`. Confirm its existence locally without displaying keys. Start the optional `start-python-health` command from the refreshed repo in a separate PowerShell. **Never** run `init`, delete DPAPI, register another node, or change Qwen ports.
6. **Observed runtime acceptance:** see `PYTHON_NODE_SIGNED_LIVENESS_RECORDED` in private Windows logs *and* the MFA owner GET returning the same known registered node ID, `liveNodeReportFresh:true`, new `serverReceivedAt`. With Python task stopped, `UNAVAILABLE` must be observed (stopping it is a separately gated fault-injection test; do not disrupt a healthy production node casually).
7. **No implied completion:** only after the signed Python health round-trip is proven, implement a separately authorised fixed-action Python proposal queue, durable result receipt, monitoring and a reviewed News/crawler job workflow. This increment does NOT provide general site↔Python RPC, mother DB connectivity from Python, live skills, model learning, crawling or News.

### Security boundaries

- No Windows inbound service is exposed to the internet. `127.0.0.1:8091` must remain bound to localhost.
- Do not copy API keys, HMAC secrets, config credentials, DPAPI private key, model transcript or raw account data to GitHub or ChatGPT.
- A signed report only attests that **the existing registered Windows identity claimed a local Python process observation at a timestamp**. It cannot attest real independent scientific quality, rights or valid autonomous improvement.
- The fresh-health poll adds a small bounded periodic task, not any limit to future evidence discovery/learning. It is optional, stoppable, revocable and defaults OFF. No hotfix to existing two Qwen Worker processes required.
