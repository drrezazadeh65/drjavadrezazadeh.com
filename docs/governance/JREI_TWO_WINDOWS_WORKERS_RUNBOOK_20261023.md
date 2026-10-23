# JREI V5 — Two Independent Windows 11 AI Processing Nodes

**Owner hardware verified from screenshots, 23 October 2026.**  
**Canonical branch:** `migration/bertina-linux6`.  
**Live observed state, 23 October 2026:** Nodes A and B were independently registered and displayed ONLINE in the owner dashboard with signed HTTPS heartbeats and CPU/RAM telemetry after the approved one-file signature hotfix. This is a historical observation, NOT proof they remain connected now, have a corpus or can perform model inference.  
**Hard rule:** Bertina remains the single public site, shop, owner dashboard, payment engine and mother database `drjavad1_store`. The original node registration and initial private server activation were already completed; do NOT repeat key generation, node registration or the signature hotfix. The NEW code and additive governed-corpus migration remain staged until the owner's final release authorization.

## Two separately managed machines

| Independent role | Primary node A | Secondary node B |
|---|---|---|
| Proposed provider type | `LOCAL_WINDOWS_WORKER` | `LOCAL_SECONDARY_WORKER` |
| Owner screenshot hardware | AMD Ryzen 5 5600G, 6 cores/12 threads (CPU product line), 32 GB RAM, Windows 11 Pro x64 | AMD Ryzen 5 5600X, 6 cores/12 threads, 16 GB RAM, Radeon RX 580 8 GB, Windows 11 x64 |
| Evidence limit | Primary GPU accelerator/VRAM is **not confirmed by the screenshot**; additional previously supplied computer specifications are not GPU benchmark evidence | RX 580 8 GB is shown in Windows; support for any Vulkan/OpenCL/ROCm backend is **not established** |
| Intended first workloads | Owner-reviewed Persian/English BM25 retrieval comparisons, CPU-priority document extraction and future authorized lightweight local language inference | Independent public-evidence retrieval holdout work, corpus deduplication / light licensed document preparation; separately selected smaller CPU quantized model after benchmarking |
| Worker execution limit | One active job per node | One active job per node |
| Identity | Unique generated Ed25519 keypair protected by *that computer's* Windows user DPAPI | Different unique Ed25519 keypair, protected by its own Windows user DPAPI |
| Network | HTTPS **outbound** to Bertina only; mobile hotspot and CGNAT supported | HTTPS **outbound** to Bertina only; no public inbound / router forwarding |
| Failure | Offline when signed heartbeat expires; existing store and static educational tools remain online | Independently offline; any leased interrupted work is `NEEDS_REVIEW` rather than automatic repeat |

**Do not add the 32+16 GB into one accessible 48 GB RAM address space, nor combine Radeon RX 580 VRAM across computers.** A CPU/RAM/GPU figure on the owner dashboard is reported by a signed node; it is not a scientifically independently benchmarked capacity number.

## New forward-only source files

- `platform/jrei-v5/windows-worker/jrei-worker.mjs`: locally run Node.js 20+ application. Ed25519 outbound signing uses the **existing** `POST /api/jrei/v1/worker/poll`, `/heartbeat` and `/complete` endpoints. The browser never sends private keys or commands. Polls 20–60s with exponential offline backoff; signed Bertina nonce has 90s clock bound. Requires computer clock synchronization; Windows may recover automatically when hotspot returns.
- `platform/jrei-v5/windows-worker/jrei-eval-task.mjs`: isolated `worker_threads` calculation using **only a separately pre-approved, local, nonpersonal, reviewed public corpus** with matching SHA256. It returns bounded statistical aggregate counts, never user prompts/files. Worker task allowlist is currently **only** `REVIEWED_PUBLIC_RETRIEVAL_EVALUATION`; no arbitrary remote command and no trained model.
- `platform/jrei-v5/windows-worker/jrei-windows-dpapi.ps1`: fixed-owner PowerShell DPAPI encryption/decryption; dedicated local key file, current-user ACL. Key cannot be recovered on a different PC by copying the encrypted file.
- `platform/jrei-v5/windows-worker/jrei-worker-config.example.json`: deliberately nonworking, placeholder node ID and zero datasets; must never contain a personal identifier, private key, SMTP token, payment credential or learner conversation.
- `platform/jrei-v5/windows-worker/jrei-loopback-model-adapter.mjs`: **staged, not connected** local llama.cpp OpenAI-compatible adapter, allowlisted `http://127.0.0.1:<localport>/v1/chat/completions` only. Requires an approved GGUF model, model artifact SHA256, checked license, CPU/Windows evidence and explicit owner authorization. Returns **unverified draft** that must pass JREI evidence verification before any public user use. No model download, startup, GPU acceleration or model weights are automated.
- `platform/jrei-v5/windows-worker/jrei-managed-startup.ps1`: optional manual logon startup registration/remove under the limited current user, not executed or scheduled by repository commits.
- `api/jrei-hybrid-worker.php` reuses Bertina signed Ed25519 authentication, replay nonce protection, bounded public-corpus job queue/leases and owner review; concurrent polls on the *same* node are serialized before lease allocation.
- `api/jrei-hybrid-owner.php`, `docs/migrations/20261023_jrei_hybrid_worker_mother_mysql.sql`: original private owner registration, disable/revoke, queue and signed metrics. Staged migration now forbids duplicate Ed25519 public-key registration.
- `assets/js/operations-jrei-hybrid-nodes-v1.js`, scoped CSS and original `/fa/app/admin/` + `/en/account/admin/`: separately manage node A and B with MFA-protected disabled-by-default registration, status, queue and emergency stop/revocation. Missing DB => **unknown**, not connected.

