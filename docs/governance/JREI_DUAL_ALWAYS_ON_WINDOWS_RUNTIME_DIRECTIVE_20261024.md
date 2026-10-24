# JREI — Dual Always-On Windows Runtime Directive
Date: 2026-10-24
Status: OWNER CONFIRMED HARDWARE AVAILABILITY; IMPLEMENTATION AND DEPLOYMENT NOT VERIFIED
Canonical branch: migration/bertina-linux6
Mother database: drjavad1_store (additive migrations only)

## Confirmed owner decision
Both owner-controlled Windows computers are intended to remain powered on and connected to the internet continuously. Treat them as two independently authenticated, outbound-only compute nodes. This is an operational intent, not evidence of uptime, approved worker enrollment, successful inference, or model availability on both machines.

## Runtime topology
- Bertina Linux PHP 8.3/LiteSpeed is the HTTPS control plane: public API, authorization, quotas, encrypted short-lived queue, central database, retention janitor and administrative telemetry.
- Windows node A: Qwen3-4B GGUF with llama.cpp loopback HTTP bound exclusively to 127.0.0.1. Owner has observed real Persian completion locally. Local success does not establish production connectivity.
- Windows node B: independent worker for approved bounded educational ingestion/processing, and optional model inference only after its own weights, artifact SHA, quality and authorization are verified.
- Both Windows workers initiate outbound HTTPS to Bertina; never expose llama.cpp on a public IP or open inbound firewall ports. No direct website-to-Windows requests.
- Each node has distinct identity and revocable authorization. No shared signing keys; secrets never in GitHub or browser JavaScript.
- Scheduler routes jobs only to authorized, healthy, compatible nodes; timeouts, bounded retry, idempotency, lease expiry and graceful degradation must prevent duplicate work.
- If both nodes become unavailable, the public UI must display a truthful unavailable/fallback state, not simulated AI output.

## Activation sequence (not automatically performed by this document)
1. Independently verify the exact artifact SHA256, model version, llama.cpp loopback inference and hardware capacity on each machine.
2. Verify signed worker enrollment and revocation, HTTPS TLS validation, private configuration and DPAPI key protection on each machine.
3. Review and apply existing additive-only mother-database migrations after backup and schema dependency checks; do not create a parallel database.
4. Configure owner-reviewed model registry, node authorizations, encrypted queue secret and operational retention janitor; prove deletion and recovery.
5. Run end-to-end inference with real Persian/English questions, adversarial input, limits, consent and source attribution; verify no accidental exposure of reasoning content.
6. Enable persistent worker startup/restart via owner-authorized Windows Task Scheduler or service configuration; configure health checks and restart after power/network loss.
7. Verify two-node failover and observe CPU, memory, latency, queue backlog, errors and daily cost/energy.
8. Only then enable production routes and manually deploy using the repository's established guarded Bertina release workflow.

## Knowledge growth and learning
Knowledge ingestion is not model-weight self-training. Store only rights-cleared, provenance-tracked, deduplicated, quality-checked material in the existing architecture. New evidence may improve retrieval after review. Model fine-tuning, automated code edits and schema mutations require isolated evaluation, regression checks, human authorization and rollback; never self-modify production without gates.

## Non-negotiable truthfulness
Two powered-on computers do not by themselves establish 24/7 SLA, automatic failover, self-learning or production readiness. Do not mark any of those features active until telemetry and end-to-end acceptance prove them. No publication, live migration, Windows configuration or deployment is authorized or performed merely by this source directive.
