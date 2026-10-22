# Owner Command Center — independent non-educational development ledger

**Branch:** `feature/owner-command-center-20261022`  
**Origin SHA:** `2fb9c7a247b897d9a622c2c9966a984ec8ecfd61`  
**Target website:** drjavadrezazadeh.com, bilingual FA/EN; existing Bertina PHP 8.3 / mother MySQL stack  
**Status:** CODE IN PROGRESS, NOT TESTED, NOT MERGED, NOT DEPLOYED.  
**Owner instruction:** **DO NOT RUN ANY TESTS until development is declared complete.**

## Frozen scope

- Do not edit Golden Talent, RCAS, BAHAR or any educational engine, scoring logic, scientific validation contract, learning content or their settings. Non-educational page-quality heuristics are permitted; the scholarly/educational engines themselves remain untouched.
- Do not write to `migration/bertina-linux6`, modify the developer chat's parallel work, add a new database, or activate production services.
- No Cron, background collection, email alerts, scheduled publishing, cleanup, live tracking, third-party provider posting or payment automation may be switched on by this interface.
- Retain the existing MFA-protected route, owner role checks and CSRF policies. A clickable frontend control without a matching authorized backend contract is forbidden.
- No data invention, simulated success, fabricated SEO positions, fake external-provider connections or inferred bank settlement.

## Source deliverables in this independent branch

1. New `assets/css/operations-master-cockpit.css`: dark ivory/charcoal/gold layout, accessible state chips, responsive 3→2→1 cards, default compact section index, mobile safe-area bottom dock and focus outlines.
2. Existing `assets/js/operations-control.js` extended *without altering educational code*: command-center renderer inside `#ops-workspace`, priority observability, searchable department cards, status filters (attention, unknown, paused, recorded and functional groups), per-card privileged on-demand reads, explicit owner-confirmed bounded read-all, concise CSV export and privacy scrubbing on logout/MFA expiry.
3. Existing `fa/app/admin/index.html` and `en/account/admin/index.html` now mount the cockpit and mobile shortcuts and use a cache-key revision; all existing private educational sections remain byte-preserved.
4. The cockpit uses existing private API contracts and does not create a second authorization system or a competing operations database.

### Observation sources surfaced

| Owner category | Existing endpoint or authorized workspace | Important evidence distinction |
|---|---|---|
| Site incidents, email per scope | `/alerts`, `ops-alert-center` | DB incidents ≠ independently delivered emails |
| Database metadata + redacted errors | `/database-health` | Manual `information_schema` and structural signature ≠ physical DB integrity |
| HTTP / 404 diagnostics | `/http-health` | Stored log evidence; source path/Cron may not be configured |
| HTTPS/redirect probe | `/response-health` | Sensor toggle ≠ actual probe or correct TLS chain |
| Page quality | `/page-quality` | Static HTML readiness grades ≠ Google ranking, field CWV or AI citations |
| Manual collector policies | `/collection-settings` | Master collection is owner-off absent explicit enable; Cron not inferred |
| Source directory and retention | `/source-directory` | Listed sources ≠ verified provider integration |
| Commerce and orders | `/commerce` | DB paid-state rows ≠ bank settlement, revenue or delivery |
| Social distribution | `/social` | Stored statuses ≠ provider publishing receipts |
| Search Console private aggregate | `/gsc-direct` | Unattested local aggregate ≠ authenticated direct Google measurement |
| AI visibility | `/ai-visibility` | Small dated external sample ≠ continuous AI visibility |
| Audit timeline | `/audit-timeline` | Last 50 recorded events ≠ live event stream |
| JHELA policy and milestones | `/jhela/maturity` | Prelaunch source maturity ≠ actual editorial capacity or indexing |
| Consent-based growth | `/growth` | Leads ≠ paying customers or marketing permission |
| Keyword strategy | `/keyword-map` | Source hypotheses ≠ ranking or search volume |
| Free source references | `/free-resources` | Curated catalogue ≠ third-party connections |

Additional pre-existing native workspaces remain accessible via links from command cards, including `ops-editor-workbench`, `ops-author-real-view`, `ops-revenue-planning`, `jr-community-admin`, `ops-jhela-workstream`, `ops-master-engine-control` and the existing `ops-navigator` directory. If a role, schema, connector, or executor is missing, the panel must state UNKNOWN / unavailable instead of claiming full operation.

## Owner safeguards

- No private API call is made on a public page. Every privileged card lives inside the hidden MFA workspace.
- Read-all performs **sequential, explicit, owner-confirmed GETs** of stored status, except the owner-requested database metadata scan. It never dispatches GitHub Actions or contacts external collector providers.
- Server-side mutations such as scoped cleanup, rule toggles or retention continue to require the existing backend owner RBAC, current MFA, CSRF and confirmation flows. The new cockpit does not invent mutating APIs.
- No session storage, local storage, analytics, customer identity record or endpoint token is copied by the cockpit.
- The export is limited to high-level card state and evidence timestamps; spreadsheet formula injection is neutralized by the pre-existing CSV exporter.
- On operations lock or MFA expiration, the cockpit and all privileged aggregated evidence are removed from the DOM and JS state.

## Unresolved for real production operation

1. Database-health migrations exist in source but the live Bertina mother database must be backed up and explicitly migrated before the health settings/error journal can be considered fully deployed.
2. Bertina support must confirm exact PHP CLI paths, Cron entitlement, allowed cadence, worker locks and log permissions. **Do not install a Cron merely because a UI setting is enabled.**
3. Provider OAuth and SMTP must be independently verified; unverified providers remain unknown, with owner approval required before any posting/sending.
4. Live data sources that have not been configured or authenticated must not be given fabricated zero values or green readiness.
5. Integrate this branch only after reconciling against the developer's moving `migration/bertina-linux6`; do not force overwrite or drop working newer modules.

## Completion acceptance (DEFERRED — no execution during coding)

After coding is completed, obtain the owner's permission to lift the test freeze and THEN perform isolated syntax, browser accessibility/RTL/mobile, endpoint permissions, CSRF, privacy-lock, database-migration, source-compatibility, SEO/noindex, CSV sanitization and production smoke tests. A green source test never substitutes for private owner MFA verification or actual host deployment evidence.

**Current release claim: NONE.** This branch is source development only. No owner-approved deployment, test results or newly activated production services are asserted.
