# Free Resources Integration — Existing Infrastructure Audit (2026-10-12)

**Repository:** `drrezazadeh65/drjavadrezazadeh.com`  
**Development authority:** `migration/bertina-linux6` (see `AGENTS.md`).  
**Audit base before this increment:** `1aed2a509d694bdf0dfaca888c92ad5927652ceb` (`main` and the canonical branch were identical at this checkpoint).  
**Scope:** existing source, current operating contracts, workflow definitions, current PR inventory, and CI outcomes. **Not** certification of provider accounts, merchant eligibility, live integrations, or Bertina deployment.

## Findings that change the implementation plan

| Existing capability | Evidence in canonical repository | Decision |
| --- | --- | --- |
| Thirteen named engines; original 36 OP reports and 36 supplemental AWOSE domain views | `docs/awose/ARCHITECTURE_RECONCILIATION.md`, `api/operations-reporting.php`, `scripts/operations-canonical-registry.py` | Reuse ENG-01/02/03/05/06/10/11/13. Do not add another engine or admin dashboard. |
| Canonical SEO, public URL protections, bilingual FA/EN and technical quality gates | `scripts/seo-regression.mjs`, `scripts/master-audit.mjs`, `scripts/link-integrity-audit.mjs`, `scripts/structured-url-audit.mjs`, `.github/workflows/bertina-master-seo.yml` | Keep existing audits; complement only missing tools. |
| IndexNow submission, public-health checks and external-link tests | `.github/workflows/indexnow-submit.yml`, `.github/workflows/production-health-monitor.yml`, `scripts/external-link-audit.mjs` | Do not create duplicate IndexNow, uptime or link-checking engines. Optional external uptime is independent confirmation only. |
| Analytics, event and privacy controls already exist | `platform/analytics-config.json`, `platform/observability-policy.json`, `assets/js/analytics-adapter.js` | Preserve GA4's disabled/unverified state and opt-in rules. No Clarity, GTM or other provider activated without review. |
| Sample GSC indexation observations (not full-property certification) | `api/internal/operations-gsc-observation.json` (10 inspected, 8 indexed, 2 unknown, observed 2026-10-10) | Reuse these as historical evidence only; do not describe as real-time visibility. |
| Scholarly entity and citation foundation | `platform/public-entity-registry.json`, `README.md` | Read-only Crossref/DataCite/OpenAlex/etc. are candidates, not active metadata jobs. Retain provenance and journal licence controls. |
| Earlier RAVE/channel design exists as **unmerged draft** | PR #25 (`feature/rave-engine-v1` -> `main`) | Review its contracts before any later analytics/distribution implementation; do not merge an outdated or competing runtime. |
| Production release is separate from source changes | `.github/workflows/deploy-bertina.yml` responds to explicit trigger file or dispatch | These catalog/test commits do not intentionally deploy the public site. Retest the active head before any release. |

## Additive work completed in this increment

1. `platform/free-resources-registry.json`: 30 curated **candidate** resources (8 growth, 12 technical and 10 scholarly), all classified with named canonical owner, access mode, existing source coverage and `external_connection: UNVERIFIED`.
2. `scripts/free-resources-registry-audit.mjs`: deterministic, offline, zero-secret structural validator. Detects duplicate entries, unapproved states, missing existing-source references, unsafe URL/path entries and inflated live-integration claims.
3. `.github/workflows/free-resources-registry.yml`: isolated, read-only CI on the canonical branch; validates this inventory and retains a non-sensitive JSON artifact. Does not call the providers, modify production or assume there is an operational connection.

This is a catalog and audit scaffold, **not** 30 installed tools or a new live dashboard. Related local scripts are marked `existing_coverage_paths` as conceptual overlap, never falsely called third-party integrations.

## Nonduplicative next implementation stages

**Stage 1 (local open source):** review the existing browser/mobile and accessibility gates, then add Lighthouse CI and axe-core only where meaningful automated test coverage is missing. Avoid double-running the same expensive full route crawls.

**Stage 2 (read-only observations):** evaluate available CrUX origin data and scholarly public APIs in bounded, cached, quota-aware jobs. Map verified inputs into existing ENG-03/ENG-06 records and present only dated, attributed evidence in ENG-13 reporting. Never fabricate external metrics.

**Stage 3 (owner/provider accounts):** owner-controlled setup for Clarity, UptimeRobot, Yandex Webmaster, GTM, Looker Studio and optional Merchant Center, after policy, consent, jurisdiction and credentials review. A free account or public API is not proof of eligibility or an enabled integration.

