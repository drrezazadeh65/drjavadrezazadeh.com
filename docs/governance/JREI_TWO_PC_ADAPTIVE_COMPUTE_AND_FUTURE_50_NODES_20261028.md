# JREI: two actual owner PCs first, expansion to 50+ later (2026-10-28)

**Status:** source-only, canonical migration/bertina-linux6. No live GPU/VRAM benchmark, no Windows run, no production tests, no website deployment or database migration.

## Actual owner-reported equipment, not measured from a remote tool

- PC A: approximately 32 GiB RAM, one graphics adapter advertised as 8 GiB VRAM.
- PC B: approximately 16 GiB RAM, one graphics adapter advertised as 8 GiB VRAM.
- CPU type, actual free RAM, GPU chipset, GPU driver/backend, GPU compute suitability, bus, disk and inter-PC network are NOT verified by this source-only work.
- The 50-machine scenario is an **aspirational design scale**, not a claim that the owner owns or currently connects 50 PCs. Effective current target: the two existing independently signed Windows machines.

Two 8 GiB GPUs do NOT produce a shared 16 GiB GPU. Each accepts separate local jobs after compatibility checks. True distributed training would require partitioning, collective communications, network bandwidth, checkpoints and validated compatible accelerators. Nothing here asserts that this is active.

## Runtime planning, existing services only

The existing signed Bertina Ed25519 registered-node/nonce/lease queue remains the only distributed task dispatcher. One active lease per registered node is enforced by the server; current bounded design capacity is at most two simultaneous signed evaluation jobs if both PCs are individually connected and eligible. The future planner file \`platform/jrei-python/jrei_service/windows_fleet_planner.py\` is **preview-only** and must not claim to dispatch jobs, pool VRAM, or verify a hardware report. Existing node read-only health now includes aggregated counts and a future-50 shortfall indicator, not an execution entitlement.

The Windows owner app remains on loopback 127.0.0.1:8092, using the original SQLite database and original service. **No second controller, queue, exposed Windows port, desktop app or paid model API is introduced.**

Local JREI:
- Existing Win32 telemetry is the source of observed CPU load, free/physical RAM, disk headroom, and recent human input (\`windows_resource_envelope.py\`).
- \`windows_resource_policy.py\` only translates those observations into **admission decisions**, not a duplicate resource sensor. Physical RAM measured at runtime chooses 16 GB / 32 GB profiles.
- With input activity within three minutes, **only quick evidence retrieval and health views** should run: no heavy training, index rebuild, or bulk image rendering to disrupt gaming/office work.
- Heavy local neural CPU training starts on the measured 32 GB profile only when the owner has been idle for at least seven minutes, actual available RAM is at least 12 GiB, and CPU usage is under 45%; otherwise it defers. The 16 GB profile prioritizes lightweight indexed study and limited statistical training, not default neural jobs. Other resources are conserved.
- Each CPU training candidate independently rechecks owner activity every eight gradient steps; any pressure returns a truthful deferred/interrupted state. No candidate becomes an accepted assistant model through a lower training loss alone.
- PyTorch is an optional **Python code library**, not another app. GPU training is never assumed from an advertised 8 GB card: backend support, total and *free* VRAM must be measured by the actual runtime. Keep at least max(2 GB, 40% of physical GPU memory) for driver/desktop, plus 2 GB extra measured free headroom before attempting GPU training. Missing GPU readiness means CPU-only/deferred.

## Code reuse / copyright boundary

Eligible official repositories were researched through GitHub metadata:
- \`Lightning-AI/litgpt\` — Apache-2.0; useful public training recipes / design reference, not a separately deployed model.
- \`allenai/Olmo-core\` — Apache-2.0; public training system and optimizer design reference.
- \`EleutherAI/gpt-neox\` — Apache-2.0; large distributed Transformer training reference, too heavy to install wholesale on today's hardware.
- \`EleutherAI/lm-evaluation-harness\` — MIT; public evaluation methodology.

The public \`anthropics/claude-code\` GitHub repository did **not** expose a trustworthy open-source licence in checked metadata. It is therefore NOT authorised for wholesale copying into JREI. No leaked, reverse-engineered, proprietary or uncertain-licence source is taken. Third-party pretrained weights are not downloaded.

JREI's native source now includes **independently authored** byte-level statistical training and a compact PyTorch-library causal Transformer from random initialization. They use owner-reviewed licence-cleared, heldout-separated datasets; neither is an accepted general-purpose neural assistant and neither has been executed or evaluated in this source-only coding turn.

## Owner tasks

For now, none. Do not press site deployment. Wait for full integrated acceptance, gradual rollout and measured live PC capabilities. No active 50-node installation, distributed neural training or GPU acceleration is claimed.
