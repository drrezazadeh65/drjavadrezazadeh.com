# JREI — canonical independent AI workspace

All JREI AI capabilities belong under `platform/jrei/`. The website is a client, not the owner of the AI runtime. Existing source paths remain compatibility entry points until import paths and deployment contracts are migrated safely. Copied files under `consolidated/` are **snapshots, not the canonical executable runtime**.

## Mandatory capability inventory from the JREI master directive

| Capability | Required location | Acceptance requirement |
|---|---|---|
| Core reasoning and model adapters | `core/`, `models/` | provider-independent interfaces and local/cloud routing |
| Learning-to-learn | `learning/` | identify knowledge gaps, rank learning value, evaluate gains, promote verified skills |
| Crawling and research | `research/crawlers/` | provenance, robots/policies, adaptive scheduling, source quality |
| Durable memory and knowledge | `memory/` | persistence, retrieval, provenance, retention and owner controls |
| Image generation | `media/images/` | authorized model adapter, asset provenance, usage accounting |
| Website administration | `integrations/website/` | scoped authenticated API, audit logs, no direct production filesystem dependency |
| Independent API | `api/` | versioned contracts, auth, request validation and tenancy isolation |
| Windows CPU/GPU workers | `workers/windows/` | existing Ed25519 identities, heartbeat, bounded job execution |
| Scheduling and queues | `orchestration/` | adaptive resource allocation, retries, idempotency, 02–05 heavy-work preference (not an operating-hours restriction) |
| Security and governance | `security/` | least privilege, explicit approvals, revocation, audit and emergency stop |
| Evaluation and self-improvement | `evaluation/` | reproducible evidence before promotion, rollback and traceability |
| Connectors and tools | `integrations/` | owner-authorized service connectors, independently revocable |
| Operations | `ops/` | metrics, diagnostics, configuration, backup and recovery |

## Migration rules

1. Inventory the actual existing implementation; do not confuse planned capability with working code.
2. Move implementations with their imports, assets, config, migrations and documentation; do not just duplicate a handful of files.
3. Keep stable compatibility adapters at old paths until callers migrate.
4. Never move credentials, private keys, user data, model weights or production state into Git.
5. Never modify live website routes, deployment, task identities or payment paths as a side effect of source consolidation.
6. The site calls the independent JREI API; the AI core must not depend on the site's PHP internals.
7. No claims of operational readiness without separately authorized end-to-end verification.

## Current migration state

The `consolidated/` directory contains initial copies of selected Python, PHP and Windows source files. This is partial source collection, **not** a completed migration, integrated API, image-generation engine, autonomous learning system or deployed runtime.
