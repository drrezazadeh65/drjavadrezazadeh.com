# JREI 16-GB RX580 GPU pilot → existing Windows owner app (2026-10-29)

**Status: CANONICAL SOURCE STAGED; NOT WINDOWS-RELEASED, NOT SITE-DEPLOYED, NOT FULLY ACCEPTED.**
Canonical development branch: `migration/bertina-linux6`. Commits carry `[skip ci]`; no tests, dispatches, deploys, database changes, or Windows remote actions in this source-only phase.

## Actual owner-observed results on the 16-GB Windows PC

- AMD Ryzen 5 5600X; 15.9 GiB physical RAM; AMD Radeon RX 580 with 8192 MiB dedicated GPU memory.
- Windows 11; Vulkan loader present, official `llama.cpp b11932` Vulkan x64 ZIP SHA256 verified.
- Qwen3-4B-Q4_K_M GGUF size `2497280256` bytes; SHA256 `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5` matched.
- Owner explicitly accepted the private experiment and model rights; the existing independent V4 GPU setup created `gpu-model-owner-v4.json` and `gpu-owner-16gb.json`, registered task `JREI-GPU-Qwen-Private` and started a private `127.0.0.1:8082` llama.cpp service.
- Owner observed the `jrei-gpu-lab` model in `/v1/models`, a nonempty model completion, and a reported 19.67 token/s short generation. Dedicated GPU memory observed to rise from about 0.9 to about 3.6 GiB. **This strongly suggests GPU allocation; complete 37/37 layer offload has NOT been independently established.**
- Original signed website worker identities and 8081/8091 were not modified by the V4 setup. A completed website-to-node signed inference job on this GPU node is **not verified**.

## Current Windows app mismatch

`platform/jrei-python/jrei_service/windows_language_backend.py` deliberately allows owner-approved **native, JREI-trained checkpoint** routing only and refuses Qwen endpoints. It must remain untouched as the native model path. The owner's now-running Qwen is an external open-weights model, not a JREI-trained model, and does not become one because its HTTP alias is prefixed `jrei`.

New source-only additions:
- `windows_gpu_pilot.py`: optional, separately owner-consented, hash-verified direct loopback adapter with an explicitly labelled third-party draft backend. **No internet requests or cross-node inference**; no downloads, auto-starts, command execution, device changes or claims of scientific validity.
- `windows_command_center.py`: native backend first; when that is unavailable, separately approved pilot can generate **unverified** draft text; if absent/unhealthy, original locally trained / evidence fallback persists. Private status indicates actual native vs. optional third-party pilot and retains the original 8092 auth boundary.
- `jrei-gpu-pilot-consent.ps1` and `JREI-GPU-PILOT-LINK-V18.cmd`: owner-confirmed, fail-closed **consent staging** only for the already-approved 16-GB local model and executable. Generates one small JSON consent file in the existing private JREI command-center folder. It does not restart processes or bypass the immutable Windows application release gate.

### Important security blocker before permanent activation

The owner's live `llama-server` stderr reported **no API key** and permissive CORS. Loopback alone is not an adequate anti-browser CSRF control. The official llama.cpp b11932 server documents `--cors-origins localhost`, `--no-cors-credentials` and `--api-key-file`. Before marking this pilot secure/production-ready, a separately authorized update of the **existing owner-approved GPU task** and an authenticated app-to-local-model adapter are required. Do not automatically replace its frozen launcher, copy secrets into GitHub, expose 8082 on LAN/WAN or silently switch the running process. No security hardening of that running Windows task has yet been performed.

### Final-acceptance sequence, not automatic deployment

1. Review owner-specific model consent and license, exact task launcher and immutable source revision; keep 8082 loopback.
2. Close the no-key/CORS browser exposure with owner-approved secure startup, local secret storage, authenticated requests and verified logout/revoke path.
3. Run one final integrated Windows acceptance on this PC, including real GPU layer offload log, memory and thermals under sustained load, Qwen accuracy/bilingual quality, review of source claims, authenticated 8092 UI conversation and local fallback when 8082 stops.
4. Independently verify existing 32-GB PC (owner-defined Node B), its node identity, model and network status. **Do not overwrite the working 32-GB runtime.**
5. Preserve the existing outbound Ed25519 signed website worker job queue and lease/nonce controls for any later cross-node routing. No shared VRAM, inbound firewall holes, separate orchestrator, or second primary database.
6. After owner-authorized final acceptance, use the existing one-click Windows release / source snapshot approval procedure. This source commit alone does NOT change the installed v18 application; enabling consent before that release only stages a setting.
7. Website/Bertina production remains unchanged, and its owner one-click deployment policy remains frozen.

## Reporting rules

`GPU_TASK_REGISTERED` is not evidence of steady-state availability. `/v1/models` returning `jrei-gpu-lab` establishes endpoint liveness and model alias, **not native model ownership** or full GPU offload. Short completion is not quality acceptance. Model files are never included in GitHub, the released EXE, or this documentation. The work does not create a third processing node.
