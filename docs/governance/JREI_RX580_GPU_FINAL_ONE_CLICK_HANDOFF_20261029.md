# JREI RX580 16-GB secure GPU — final owner handoff (2026-10-29)

**Disposition: Windows owner-action package prepared; on-device activation NOT yet observed; separate JREI app release NOT accepted.**

Source branch: `migration/bertina-linux6`. Existing production site, one-click GitHub/Bertina deployment path, original 32-GB node and JREI v18 remain unchanged by source preparation.

## Observed from the actual 16-GB PC
- Windows 11, Ryzen 5 5600X, 15.9 GiB RAM, Radeon RX 580 8 GiB dedicated VRAM.
- Owner-installed Qwen3-4B-Q4_K_M GGUF exists, size `2497280256`, SHA256 `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5`.
- Official Vulkan llama.cpp b11932 ZIP hash verified; the original private GPU task `JREI-GPU-Qwen-Private` ran the alias `jrei-gpu-lab` on `127.0.0.1:8082`.
- Nonempty completion was observed; GPU dedicated VRAM usage rose from 0.9 to 3.6 GiB. Precise all-layer offload and long-running reliability remain unverified.
- The original service is **not authenticated**; the source-only `windows_gpu_pilot.py` deliberately refuses to connect to it.

## Frozen approved upgrade sequence
1. Owner downloads `JREI-GPU-16GB-FINAL-AUTHENTICATED.zip` from the current conversation and extracts all.
2. Owner runs `JREI-GPU-FINALIZE-16GB.cmd`, and authorizes the local action. The bootstrap downloads only these three scripts from **immutable commit URLs**, checking expected Git blob SHA-1:
   - `jrei-gpu-secure-runtime-v1.ps1` at `c608d1de713542f3190da517794ea9fb84ecbb9e` (blob `9f097308d55839c0a1e691fb5af8cef50d7efa6e`).
   - `jrei-gpu-secure-switch-v1.ps1` at `1ce3b71217c15e93a0b205014d9c8eba05459719` (blob `9aae3e4d24534b6631ee14dcbc9df559f6dbcd57`).
   - `jrei-gpu-pilot-consent.ps1` at `058a406e1b728d7c932856ec5e376ddf991ae4df` (blob `a00f2dcab1698566114d96599f14b57be4b276bb`).
3. The staged secure launcher verifies the already installed model, original V4 owner-approved launcher and runtime binary hashes, checks task ownership, creates a per-user API key with Windows ACL and copies a pinned snapshot. No second task is created.
4. The switch records original Task Scheduler action, stops the original GPU task, waits for 8082 to clear, and if necessary stops **only a verified owner-owned exact-hash llama-server process**.
5. The switch changes **only the existing task action** to the immutable hardened launcher. It requires a 401 for unauthenticated model inventory, a valid authenticated model listing, denial of hostile Origin CORS and a nonempty synthetic inference reply. On failure, it attempts to restore the original V4 action. A blocked rollback is explicitly reported.
6. On secure readiness, the separate owner-model consent is written only after checking authenticated access, without changing the original private JREI worker config or exposing public AI.
7. A local summary is opened in Notepad; full on-device receipt is necessary before declaring success.

`llama-server` secure options: `--host 127.0.0.1 --port 8082 --api-key-file ... --cors-origins http://127.0.0.1:8092 --no-cors-credentials --no-webui`. The private token stays on the same Windows user account; never copy it into source control, screenshots or chat.

**Boundary:** This completes only the *GPU task hardening* when validated on-device. The installed Windows v18 app is on an immutable source snapshot and cannot use new `windows_gpu_pilot.py` merely because GitHub was updated. The native model remains native-only; the third-party Qwen pilot remains explicitly labelled. The canonical `JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json` remains default-deny until real final two-PC Windows app acceptance, with source tree hash and owner authorization. Nothing in this handoff modifies that approval file.

## Needed for full two-PC release
- Real private authenticated 8092 chat using updated approved Python source; native fallback and model attribution verified.
- End-to-end signed Node A/Node B outbound-only processing across existing Bertina Ed25519 queue; no shared GPU memory and no new primary DB.
- Read-only stability, performance, driver/thermal, bilingual model quality and all-layer GPU offload evidence, followed by final acceptance of each actual Windows machine.
- Owner controls final Windows app release and frozen one-click website deployment. Neither has been executed here.

No on-device test was fabricated. The only available execution evidence before this handoff was owner-supplied screenshots and reports of the *original* private V4 installation.
