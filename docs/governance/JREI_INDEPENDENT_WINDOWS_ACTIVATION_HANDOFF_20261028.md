# Independent JREI Windows activation — 28 October 2026

STATUS: SOURCE ONLY. No model installed or launched on the owner PCs, no tests run, no site deployment.

## One-click owner setup (at final acceptance)

The canonical, already-synced Windows repository contains:

platform/jrei-v5/windows-worker/JREI-START-INDEPENDENT-AI.cmd

Double-click on each already-prepared Windows computer, read the notice, confirm Y, and retain the nonsecret output screenshot. This wrapper invokes jrei-independent-windows-setup.ps1 which uses existing services rather than installing a second chatbot:

1. Existing 30-minute GitHub canonical fast-forward-only repository sync.
2. Existing private 127.0.0.1:8092 JREI command-center Windows app installation and opt-in pinned source snapshot auto-updates.
3. Explicit official Apache-2.0 IBM Granite 4.1-3B Q4_K_M GGUF acquisition from the actual Hugging Face commit, verifying the published LFS SHA256, and starting the previously approved llama-server.exe under a new owner-only 127.0.0.1:8093 task. This is an existing open-source model backend, not a ChatGPT API subscription. GPU execution and Persian capability are not yet validated. CPU fallback is intentional until GPU compatibility is observed.

The former Qwen 8081/8082 tasks and files are not automatically deleted: no destructive cutover should precede verified replacement. Qwen is retired from the new JREI answer-routing path. Signed website workers, public URLs, private history and one-click Bertina deployment are unchanged.

## Automatic update governance

Windows source sync still runs every 30 minutes if previously installed. Source transfer is not automatic executable promotion.

Before an autonomous app upgrade can replace the working runtime, an independent integrated acceptance must actually pass; the source tree must be pinned by a separately issued governance document:

docs/governance/JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json

That ledger must contain:
- schema = jr.jrei.windows-owner-app-approval.v1
- approvedSourceTree = real git rev-parse HEAD:platform/jrei-python
- integratedAcceptancePassed = true
- ownerApprovedAutomaticPromotion = true

No fake approval ledger has been issued. The explicitly owner-invoked initial Install is separate and cannot certify quality on its own. The updater preserves the old version and attempts an original-task rollback if the new expected commit does not appear on the authenticated 8092 status.

## Source-present, not live-activated

- Native GitHub status/source/site-governor reader with restricted token and SHA-pinned owner-reviewed commits.
- Native Diffusers/PyTorch/Pillow image-studio drafts with WebP, 16:9, 1:1 and 4:5 variants, Persian/English alt, SHA256, and human editorial review. Installing an appropriate independently licensed image-model and Python libraries is still outstanding.
- Native optional PEFT LoRA training code; no weight updates performed.
- Native knowledge retrieval and code learning agendas; no independently proven learning gains.
- PC B GPU verification and dual-PC dispatch still outstanding. Merely installing the app on PC B does not merge GPU resources.

**Do not press the website deployment button for these changes.** No direct remote desktop or Windows execution is available in this chat; only the user can verify installation outcomes on the Windows PCs. No credentials should be pasted into ChatGPT.