## Historical initial installation instructions — ALREADY COMPLETED on both PCs

The following section records the original setup procedure for traceability. **Do not execute these initialisation or public-key registration instructions again on either already-connected computer.** Only the new dataset-provisioning and release steps below remain future actions.

1. Obtain an approved Node.js 20+ x64 build from its authoritative source and verify license/distribution. Confirm PowerShell 5.1 (or tested compatible), 64-bit Windows, disk space, current-user DPAPI availability, CPU/RAM temperature limits and synchronized Windows clock. Do not authorize paid services, GPU upgrades or substantial model downloads.
2. Copy/checkout the **approved tagged repository release** to a trusted private local path. Do not launch any unreviewed scripts from email, GitHub PR content or a model draft. Make a private Windows-user-only directory such as `%LOCALAPPDATA%\JREI\`. Do not share files between the two computers.
3. From the local `platform/jrei-v5/windows-worker` directory, use **once on PC A**:
   `node jrei-worker.mjs init`.
   It prints a **public Ed25519 key** to register, creates its matching DPAPI-encrypted private key at `%LOCALAPPDATA%\JREI\jrei-worker-key.dpapi`, and refuses to overwrite an existing key. Repeat `init` **separately on PC B**. Never paste the private key, Windows Device ID or Product ID into ChatGPT, Drive, GitHub or the dashboard.
4. In the existing master admin **with freshly verified SUPER_ADMIN MFA**, open **Two AI computers / دو رایانه هوش مصنوعی**. Register PC A's public key as type `LOCAL_WINDOWS_WORKER` and PC B's as `LOCAL_SECONDARY_WORKER`. They are **REGISTERED DISABLED**; each must receive its own server-issued UUID. Do not enable until host HTTPS, PHP Sodium, schema/lease integration, source rights, safe corpus and failover acceptance have passed.
5. Create a **separate** private worker config on each Windows PC from `jrei-worker-config.example.json` with its own node UUID. Use the fixed origin `https://drjavadrezazadeh.com`. Configure `limits` appropriate to each PC. `datasets: []` means no approved evaluation tasks and no content will be processed. Dataset entries, if later authorized, MUST be local reviewed public corpus files, exact digest-matched to a separate owner-approved Bertina catalogue and have `originalSourceReviewed:true`; no identity, student records, pirated examinations or private academic correspondence.
6. **After release authority** and explicit private `JR_JREI_HYBRID_ENABLED=true` activation, start on *each respective computer*:
   `node jrei-worker.mjs start "C:\<private-folder>\jrei-worker-config.json"`.
   The Windows process polls Bertina over outbound HTTPS. There is **no listening public service**. Without an approved dataset, public-key owner enablement, and compatible private config, no evaluation request is ready for execution.
7. Optional **owner-triggered** automatic startup for the current user after acceptance:
   `.\jrei-managed-startup.ps1 -Mode install -ConfigPath "C:\<private-folder>\jrei-worker-config.json" -OwnerApproved`.
   This only registers a task to start **at next owner logon**; it is not a Windows service, cannot run across arbitrary sign-out states and should be removed by `-Mode remove -OwnerApproved` if the machine must no longer provide processing.
