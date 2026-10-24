# JREI dual-node release handoff — 2026-10-24
Branch: migration/bertina-linux6
Status: SOURCE HANDOFF ONLY; NOT PRODUCTION ACTIVATION

## Verified from owner screenshots
- Windows 11, Node 24.22.1, Git 2.56.0.
- Canonical branch successfully cloned to Desktop/JREI-Development with clean status.
- Qwen3-4B Q4_K_M local llama.cpp responded in Persian via loopback 127.0.0.1:8081; observed approximately 8 tokens/second on CPU.
- Both owner Windows machines are intended to remain on. Only one model endpoint has been observed actually working; second node's runtime is unverified.

## Existing source components to preserve
- api/jrei-local-chat.php: encrypted short-lived local inference queue, disabled-by-default approved nodes.
- platform/jrei-v5/windows-worker/jrei-worker.mjs: outbound-only worker with start-chat command.
- docs/migrations/20261024_jrei_local_inference_queue_mother_mysql.sql: additive-only mother DB migration, not applied by this handoff.
- .github/workflows/deploy-bertina.yml: owner-only manual workflow_dispatch, with phased_live_audit and full_masterplan scopes.

## Release classification
A) **Code-only guarded snapshot**: eligible for review via phased_live_audit, subject to existing release gates. This explicitly defers SQL and live AI activation. The website must not advertise local inference, self-learning or two-node failover as operational.
B) **Live dual-node JREI**: NOT READY to certify. Requires owner-applied migration, owner-approved node enrollment, signed HTTPS worker verification, encryption secret, live janitor, machine auto-start, queue-to-model-to-response end-to-end tests and two-node failover.
C) **Full masterplan**: requires all pre-existing masterplan acceptance; not implied by source CI or successful local Qwen responses.

## Operator release sequence
1. Freeze intended commit and inspect GitHub Actions status for that exact SHA; resolve failures before release.
2. Run existing source-only acceptance gates and confirm current live SHA, backup/restore ownership and no regression to commerce, SEO, private data or public routes.
3. If the owner explicitly accepts a source-only website snapshot, use GitHub Actions > Deploy to Bertina > Run workflow, branch migration/bertina-linux6, scope phased_live_audit. Leave SHA inputs blank for auto-detection, review the owner acknowledgements, and monitor all jobs.
4. Do not call the snapshot an AI go-live; keep local-chat flags and authorizations disabled until separately accepted.
5. To go live with AI, first complete the runtime sequence in JREI_DUAL_ALWAYS_ON_WINDOWS_RUNTIME_DIRECTIVE_20261024.md, apply additive migration under controlled backup and verify actual Windows service resilience and public privacy controls.
6. Publish only through the established owner-guarded workflow, then inspect live logs and rollback capability. Never commit credentials or expose localhost port 8081 publicly.

## Outstanding acceptance blockers
- Second Windows node model installation, artifact digest and service not evidenced.
- Neither machine's signed worker identity, remote polling and unattended restart evidenced.
- Bertina DB schema application and cron retention execution not evidenced.
- Public site-to-worker-to-model-to-site live request and failure handling not evidenced.
- No confirmed full-masterplan release acceptance.
