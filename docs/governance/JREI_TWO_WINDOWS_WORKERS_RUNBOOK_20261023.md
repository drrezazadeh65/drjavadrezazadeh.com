# JREI V5 — Two Independent Windows 11 AI Processing Nodes

**Owner hardware verified from screenshots, 23 October 2026.**  
**Canonical branch:** `migration/bertina-linux6`.  
**Activation state:** SOURCE ONLY / NOT INSTALLED / NOT TESTED / NOT CONNECTED.  
**Hard rule:** original Bertina hosting remains the single public site, shop, owner dashboard, payment engine and mother database `drjavad1_store`. Do not deploy, migrate, register Windows startup, install models, or start a local network service before the owner's final release authorization.

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

## Future owner-controlled installation — after final acceptance ONLY

Complete every step **independently on each PC**. The commands are operational instructions, not evidence of a completed setup.

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
- Confirm the staged additive mother-DB migration's foreign keys and charset/collation against actual existing mother DB tables before authorizing installation. **No migration executed.**
- Confirm no child/student private corpus, personal conversation, copyright-restricted scanned exam or fabricated answer-key claim crosses the PC boundary. Scientific results remain source-reviewed and administratively gated.
- If compromised: owner revokes only the affected node's public key in original MFA dashboard. In-flight jobs become `NEEDS_REVIEW`; surviving independent node continues eligible tasks. Never silently replay an unknown side effect.
- Roll back by disabling/revoking node keys, disabling `JR_JREI_HYBRID_ENABLED`, closing optional local loopback model server and unregistering the owner opt-in startup task. Preserve existing site payments, profiles, JREI static fallback and mother DB.

**Final reporting:** Both personal PCs are shown powered on in screenshots and the source foundation now supports two independently authenticated outgoing Windows workers. **The worker software has not been installed, executed, benchmarked or connected on either machine**, and no LLM inference has been accepted or published.
