# JREI-LM Node A — observed local inference evidence and pending gates

**Date:** 2026-10-25  
**Source:** Owner-shared Windows 11 console screenshots in the active project conversation  
**Status:** Local inference verified by owner-visible run; site-integrated inference NOT verified  
**Canonical branch:** `migration/bertina-linux6`  
**Production:** Bertina (no JREI public activation during this step)

## Actual observed technical evidence

- Node A: Ryzen 5 5600G / 32 GB Windows owner machine.
- Existing `llama-server.exe` discovered and verified, no Python required.
- Existing Qwen3-4B GGUF reused without redownloading weights. Its source blob was linked under `%LOCALAPPDATA%\JREI\models\Qwen3-4B-Q4_K_M.gguf`.
- Model SHA-256: `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5`.
- Runtime executable SHA-256: `0dd502d324329cf7be521d8bdb68a677a94f1fa3815f7444dd342778b484f820`.
- Loopback HTTP: `127.0.0.1:8081`; `/health` reported `{"status":"ok"}`.
- Manual model test returned visible Persian `سلام` with `finish_reason=stop` and `reasoning_length=0` after disabling Qwen thinking.
- Staging runner executed with `-OwnerApproved -StagingOnly`, used `--alias jrei-qwen3-4b-q4km`, and logged successful model load.
- Final synthetic smoke: `MODEL_AND_RUNTIME_SHA256_VERIFIED`, `LOOPBACK_MODEL_HEALTH_OK`, `VISIBLE_FA_COMPLETION=True`, `COMPLETION_FINISH_STOP=True`, `SERVER_ALIAS_MATCHES_JREI=True`, `TECHNICAL_LATENCY_MS=509`.
- The 509 ms observation is a **single short-request latency**, NOT throughput, a p95 latency, load capacity, safety performance, or independent quality certification.
- The owner dashboard separately showed signed Node A/Node B worker connectivity; this does not prove either node currently serves generative website requests.
- `PUBLIC_ACTIVATION_OFF` remained true during the staged tests.

## Official model information to be independently accepted

- Model source: https://huggingface.co/Qwen/Qwen3-4B-GGUF
- Published model licence: Apache-2.0
- Published licence file: https://huggingface.co/Qwen/Qwen3-4B-GGUF/blob/main/LICENSE
- The issuer's public metadata and license are evidence to REVIEW; this record is **not** legal approval of every usage and does not certify the exact cache artefact's origin beyond its observed local digest.

## Remaining gates before public JREI-LM

1. Verify current GitHub acceptance CI and production release workflow; owner has not observed an integrated deployment of this JREI-LM extension.
2. Check Bertina mother DB `drjavad1_store` for `jrei_local_model_registry`, `jrei_local_chat_node_authorizations`, and `jrei_local_chat_jobs`; apply only missing pre-reviewed additive migrations with backup/restore evidence and no parallel database.
3. Using the MFA owner dashboard, propose the measured Node A Qwen metadata (source-only prefill supplied), review rights separately, and do NOT mark quality accepted without independent evaluation evidence.
4. Measure multiple independent multilingual and safety fixtures; retain private evidence and correctly measured p95 latency, tokens/s and peak RAM, not estimates.
5. Approve Node A generative task grant **separately** from its already-tested evaluation-worker authorization.
6. Verify private queue encryption key, privacy janitor Cron success, private switch and public release acceptance; never echo credentials or use the public web root to store visitor prompts.
7. Start `jrei-worker.mjs start-chat` only with all local/remote gates satisfied, verify a fresh signed chat-specific poll on Bertina and full website-to-Windows-to-website response.
8. Perform end-to-end security, privacy, scientific, resilience, duplicate-job, throttling, and latency acceptance before public availability. Run any GitHub production deployment only through the existing owner-authorized guarded workflow.

**No claim:** Windows background startup, two-node generative failover, News AI integration, online examination generation, payments, self-training, continuous autonomy, scientific validation, and general public JREI-LM availability all remain unproven by this local smoke.
