# JHELA — Owner-Authenticated Scientific Maturity Dashboard
**Maturity Dashboard Runbook v1.0 · 16 October 2026 · Source certified; deployment not confirmed**

## What actually exists now

The primary Persian and English owner administrator dashboards now include an expandable **Journal governance and scientific evidence** area. It has a single authenticated on-demand refresh action which reads `GET /api/admin/operations/jhela/maturity`. This is a separate **read-only** endpoint inserted into the existing `api/operations.php` route *after* verifying the account, authorised operations administrator membership and fresh TOTP/MFA session. The endpoint is rate-limited and inherits private `Cache-Control: no-store`.

Backend: `api/operations-jhela.php`; client: `assets/js/operations-jhela-maturity.js`; themed inside `assets/css/operations-jhela-workstream.css`; pages `fa/app/admin/index.html` and `en/account/admin/index.html`.

It reports truthful source-governance information only: ten current evidence-unverified roadmap milestones, four future capacity tiers, the owner-planned five-gigabyte disk increase (not verified installed), known not-certified OJS status, formal article submissions closed and **null** genuine manuscript counts and progress percentages. It **does not query** OJS, claim live reviewer accounts, show unpublished manuscripts, disclose financial data, perform payments or generate external indexing claims.

## Secure deployment projection — why this matters

The sanitised production packaging script `scripts/build-public-site.mjs` intentionally excludes `platform/`, project documents, original evidence and internal foundations. A runtime endpoint that tried to open the source `platform/*.json` on a deployed site would therefore fail. To solve this without weakening public-secret or cache policies, the build now projects only explicitly allowed, restricted fields from four governed journal contracts into `.public-site/api/internal/*.json`, including a **status-only** ten-stage evidence list and **no raw evidence**.

The `api/internal/.htaccess` file contains `Require all denied`, protecting those projections against direct HTTP reads. Only the MFA-protected PHP route may access them through fixed filename mappings. The PHP source has a CLI-only `JHELA_SOURCE_TEST=1` fixture pathway for automated tests; deployed PHP must use the protected package files rather than arbitrary project directories.

A future actual journal evidence service **must not** be grafted into this status-only projection by embedding reviewer identities, peer reports, data subjects, password hashes, raw journal billing or official-index records. Build an isolated authenticated source interface and an independent evidence vault first. The present contract deliberately rejects a source registry claiming independently verified phases until that separate secured service and review process are created.

## Owner workflow in the current UI

1. Enter the existing owner admin route in either Persian or English.
2. Sign in with verified admin credentials and complete the existing TOTP challenge.
3. Expand **JHELA scholarly operations**, then **Journal governance and scientific evidence**.
4. Select **Retrieve journal governance status**. A result appears only if the server reports a valid, complete and independently bounded source contract; otherwise the UI shows an error without inventing metrics.
5. Inspect the ten maturity states and architectural targets. Use GitHub issue #65 for actual host/OJS activation blockers and #80 for long-horizon scholarly indexing goals.
6. Never treat `verifiedStageCount=0` as an invented percentage or claim that work itself is 0% completed. It describes the evidence registry, not the completeness of the scientific project.

## Verification and acceptance boundaries

- `tests/jhela-operations-snapshot.php`: source PHP function returns consistent truth and null metrics.
- `tests/jhela-maturity-api.test.mjs`: asserts routing occurs only beyond fresh MFA, private HTTP semantics, role-bound UI and forbidden browser persistence.
- `tests/jhela-packaged-admin-projection.test.mjs`: builds and inspects the *actual deployable artifact*, confirms the four approved minimal projections and protection from direct HTTP access.
- `tests/jhela-operations-packaged-snapshot.php`: confirms the packaged PHP endpoint can read the projected source registry rather than a nonexistent `platform` directory.
- `.github/workflows/jhela-ojs-readiness.yml`: includes isolated source tests, PHP syntax and actual sanitized artifact tests, without deploying or installing OJS.

**Known boundary:** the source-only GitHub Actions check may conclude PASS while the live domain still lacks the updated code, trusted JHELA OJS TLS, actual OJS/SMTP/database/backup evidence or a working end-to-end peer-review workflow. A successful package test is not a production smoke test.

## Upgrade to real OJS 3.5 / future hosting

After the separately managed OJS server is secured, the next read-only integration should use a **versioned native OJS-compatible supported interface** to extract minimal, privacy-safe aggregate scientific workflow indicators. No arbitrary direct read/write of unreviewed OJS tables; never grant the site superadmin native handling-editor powers or finance access to review reports. Require independent service credentials, scoped permissions, expiring keys, replay protection, rate limits, journal-specific event boundaries, confidence/observation timestamps and small-cell confidentiality suppression.

Initial real metrics (only when genuinely connected): editorial queue new/under review/awaiting revision, due-date delays, verified publication records, reviewer invitation workload, editorial conflict-recusal events, email delivery health and preservation/DOI deposit status. Every metric must carry a source, period, observation time and `unknown` status when disconnected. Financial settlement must remain wholly separate from editorial acceptance.

The owner directed designing beyond current-host constraints and expects an additional five gigabytes on 17 October 2026; these are **not** reasons to enable submissions early or skip server-proven permissions and backups. The native OJS system remains the sole authority for confidential manuscripts and editorial actions.

## Non-regression
Keep the frozen bilingual SEO routes, independent journal sitemap, current main-site authentication, private PWA caching rules and owner-approved one-time release protocol. No new public journal submission endpoints, generated index logos, paper records or APC payments were enabled by this change.

- [JHELA future architecture ADR](JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md)
- [JHELA scientific evidence SOP](JHELA_SCIENTIFIC_EVIDENCE_AND_INDEXING_AUDIT_SOP_20261016.md)
- [JHELA operational activation issue #65](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/65)
- [JHELA international scientific roadmap issue #80](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/80)
