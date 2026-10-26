# JREI APEX V2 — Existing Signed Worker Observation Bridge

Date: 2026-10-26. Only branch: migration/bertina-linux6. Mother database: drjavad1_store.
State: SOURCE_INTEGRATED; NOT_TESTED; MIGRATION_NOT_APPLIED; WORKER_NOT_ENABLED; PRODUCTION_NOT_DEPLOYED.

## Compatibility finding

The existing Ed25519-signed outbound worker supports only REVIEWED_PUBLIC_RETRIEVAL_EVALUATION. It maintains original node keys, 90-second anti-replay nonce records, strict corpus approval, revisioned job leasing and owner-only review. APEX does not invent support for all six owner mission types or bypass that original queue.

## Source changes

- Additive mother-DB SQL: docs/migrations/20261026_jrei_apex_existing_worker_observations_mother_mysql.sql. One-to-one APEX mission-to-existing-hybrid-job links and append-only structured checkpoints. Registered after prior APEX mission tables in canonical migration campaign at order 32.
- Existing MFA integration: api/jrei-apex-worker-observations.php + api/operations.php + default-OFF private flag in api/index.php (JR_JREI_APEX_WORKER_LINK_ENABLED). Uses original SUPER_ADMIN, current TOTP, same-origin CSRF, rate gate and audit.
- UI: assets/js/operations-jrei-apex-worker-observations-v1.js loaded into the original Persian and English admin dashboards; shows owner-created jobs, only eligible learning-evidence missions, existing job status, observations and checkpoint action.
- Python-first checkpoint integrity verifier: platform/jrei-python/jrei_orchestrator/worker_checkpoints.py; no DB or network. Source-only negative fixtures: platform/jrei-python/tests/test_apex_worker_checkpoints.py and tests/jrei-apex-signed-worker-link-contract.test.mjs. No tests executed.

## Trust and state boundaries

1. Only a PLANNED learning-evidence mission owned by the same authenticated owner may bind an existing job that the owner already queued, no earlier than the mission creation. The job must have the exact reviewed-public-retrieval task type, a valid request digest, dataset and evidence fingerprints and current revision. One mission and one job can be linked only once. Linking NEVER queues work.
2. Owner-controlled planning, emergency stop, zero execution state, and separately enabled private feature switches gate new links. Recording a previously linked job's checkpoint remains possible during an emergency stop, without dispatching or extending its lease. The original JREI signed Worker endpoints and their owners' cancellation logic are untouched.
3. Existing signed job is the only source of job status, node, lease and result metadata. A job result_digest is only a worker-reported aggregate hash, not independent scientific verification. The bridge never stores raw result_json or any decrypted lease token, private text, learner data or executable command.
4. LEASED is not completed; an overdue lease is classified LEASE_OVERDUE_RESULT_UNKNOWN. REVIEW_REQUIRED is an unverified signed-worker submission. REVIEWED in the original hybrid workflow is owner acknowledgment, classified OWNER_ACKNOWLEDGED_NOT_SCIENTIFICALLY_VERIFIED, not scientific approval. CLOSED_UNKNOWN stays an unknown outcome.
5. Cancelling an APEX mission does not cancel an independently queued Worker job. The ORIGINAL hybrid owner revision-checked cancel_job action remains the exclusive owner interface for that job. Never imply cancelling a mission reverses remote effects.
6. The stored checkpoint SHA-256 chain detects inconsistent supplied ordering/records, but is not independent DB provenance or a tamper-proof external signed anchor. The Python verifier claims no worker execution, DB verification, scientific improvement, source rights or publication.
7. Locks are acquired in the order original APEX controls -> mission -> link -> existing hybrid job. Original signed Worker poll and completion do not acquire APEX mission locks, avoiding reverse lock cycles.
8. The 40-link/100-checkpoint UI projection is a bounded read, NOT a fixed activity or learning quota. Future approved extra PCs, GPU servers and datacenters remain possible under the original signed-worker and revocable per-node contracts.

## Pending independent acceptance

Obtain live mother schema inventory and backup/restore evidence; clone-test migration 32 including FK collations; run QA only when explicitly authorized; verify original MFA, CSRF and wrong-owner denial, simultaneous link conflicts, stopped policy, original worker revision races, signed receipt statuses, cross-language checkpoint digest equality, source suspension and lease expiry. Perform bilingual mobile audit and full SEO/payment/auth regression before an owner-approved single Production release.

Nothing in this source increment starts a worker, changes Qwen, calls the news engine, grants deployment, runs SQL, or proves that an AI system is currently operating.

Next engineering milestone: a separately approved allowlisted read-only tool executor with signed capability grant and trusted outcome receipt, not an arbitrary model-to-shell command pathway.
