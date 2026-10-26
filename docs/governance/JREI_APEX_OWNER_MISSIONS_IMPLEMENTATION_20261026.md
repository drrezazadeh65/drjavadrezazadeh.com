# JREI APEX V2 — Owner Mission Ledger (Source-Integrated, Not Live)

**Directive:** APEX · ACME · ULTIMATE V2, 2026-10-26. **Branch:** migration/bertina-linux6. **Mother DB:** drjavad1_store.

## Completed source work

1. Existing database migration campaign now references the additive 20261026_jrei_apex_owner_missions_mother_mysql.sql as order 31. It proposes three owner-linked tables (controls, missions, append-only event records), with planning disabled, emergency stop enabled and execution disabled by default. **No migration executed.**
2. The source-only PHP repository at api/jrei-apex-owner-missions.php implements fixed plan intent codes, durable idempotency keys, mother-DB transactions, owner-specific reads, event hash chaining, cancel, emergency stop and plan-only resume. It does not dispatch workers, evaluate raw commands, call a model or change external systems.
3. Existing api/operations.php enforces the original SUPER_ADMIN account membership, session, current MFA, same-origin CSRF for writes and rate limits before allowing GET/POST /api/admin/operations/jrei-apex-missions. Original operationsAudit records writes. Private api/index.php configuration defaults OFF for new planning.
4. The existing Persian and English admin pages load assets/js/operations-jrei-apex-command-room-v1.js and assets/css/operations-jrei-apex-command-room-v1.css. Their nested command-room panel is displayed only in the old MFA workspace, and is not a public or separate admin login.
5. Python-first jrei_orchestrator/mission_policy.py makes deterministic, non-executing lifecycle decisions; ledger_integrity.py cross-checks a *complete supplied* PHP SHA-256 event chain without asserting that the source database was authenticated or tamper-proof.
6. Source-only tests were written to platform/jrei-python/tests/test_apex_mission_policy.py and tests/jrei-apex-owner-missions-contract.test.mjs. **They were NOT run.**

## Fixed registered plan-only intents

SEO_ROBOTS_DIAGNOSTIC; NEWS_INGESTION_DIAGNOSTIC; JREI_NODE_HEALTH_REVIEW; EDUCATION_SOURCE_GAP_REVIEW; MOTHER_DB_METADATA_REVIEW; LEARNING_EVIDENCE_REVIEW.

These are static *request types*, not autonomous executable agents. Untrusted natural-language commands are NOT accepted as shell, SQL or tool names.

## Owner and worker state semantics

- A planned mission creates only a metadata receipt with PLANNED state; it cannot be interpreted as RUNNING, EXECUTED, VERIFIED, approved science or published content.
- A normal owner cancellation of a PLANNED or AUTHORIZED item may record CANCELLED; cancellation of a RUNNING item records UNKNOWN_RESULT because remote effects cannot be undone or inferred; a previously EXECUTED item enters REQUIRES_REVIEW.
- Emergency stop blocks *new planning*. It does not prove already running remote work was stopped. Future signed workers must independently check the original mother DB stop flag before dispatch and acknowledge revocation. No such dispatcher is enabled or claimed in this stage.
- Plan creation requires private JR_JREI_APEX_MISSIONS_OWNER_WRITE_ENABLED, mother DB planning_enabled, emergency_stop=0 and execution_enabled=0. Resume planning never enables worker execution. Emergency stop and cancellation remain available to the authenticated owner even when new-plan flag is off.
- A unique owner/requestKey pair and a deterministic request digest prevent duplicate rows and reject key reuse with different intent. Concurrent conflicts must be re-read with the SAME key rather than retried under a fresh key; a provider error never proves the mission was not committed.
- The PHP event append and mission-head revision update share one transaction and an optimistic sequence/hash condition. The Python verifier is only a consistency check of supplied events; externally anchored signatures and independent DB integrity attestation remain future work.
- The dashboard returns bounded history *pages* (40 missions and 100 events), not a daily activity cap. Pagination and durable checkpoint/lease execution remain pending.

## Required independent acceptance — not performed

Read-only live information_schema inventory; verified backup and restore; test-clone additive migration and FK/collation checks; owner MFA, role and CSRF negative cases; simultaneous identical plan keys; distinct-intent key conflicts; stop/cancel races; hash-chain consistency; recovery of UNKNOWN_RESULT; Persian/English responsive dashboard; page-cache and privacy headers; stable site payment and SEO regression; exact-SHA CI; owner-approved guarded Bertina publication.

## Future integration boundary

Integrate fixed JREI mission intents with the EXISTING signed outbound Windows worker queue through reviewed, revocable grants and idempotent leases, without new inbound PC ports or a parallel database. Require real worker receipt + independent outcome verification before AUTHORISED/RUNNING/EXECUTED/VERIFIED state may be claimed. Further backlog: natural-language intent mapping with owner confirmation, persistable checkpoints, signed completion correlation, long-term approved evidence memory, scheduler, public product separation.

**Current acceptance label:** SOURCE_INTEGRATED / QA_NOT_RUN / DB_NOT_MIGRATED / PYTHON_NOT_DEPLOYED / WORKER_NOT_CONNECTED / PRODUCTION_NOT_DEPLOYED.
