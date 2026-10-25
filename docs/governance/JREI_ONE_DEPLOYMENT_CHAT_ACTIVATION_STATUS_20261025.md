# JREI one-deployment chat readiness and truthful Qwen review — 2026-10-25

**Target:** `migration/bertina-linux6` on Bertina Linux/PHP 8.3, same mother DB `drjavad1_store`.
**Owner preference:** One audited deploy; no unnecessary PowerShell, phpMyAdmin, credential rotation, Qwen reinstall or schema duplication.

## Completed in code
- Existing site JREI assistant now truthfully introduces itself in Persian and English in **offline-guide mode**, including previously unrecognised questions. A fallback is not mislabeled as an actual remote model failure.
- Existing MFA admin JREI section now shows a small, ordered, read-only six-stage remediation plan computed from the original server's 12 private readiness gates. Never exposes secret values or offers a fake "activate everything" button.
- Existing Windows model quality utility now applies deterministic negative screening to model replies. A 12×7=48 answer, truncation, a Chinese-character intrusion in Persian or incomplete fixture campaigns are explicitly **BLOCKED_REMEDIATION_REQUIRED**. Remaining passing synthetic checks mean only **INDEPENDENT_REVIEW_REQUIRED**; there is no automatic model certification.
- Inference fixture max output increased from 120 to 256 tokens and synthetic model guidance clarified. This changes future test prompts but does not retroactively correct the actual 2026-10-25 Qwen report.
- An independent exact-path Windows process observer reads OS **PeakWorkingSet64** for the existing pinned `llama-server.exe` where Windows grants access. This is a process-lifetime peak working set, not GPU VRAM, total RAM or scientific acceptance. If unavailable the metric remains **null**, never guessed.
- Existing offline tests and new regression tests validate local vs live inference distinction and ensure original server-side private enablement, quality, signed-node and retention gates are preserved.
- Original news, examination, store, SEO/URL, tenant, payment and server deployment mechanisms are not changed.

## Critical limitations that a GitHub deploy cannot resolve
1. A deployment on Bertina **cannot cause a separate Windows PC to execute `start-chat`**, reinstall/update the locally installed scripts, or attest that the model was running.
2. A deployment alone **cannot authorize unapproved model quality**. The old 16-case evaluation demonstrably failed exact maths and Persian quality tests; its peak RAM was unmeasured. A new real review is required before any owner certification or public inference.
3. Deployment cannot magically provision missing private encryption secrets or switch disabled Bertina environment flags. Private backend/retention must actually run and leave authentic server evidence. No credentials go into GitHub.
4. Deploying a public JREI widget is not evidence of live inference. `GET /api/assistant/v1/capabilities` remains the server-authoritative public truth and defaults to `OFFLINE_GUIDE` when any approval is missing.
5. Node B is not required for the very first Node A dialogue. Do not revoke healthy keys or set up parallel databases.
6. User conversations are not automatically ingested for training. Any later feedback-learning must have separate valid consent, privacy controls and independent review.

## Acceptance for true independent first live dialogue
- Real verified model weights, license, output quality and measured RAM accepted by authorised reviewer.
- Same original Node A registered, approved for chat and sending a fresh signed **generative** poll.
- Original mother DB encrypted chat queue schema ready; host encryption secret and original retention Cron recently proven.
- Private backend/chat flags and final public-release owner acceptance genuine.
- Real end-to-end Persian and English messages through the public website correctly returned, without private text exposure or fabricated scientific claims.

## Release process
Source CI must pass before merging to canonical branch. Existing Bertina deploy workflow (manual owner authorization) must independently test/build/verify exact SHA. **No release is claimed by a successful source test**. A single Bertina deploy contains the above site changes. It will not bypass any independent host/PC gate.
