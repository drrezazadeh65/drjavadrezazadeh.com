# ADR-JREI-APEX-001: Model-free source-revision skill behind the original owner gateway

**Status:** SOURCE_INTEGRATED in GitHub, **NOT** TESTED_AT_SHA, DEPLOYED_AT_SHA or OBSERVED_OPERATIONAL  
**Date:** 2026-10-26  
**Authoritative branch:** `migration/bertina-linux6`  
**Primary directive:** `JREI_APEX_ACME_ULTIMATE_MASTER_V2_2026-10-26.md` and the preserved 2026-10-25 unified owner directives.

## Decision

Keep the existing PHP 8.3/LiteSpeed, JREI Node.js worker contracts and the original `drjavad1_store` mother database as the operational authorities. Add a separate, versioned Python intelligence service for independently testable, model-free computations. No new public Python port or direct Windows-model connection is permitted. The owner uses **the existing MFA-protected administrative panel**, and a fixed route to PHP forwards strictly allowlisted *advisory-only* requests to a private HMAC-authenticated Python service when its independent private enablement switch is on.

This first Python skill, `jrei.evidence.revision_triage.v1`, compares current and previous public-source metadata and emits fixed decision codes for revision, rights, withdrawal, independent review and observation freshness. It does **not** approve a source, grant a publication licence, fetch content, change model weights, access learner conversations or record database changes. `jrei.learning.gap_prioritization.v1` and `jrei.orchestration.mission_dag.v1` remain the original Python read-only proposal functions. The static registry does not allow arbitrary tool imports or executable model output.

## Implemented compatibility path

```text
/fa/app/admin/ or /en/account/admin/ (existing owner UI)
  => original /api/admin/operations/session (existing MFA)
  => POST /api/admin/operations/jrei-python-skills (same-origin CSRF,
     SUPER_ADMIN, existing rate limiter, default OFF service flag)
  => api/jrei-python-owner-skills.php (strict action and response checks)
  => platform/jrei-python/php/jrei-python-internal-client.php (fixed route,
     HMAC-SHA256, timestamp, nonce, TLS, bounded cURL response)
  => jrei_service.app /internal/v1/skills/catalog OR
     /internal/v1/skills/evidence/triage
  => jrei_skills fixed-function registry/triage (no network, SQL or shell)
```

**Hosting note:** Python is *not* presumed available on Bertina shared hosting; once approved it can execute on a private Windows worker or VPS while the PHP website remains available when workers are offline. Node A/B identity must be read from actual signed worker records rather than from historical names. No Qwen model/process has been moved or restarted.

## Trust and acceptance constraints

- A payload claiming `rights_state=ALLOWED` or `review_state=INDEPENDENT_REVIEWED` does not establish authority. The result always sets `approved_for_retrieval=false` and `source_rights_approved_by_skill=false`, and is actionable only after original independently verified evidence/permission controls accept it.
- `JREI_PYTHON_PRIVATE_ENABLED` and `JR_JREI_PYTHON_INTERNAL_ENABLED` remain separately OFF unless privately provisioned and deliberately authorized. A source import or UI button never enables either.
- The existing PHP HMAC credential is *service authentication*, not owner identity; original session MFA/CSRF/roles continue to govern caller permissions. Neither model text nor the browser can supply the upstream URL.
- The current Python anti-replay nonce ledger is in-process only. **Multi-instance horizontal operation is BLOCKED** until a reviewed, shared replay ledger (using the mother DB or a separately protected shared cache) is implemented, and private TLS/networking are independently accepted. No parallel business database is authorized.
- Default-OFF changes are source-only and do not touch Cron, privileged owner tool actions, payment or CMS publication. News and examination publication gates remain untouched.
- The new HTML/JavaScript adds only a nested section within `ops-jrei-learning`, retaining the same DOM/session/navigation and private noindex policy; the UI displays NOT ENABLED or UNKNOWN rather than a fictitious server connection.
- The model-free skill does not rely on Qwen, OpenAI or any consumer subscription. Its source determinism is *not* an empirical outcome until real independent tests are executed in the authorized acceptance stage.

## Requirement-to-code evidence ledger

| Requirement | Source path(s) | Source status | Unmet external dependency |
|---|---|---|---|
| V2-PY-01 Python-first strict types | `platform/jrei-python/jrei_core/contracts.py`; `pyproject.toml` | SOURCE_PRESENT | controlled Python environment and lock/SBOM |
| V2-ML-01 deliberate gap-value ranking | `jrei_learning/prioritizer.py` | SOURCE_PRESENT | genuine reviewed aggregate cases and benchmark evidence |
| V2-SK-01 fixed model-free evidence skill | `jrei_skills/evidence_revision.py`; `registry.py` | SOURCE_INTEGRATED | independently trusted rights/provenance ledger |
| V2-BR-01 PHP/Python signed contract | `jrei_service/app.py`; `php/jrei-python-internal-client.php` | SOURCE_INTEGRATED | private service installation, secrets, shared nonce store before scaling |
| V2-OWN-01 keep one owner UI and MFA | `api/index.php`; `api/operations.php`; `api/jrei-python-owner-skills.php`; original bilingual admin HTML and `assets/js/operations-jrei-python-skills-v1.js` | SOURCE_INTEGRATED | approved host and signed service runtime |
| V2-SEC-01 negative regression and test fixtures | `platform/jrei-python/tests/test_evidence_revision_skill.py`; `tests/jrei-apex-python-skill-integration.test.mjs` | SOURCE_PRESENT_NOT_RUN | final owner-authorized acceptance run |
| V2-SEO-01 GSC robots alert source guard | `scripts/seo-robots-sitemap-audit.mjs`; `scripts/seo-regression.mjs`; `docs/governance/JREI_APEX_SEARCH_CONSOLE_ROBOTS_TICKET_20261026.md` | SOURCE_INTEGRATED_NOT_RUN | actual Search Console URL examples and live verification |

## Non-completion boundaries and next engineering milestone

This first vertical slice does **not** constitute durable owner missions, live AI inference, private memory, continuous source acquisition, autonomous coding, validated improvement, approved JREI News publication or a paid public mobile app. No tests, SQL migrations, cron activation, production release or live worker verification have occurred in this workstream.

The next cohesive requirement is a **durable owner mission envelope and append-only event ledger** in the original mother DB, with exact idempotency, owner/MFA delegation, cancellation/revocation and unknown-result reconciliation. It must reuse existing operations/audit/migration patterns after a read-only schema inventory, remain default-OFF, and never infer success from merely staging files. Independently accepted evaluation then allows the new model-free skill to supply review tasks to that ledger; code or source promotion remains separate and explicitly controlled.

**Rollback:** revert only the additive APEX Python skill, PHP route/config, bilingual private script includes and canonical SEO guard commits by exact reviewed SHA if the source campaign is rejected. Keep pre-existing JREI, checkout, canonical URLs, MFA and database unaffected.
