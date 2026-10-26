# JREI APEX V2 — initial code/evidence ledger (26 October 2026)

Governing source: `JREI_APEX_ACME_ULTIMATE_MASTER_V2_2026-10-26.md`. Exact initial HEAD inspected: `8c520127021b90e59fa7099138c96deea8ba3a45`; only authorized development branch `migration/bertina-linux6`. No public production authorization was granted.

| Requirement | Delivered source | Verified status | Blocker / next step |
|---|---|---|---|
| Python kernel | `platform/jrei-python/pyproject.toml`, `jrei_core/contracts.py` | SOURCE_PRESENT | Environment installation/dependency acceptance |
| Learning to learn — candidate gap priority | `jrei_learning/prioritizer.py` | SOURCE_PRESENT | Independently reviewed measurements, experiments and durable outcome ledger |
| Non-executing scoped mission DAG | `jrei_core/mission.py` | SOURCE_PRESENT | Contract parity QA, true owner approval, persisted mission queue |
| Private server API | `jrei_service/app.py`, `jrei_core/auth.py` | SOURCE_PRESENT | Private runtime and key provisioning; durable replay protection before scaling |
| PHP compatibility bridge | `php/jrei-python-internal-client.php` | SOURCE_PRESENT | Must be included only in existing MFA-guarded PHP route after explicit integration |
| Versioned event envelopes | `jrei_core/envelope.py` | SOURCE_PRESENT | Existing mother-DB persistence, idempotency and trace storage |
| Owner command room | Existing `assets/js/operations-command-deck-v1.js` | SOURCE_PRESENT_PARTIAL | Python mission connector, MFA/CSRF and real audit wiring incomplete |
| Model inference | Existing `api/jrei-local-chat.php`, signed Windows worker | SOURCE_PRESENT_PARTIAL | Full model quality/rights, private queue, node and host proof missing |
| Mother DB | `drjavad1_store` existing site | DOCUMENTED | No live metadata inspection/SQL writes were performed |
| Memory, lawful knowledge, continuous learning, news | Existing PHP/JS/news sources, Python integration forthcoming | SOURCE_PRESENT_PARTIAL | Rights-cleared sources, independent QA and operational job receipts |
| Public tenant, Android MVP, payments | Future workstream | NOT_STARTED | Must be isolated from owner credentials and current commerce |
| Acceptance/production | Existing manual owner-controlled deploy workflow | NOT_STARTED | Source-only mode, no tests, migrations, Cron or deployment |

All important live states (Node A/B, learning Cron, Qwen certification, public inference, actual News publisher and production DB revision) remain **UNKNOWN** unless independently evidenced. Do not infer readiness from the existence of source files, documentation or unexecuted migrations.

Next source milestone: durable permission-scoped mission/state/event schema design against the existing mother DB, followed by a gated integration in the current MFA owner command room. No unrelated website feature redesign is authorized.
