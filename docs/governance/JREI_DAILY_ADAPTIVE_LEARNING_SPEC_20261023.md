# JREI V5 — Continuous Educational Improvement and Daily Learning
**Canonical source branch:** `migration/bertina-linux6`  
**Date:** 2026-10-23  
**Directive:** the system should learn from reviewed sources and evaluation, improve itself continuously, use the owner's existing Windows CPU-first computer without new purchases, and keep Bertina as the sole system of record.  
**Status:** SOURCE FOUNDATION STAGED; NO AUTHORIZED LIVE WORKER, NO DAILY PRODUCTION LEARNING, NO MODEL RETRAINING, NO VERIFIED GAINS.

## Precisely what “learns every day” means

Separate three fundamentally different improvements rather than calling all of them model training:

1. **Knowledge improvement:** find new permitted official publications and research, detect new editions and revoked/superseded sources, prepare an evidence proposal. Never silently mark externally supplied data `OFFICIAL_APPROVED`; independent issuer/source approval and amendment review are essential.
2. **Retrieval and reasoning improvement:** compare revised Persian/English source retrieval configurations on a fixed, human-reviewed, held-out public educational corpus. Measure recall/coverage, unsupported citation risk, fairness by language, and CPU/Windows latency; stage a bounded BM25 policy proposal. Citation count is not scientific validity. Model-generated drafts must pass separate claim-level verification and human review for consequential recommendations.
3. **Underlying language-model improvement:** actual model fine-tuning, preference optimisation, weight upgrades or replacing a quantized model. **Not implemented, not promised daily** on an RX 580/32GB RAM system. Requires a licensed model, measured compatibility, safe approved training dataset, independent scientific audits, performance tests, explicit owner consent and a reversible release. Initial priority is **inference plus better evidence/retrieval**, not training a new foundation model.

Daily learning is a **propose → evaluate → review → version → approve → release → monitor → rollback** process. AI never gains arbitrary shell/GitHub/write access or silently marks its own academic claims as verified.

## Current source-only implementation

- **Pure evaluator:** `platform/jrei-v5/jrei-learning-loop.mjs`. Compares two same-day, same-hash independently reviewed evaluation summaries; rejects regression in evidence correctness, unsupported facts, privacy, fairness and excessive latency, requires at least 200 held-out cases, and permits *consideration* of automatic low-risk retrieval tuning only for 500+ cases and separately granted owner controls. Every returned proposal sets `canPublish:false`.
- **Deterministic bilingual retriever comparator:** `platform/jrei-v5/jrei-reviewed-retrieval-evaluator.mjs`. Scores trusted Persian/English held-out public queries using normalized digits/letters and BM25. Rejects unreviewed, superseded or publication-restricted evidence, unrecognized IDs and obvious personal identifiers. Returns **only aggregate counts, hashes and proposals**. No raw user conversation, private scorecard or personal notebook is retained.
- **Bertina private policy:** `JR_JREI_LEARNING_DAILY_ENABLED` defaults **false**. The separate `jrei_learning_controls.enabled` defaults 0. Auto-promotion remains disabled in the actual PHP worker and owner API irrespective of optional analysis-level `ELIGIBLE_LOW_RISK` status.
- **Mother-DB staged migration (NOT APPLIED):** `docs/migrations/20261023_jrei_daily_learning_mother_mysql.sql` adds three tables to `drjavad1_store`: control row, idempotent UTC daily summary, and aggregate review proposals. No new identity, commerce/payment, student-data or model-weight database is created.
- **CLI coordinator:** `api/internal/jrei-daily-learning-worker.php`. The seventh allowlisted worker in the existing single Bertina master Cron, due every 86,400 seconds under the support-confirmed five-minute master schedule. It reports the existence of reviewable proposals, or honestly records `NO_APPROVED_EVALUATION`; it **does not run Node, download data, self-certify external material or claim a model improved**. No duplicate daily record. PHP CLI and 5-minute host schedule remain unverified/not installed.
- **Existing MFA admin API:** `GET/POST /api/admin/operations/jrei-learning` guarded by original SUPER_ADMIN session, fresh TOTP, rate limiting, exact-origin CSRF for writes, optimistic revision and operations audit. It exposes only aggregated owner metadata and can toggle metadata-only daily review after private owner enablement. The source does not permit turning on automatic model promotion.
- **Original bilingual administration:** `/fa/app/admin/` and `/en/account/admin/` have an independent source-only daily JREI dashboard and bilingual mobile-first styles. Unknown/missing tables or Windows readiness must never render as `ONLINE` or `0 complete`.

