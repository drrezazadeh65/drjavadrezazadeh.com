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


## Continuation: independent owner controls and MFA usability (22 October 2026)

**Implementation status:** source-only commits on `feature/owner-command-center-20261022`. **NO TESTS, CI REQUESTS, MERGES, CRON REGISTRATIONS, LIVE FETCHES, E-MAIL SENDS OR DEPLOYMENTS** have been initiated by this continuation.

### Changes made in source
- Source policy readings now distinguish an explicit saved owner policy from a legacy default, and mark missing source-control tables as unavailable rather than implying an operational switch. Automatic master gate and host-Cron verification are separate server fields; **Cron remains unverified**.
- The independent GitHub source cards now expose an actual MFA-protected, SUPER_ADMIN-authorized manual fetch action backed by the existing `/github-audits/refresh` endpoint. External reference and social-provider cards do not offer fictitious fetch buttons. Manual bulk network fetch requires a confirmation prompt and is never executed when the dashboard is opened.
- Missing metric and collector-attempt tables are identified explicitly. Zero observations is only shown where a genuine stored table was accessible; otherwise counts are **unknown**.
- The source catalogue and settings interface has an additive responsive dark/gold design for mobile, tablet and desktop; existing departmental workspaces and routes remain in place.
- Current `OPERATIONS_MFA_TTL` source value is aligned with the existing 604800-second customer authentication lifetime. MFA remains bound to that browser's rotated authenticated session, not shared across browsers, and expires on session expiry, TOTP secret rotation, disabled account/role or explicit sign-out.
- The owner cockpit now provides a real `POST /api/auth/logout` action with server-confirmed sign-out, private DOM clear, and same-browser-profile cross-tab logout notification. It discloses the seven-day maximum and the independent authentication requirement for a new browser.
- Both existing FA/EN private admin routes use incremented source-asset revision identifiers; public URLs and educational logic remain unchanged.

### Explicitly deferred until the owner-authorized integrated QA phase
1. PHP/runtime/browser validation and FA/EN keyboard/RTL/mobile visual accessibility checks.
2. Bertina mother-database migrations, server permission checks and real API/SUPER_ADMIN/MFA access verification.
3. Confirmation of source cache, request throttling, consent and CSRF behavior against a real authenticated host session.
4. External provider grants, Cron proof, message-delivery receipts, data freshness and production-security assessment.
5. Branch reconciliation, integration, deployments and any runtime collector activation.

**Do not treat these commits or this ledger as evidence of passing tests or successful live activation.** Additional implementation work may proceed in this branch; full completion has not been certified.

## New directive: all management functions must be connected (source phase)

Owner asks for a fully integrated management dashboard, with no cosmetically
enabled but nonfunctional operations. The implementation must distinguish:

- **Operational:** an existing MFA-protected API, actual RBAC permissions and
  recorded storage/provenance are available.
- **Configuration required:** owner-only credentials, schema, host worker or
  OAuth/proprietary provider agreement remains missing; the interface must
  give a specific remediation path, not an inert button.
- **Not applicable / protected:** educational scoring engines, irreversible
  data operations and unconsented third-party publishing must not be forcibly
  activated in violation of separate frozen constraints.

Implemented in the independent branch:

1. Fixed an actual JavaScript scope error that had placed static page-quality
   grade derivation inside the unrelated engine console, leaving dashboard
   department status variables undefined. The grades now belong to the owner
   cockpit function where the evidence snapshot and state helpers exist.
2. Added missing `api/internal/operations-existing-features.json`, derived from
   the repository's **18 existing feature source definitions** and its actual
   source-tree files. Source presence is explicitly NOT live activation.
3. Moved the secondary workspace index below the primary command center and
   collapsed it by default; added real registered health, collection, editing,
   journal and source-control workspaces to bilingual search navigation.
4. Exposed evidence-backed integration prerequisites with direct navigation to
   existing protected panels, including missing database tables and unsupported
   executors; no fake verification, no auto-enablement.
5. Extended the canonical source schema-readiness contract to 27 operations
   tables, including DB health settings, run history and redacted DB errors.
6. Prepared a standalone **manual**, additive, owner-only SQL file
   `platform/db/operations-database-health-additive.mysql.sql` and a
   corresponding step-by-step operator procedure at
   `docs/governance/OWNER_GUIDED_BERTINA_DB_HEALTH_20261022.md`.
   Their existence does not imply that the three tables are missing or have
   been installed live. Owner's previously documented 24-table inventory
   requires reconciliation in phpMyAdmin after private backup.

**Freeze remains binding:** no tests, automatic CI, merge to
`migration/bertina-linux6`, Cron registration, external scheduled collection,
SMTP sending, data deletion or deployment were initiated. The dashboard is
still under source development, and universal live functionality is
**NOT VERIFIED**.

## Bertina owner database milestone — 2026-10-22

The owner posted phpMyAdmin screenshots showing that an initial read-only
schema lookup returned zero rows for the three health tables and the later
`CREATE TABLE IF NOT EXISTS` statements for all three completed with green
success indicators. The disabled singleton initialization reported one row
inserted (`monitoring_enabled=0`, `error_logging_enabled=0`,
`cadence='manual'`). This milestone is recorded as
**OWNER_SCREENSHOT_SQL_SUCCESS** only, not as independent schema/restore,
MFA, backend API, Cron, SMTP, release or integrated QA verification.

**Do not ask the owner to repeat the three health CREATE statements.**
The next step is source-level integration and final coordinated QA once
the owner ends the development freeze. No other database alterations
are authorized or necessary solely on the basis of these screenshots.

A newly committed browser control offers an explicit authenticated
`GET /api/admin/operations/database-health` metadata-only view.
It is separate from the previous owner-authorized POST manual scan that
adds a history row and audit event. Both FA/EN asset query revisions were
bumped; no public URL, scientific engine, customer records, server job,
or production database was changed by these source commits.