8. Monitor each node separately in bilingual master admin. Confirm source-type, independent public key, real signed heartbeat age, CPU/RAM telemetry, `GPU unknown` until a driver/backend test is completed, bounded queue, lease review and revocation. Source-only dashboard UI or photos of Windows machines do not prove they have communicated with Bertina.
9. Keep fallback unchanged: the website/shop/master DB and static educational tools operate while both PCs are off or hotspot is unavailable; no fake LLM completion, re-dispatch of unknown interrupted jobs or stored raw private conversations. The signed API's current review queue is **not** a functioning public chatbot or a guarantee of 24/7 availability.

## Model-selection gate (both PCs)

**Initial candidate** after authorized installation: modest multilingual Persian/English GGUF quantized open-weight language model, selected by *actual licence, benchmarked Windows 11 CPU inference, disk and RAM headroom*. Do not select a model using its name, marketing benchmark, presumed ROCm/CUDA, or raw RX 580 VRAM alone. The 5600G/32 GB system is a stronger first candidate for heavier CPU inference. The 5600X/16 GB system is independently suited to lighter CPU evaluation. Never make quantized weight transfer between PCs a presumed shared VRAM system.

Expected measured acceptance inputs (all **UNKNOWN** today): actual CPU tokens/s, first-token response delay, p50/p95 inference latency, peak process/system RAM, thermal sustainability, multilingual Persian accuracy on licensed held-out examples, JSON fidelity, citation verification, backend driver/GPU support (if any), ethical/guardian constraints and hotspot failure/reconnect behavior.

## Hard acceptance and rollback requirements

- Complete a *single final* owner-approved test campaign: Windows key creation, DPAPI restricted access and backup/replacement, Node runtime dependency audit, localhost-only model binding, TLS with correct origin/path and no redirects, PHP Sodium support on Bertina, exact signed body contract, 90s clock skew, nonce replay refusal, two-node simultaneous poll arbitration, job expiration/review, queue limits and launch/stop behavior.
- The ORIGINAL hybrid worker tables are already live sufficiently for two nodes to register and authenticate; do not rerun that migration. The NEW governed-corpus and node-offer migration is additive and remains **staged, not executed**. Inspect its fields and mother DB compatibility at final QA.
- Confirm no child/student private corpus, personal conversation, copyright-restricted scanned exam or fabricated answer-key claim crosses the PC boundary. Scientific results remain source-reviewed and administratively gated.
- If compromised: owner revokes only the affected node's public key in original MFA dashboard. In-flight jobs become `NEEDS_REVIEW`; surviving independent node continues eligible tasks. Never silently replay an unknown side effect.
- Roll back by disabling/revoking node keys, disabling `JR_JREI_HYBRID_ENABLED`, closing optional local loopback model server and unregistering the owner opt-in startup task. Preserve existing site payments, profiles, JREI static fallback and mother DB.

**Reconciled final reporting (23 October 2026):** Signed heartbeat evidence and owner screenshots confirm that **both independent Windows Workers connected to Bertina** after the signature hotfix. The outbound authentication/telemetry milestone is complete; no reviewed holdout was yet provisioned on either node (`datasets: []`), no completed retrieval evaluation has been accepted, and no downloaded/running local LLM or model training was verified.

## 23 October dispatch revision — prevent wrong-computer jobs

The signed worker polling contract is now `{ "metrics": ..., "datasets": [...] }`, where each `datasets` entry contains only the **local** approved dataset identifier, evidence digest, held-out-case digest and evaluation version. Both node signatures are distinct. `api/jrei-hybrid-worker.php` independently checks each declaration against the **private Bertina `jrei_hybrid_approved_datasets` register**, restricts each `SELECT ... FOR UPDATE` candidate to a matching approved tuple, and serializes simultaneous polls by locking the authenticated node row. If a Windows PC has `datasets: []`, or Bertina has not provisioned matching permitted reviewed-public datasets, its poll returns **no job**. No arbitrary source URL, personal record, copy of a document, external-model command or unreviewed dataset can be transferred to acquire work.

**Development update:** The NEW governed-corpus workflow is now implemented in branch source: an additive mother-DB table, owner proposal/approval/suspension actions, version-and-policy digest constraints, signed node dataset advertisements, dashboard corpus/queue controls and auditable result review. Its deployment, migration and genuine holdout acceptance are NOT yet complete. With both private worker configs still reporting `datasets: []`, neither node is eligible for the first approved real evaluation; this is not a connectivity fault. No hardware power-on photo constitutes that approval.

The staged loopback GGUF adapter is *separate from the signed job handler*; its existence does not authorize a new `task_type` or let public learners reach the owner's PC. All generation remains unverified JREI drafts behind existing evidence gates. Do not load model weights or start a localhost HTTP server until an independently accepted benchmark/release.