## Why actual continuous improvement is still blocked

**Gates that cannot be bypassed:**

- There is no installed/tested local Windows JREI worker, no personally approved model/version and no authenticated outbound HTTPS node/lease/result flow yet. Neither RX 580 acceleration nor CPU response latency has been measured.
- No owner-reviewed 200–500-case held-out corpus with independent provenance, verified assessment labels, data licenses and scientific review has been supplied. An arbitrarily model-generated evaluation set is NOT independent validation.
- The PHP daily coordinator does not yet execute the Node evaluator. The eventual trusted Windows worker must load approved nonpersonal held-out data, generate signed aggregate evaluations, and submit to an authenticated leased Bertina job; neither untrusted form input nor the model itself may set `sourceApproved` as proof.
- A real atomic, reversible policy-publication gateway with protected audit and rollback is not yet present. No policy changes may be published automatically. The existing `ELIGIBLE_LOW_RISK` signal is a **proposal**, not authorization.
- Real per-language fairness and p95 Windows inference latency are unknown. The pure BM25 comparator marks measured worker latency as absent; no speed claim follows from deterministic indexing, or from a synthetic neutral zero used internally to satisfy aggregate schema.
- Official 1405 admissions, Golden Talent, RCAS and BAHAR scientific scoring and consequential recommendations require validated primary evidence, qualification and human review. No self-training overrides these boundaries.

## Planned next source integrations (without changing live site)

1. Implement Windows 11 CPU-first local worker with an authenticated outbound polling lease against the existing Bertina API, a strict allowlist of `REVIEWED_PUBLIC_RETRIEVAL_EVALUATION` and `EVIDENCE_SUMMARY` tasks, encrypted local credential storage and bounded concurrency. No public model port, no arbitrary shell command execution.
2. Introduce additive mother-DB worker registrations, one-time nonces/short-lived signatures, leases, idempotency, cancellation, heartbeat, source approval and minimal retained metadata. Require private server registration and owner-driven revocation.
3. Connect JREI reviewed corpus ingestion and the deterministic retriever to the existing scientific tool registry, evidence/provenance guard and JREI V2/V3/V4 public fallback; never output an unverified model draft as a trusted answer.
4. On successful evaluated improvements, show the *candidate* and matched baseline/challenger evidence in the current owner dashboard, not misleading `trained` badges.
5. After Windows/host scientific, privacy, failover, latency, child-process and daily-task acceptance, permit an **individually approved, reversible** active retrieval configuration. Any weight changes remain separately gated.

## Binding end-stage tests (WRITTEN ONLY / NOT RUN)

- UTC day idempotency, 5-minute host tick handling, overlapping Cron executions and Windows offline/overloaded network; no impact on public SEO or checkout.
- No approved corpus / source revoked / holdout too small / duplicate question / unknown evidence ID / unreviewed science / private identifiers → abstain, no promotion.
- Regrettable precision, unsupported numbers, citation-to-claim mismatch and language parity regressions → rejection, never automatic evidence publication.
- Candidate version compare-and-swap with one owner review and tested rollback; unknown SMTP or incomplete source evidence is NOT a success.
- Original admin MFA/CSRF/role/optimistic version, disabled-by-default migration, customer account/data isolation, normal fallback and recovery after CLI failure.
- Exact Windows Python/Node/model/backend installation and a real human-reviewed 500-case source corpus have to exist before claims of daily improvement, memory gains, model training or 24/7 availability.

**Reporting rule:** Say “a daily readiness check was recorded,” “a trusted retrieval policy candidate was proposed,” or “the owner approved and deployed a reviewed policy with measured improvement” only when the exact corresponding evidence exists. Do not say “the AI trained itself today” without independently measured model training and validation.