**Stage 4 (production release):** separate review of the current source head, SEO/GEO/mobile/security gates and existing single Bertina deploy channel. No source-only audit may mark this stage complete.

## Guardrails

- Never change frozen public URLs, page assets, checkout, payment, MySQL, email authentication, consent or customer data to install these references.
- Keep all technical evidence scoped to the actual tested SHA and dated source. `PASS` for an offline inventory audit is not live availability or ranking.
- Avoid parallel implementations of search or analytics engines; check unmerged RAVE proposals against the current PHP/Bertina AWOSE contracts.
- A new commit on canonical Bertina may naturally put `main` behind. `main` is historical; its divergence after this checkpoint is not a license to reactivate development there.

## 2026-10-12 integration checkpoint — verified current source

**Source checkpoint:** `60d63bbd0cc0aba8384c1d1baeade37e97d55c20`; canonical branch `migration/bertina-linux6`. No other development branch was created. No Bertina production deployment was performed by this work.

### Existing manager dashboard reused

The existing Persian `/fa/app/admin/` and English `/en/account/admin/` operation consoles now include the 30-resource inventory already created in `platform/free-resources-registry.json`. The sole manager API `/api/admin/operations/free-resources` enforces the same server administrator role and fresh MFA as the original operations snapshot. Read-only projection: `scripts/build-public-site.mjs` writes a sanitized inventory under `api/internal/`, which is web-denied; no external provider call occurs on page display. `ENG-13` includes the inventory as **reference only** and never counts it as 30 connected APIs.

### Genuine free-provider observations

1. **Crossref (public DOI metadata):** `scripts/free-scholarly-source-observer.mjs` checks scholarly DOI declarations from `en/publications/index.html`, with fixed HTTPS provider, single-record requests and bounded output. GitHub Actions run [38226885399](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38226885399) found provider metadata for **2 of 2** DOI records. A later verified run recorded timestamp `2026-10-12T09:03:00.038Z` in `api/internal/free-scholar-observation.json`. Publisher/title claims remain provider data, not independent authorship or citation certification.
2. **Google PageSpeed Insights mobile lab (keyless free API):** `scripts/free-performance-observer.mjs` checks `/fa/` and `/en/` with mobile strategy. GitHub Actions run [38228019916](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38228019916) observed **two HTTP 429 throttling responses**. `api/internal/free-performance-observation.json` honestly stores unavailable measurements and **no fabricated Lighthouse score**. This is not evidence of poor site performance.

Both datasets are exposed within the **same authenticated manager directory** and via the existing `ENG-13` JSON report. Missing, stale, invalid, and rate-limited data must remain distinguishable. The manager frontend removes observations on lock/MFA expiry. The PHP reader is read-only.

### Automatic checks without automatic source mutation

`.github/workflows/free-scholarly-observation.yml` runs weekly and on manual dispatch; `.github/workflows/free-performance-observation.yml` runs weekly and on manual dispatch. Both are **read-only**, use only public sources, require no paid API/credential, and retain evidence as private-access GitHub Actions artifacts for 14 days. Importing new observations into the canonical source is a **separate reviewed, authorized step** so the repository-wide `scripts/workflow-governance-audit.mjs` prohibition on source-writing CI is not bypassed. A prior short-lived auto-commit workflow was corrected and removed; do not reintroduce it.

### Regression evidence and outstanding requirements

- [Bertina Master SEO Audit](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38228410438): PASS.
- [SEO/GEO Regression](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38228410560): PASS.
- [Operations Control Center QA](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38228410436): PASS, including privileged access, mobile view and absent numeric score on throttling.
- Existing payments, registration, URLs, canonical/hreflang, image library, MySQL, GA4-disabled state, consent boundaries and Bertina deployment were **not changed**.

**Not yet complete:** production Bertina deployment of this source; sustained no-cost reporting connectors for other providers; independent PageSpeed lab data while keyless access returns 429; GSC/GA4/Bing provider OAuth in the Bertina backend; automated evidence ingestion into production without weakening private roles or repository write controls. Do not claim a fully operational 30-source analyzer or 100% production readiness.

**Next nonduplicative step:** use existing `ENG-01/02/03/11` and `ENG-13` to adapt one eligible free read-only provider at a time, prioritizing CrUX/public scholarly APIs and reusing already scheduled SEO/link/uptime audits. Preserve all provider timestamps, provenance, expiration and failures. Route actual site fixes through AWOSE review and release acceptance tests; do not change production on analysis alone.
