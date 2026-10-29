# JREI Radeon RX580 16-GB node: authenticated GPU bridge source candidate

**2026-10-29; canonical branch `migration/bertina-linux6`; SOURCE ONLY, NOT ACTIVATED.**
No Windows code restart, production deployment, CI, tests or acceptance claim was executed.

## Existing owner-observed pilot (not independent technical acceptance)
Owner supplied 16-GB Ryzen 5600X RX580 (8192 MiB VRAM), the official llama.cpp b11932 Vulkan x64 ZIP, and SHA256-verified Qwen3-4B Q4_K_M GGUF (2497280256 bytes, SHA256 `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5`). The owner saw `jrei-gpu-lab` on `127.0.0.1:8082/v1/models`, a real completion, and dedicated VRAM use rise from ~0.9 to ~3.6 GiB. Precise per-layer GPU offload is **not proven**. The owner-observed current V4 launch uses no API key, permits broad CORS, and starts a UI; this is NOT suitable for promotion to an app-connected pilot.

## Relevant original sources preserved
- `platform/jrei-python/jrei_service/windows_command_center.py`: same owner-only authenticated 8092 app, conversation tasks, and SQLite; same native model first.
- `windows_language_backend.py`: native JREI-trained model policy unchanged, JREI-native provenance requirement **never** impersonated using Qwen.
- `windows_gpu_pilot.py`: optional private third-party model **draft only**; refuses operation without owner consent, validated GGUF/runtime hashes, per-user local secret file, actual API-key enforcement and CORS restrictions. It never exposes 8082 to the website or writes code autonomously.
- `platform/jrei-v5/windows-worker/jrei-gpu-pilot-consent.ps1`: explicit opt-in creates `%LOCALAPPDATA%\JREI\command-center\gpu-pilot-consent.json` only.
- `platform/jrei-v5/windows-worker/jrei-gpu-secure-runtime-v1.ps1`: separate candidate. `Stage -OwnerApproved` checks the *already-installed* V4 owner task, pinned model, binary, and original launcher, creates a cryptographic API key in the existing private command-centre folder with per-owner Windows ACL, and copies an immutable SHA256-manifest-pinned launcher snapshot. This does **not** modify the already registered Windows Task Scheduler action or restart the running process. `Run -OwnerApproved` can function only after a separately reviewed, final-approved migration of that **same** scheduled task to the pinned snapshot; it checks the task's actual action, original manifest, owner, artifact hashes and GPU capacity.
- The future secure `llama-server` invocation uses `--api-key-file`, `--cors-origins http://127.0.0.1:8092`, `--no-cors-credentials`, `--no-webui`, `--host 127.0.0.1` and the already-proven Q4 GGUF.

### Why the opt-in source cannot presently answer
The source adapter sends an unauthenticated request to `/v1/models` and requires a **401** from the pinned server. It also probes a hostile browser Origin with OPTIONS and rejects permissive ACAO/credentials. Only then does the Python adapter read a local, per-user 64-hex secret and issue authenticated model requests. The owner-observed V4 server allows unauthenticated model access, so until the secure task transition occurs this adapter MUST return `OFF_OR_UNAVAILABLE`; the original JREI native/extractive fallback remains.

## Deliberate release boundary
No automatic task replacement/rollback, Python 8092 restart, installer dispatch, machine configuration change or website publication has been performed. The existing application v18 cannot use this staged source until the current immutable Windows release gate accepts the new source tree in one final owner-authorized integrated acceptance. An acceptance receipt cannot be manufactured by changing flags.

Before final promotion, independently establish:
1. A current source tree hash and exact owner-approved Windows v18+ release manifest.
2. Same owner Windows SID, Task Scheduler principal and existing V4 launcher SHA; do not mix up 16-GB Node A and 32-GB Node B.
3. Tested replacement of **only** the original scheduled task, with recovery of the original approved snapshot and no duplicate task.
4. Authentication: anonymous `/v1/models` requests are denied; valid owner secret works; untrusted Origin has no CORS allowance.
5. Verified local original 8092 API conversation with third-party label; native-first and offline fallback, cancellation, quality and provenance.
6. GPU allocation under real load and actual 37/37 layer loading evidence, RAM/VRAM margin, thermal behavior, and safe persistent restart on login.
7. Independently verify the 32-GB PC's own signed Node B identity, status, backend, and any approved remote lease path. Two GPUs remain independent; the 16-GB GPU does not automatically distribute work over Bertina.
8. Public site and Bertina signed task queue remain untouched; no public Qwen activation or server ingress. Owner-only one-click site deployment policy is unchanged.

**No test or deployment was run during this coding phase.** Published website URLs, the owner-only Windows database, native model training record and existing processing workers are unchanged.
