# Owner Command Center — Forward-only development ledger (22 October 2026)

**Development branch:** `feature/owner-command-center-20261022`  
**Production branch:** `migration/bertina-linux6` (owned by the primary developer; DO NOT modify from this workstream)  
**Production deployment:** NOT requested in this feature branch  
**Tests:** Owner expressly prohibits running tests until the **entire development scope** is completed. No test, GitHub workflow dispatch, Cron, external collector job, live e-mail, SQL migration or deployment is authorized in this workstream.

## 1. Non-negotiable boundaries

1. Preserve every published URL, route alias, sitemap path, canonical strategy, href and existing working feature. The developer owns any eventual integration or deployment.
2. **Do not edit educational engines** Golden Talent, RCAS, BAHAR, their scientific scoring, study algorithms, educational content, privacy terms, or dedicated account workflows. Generic admin presentation must not mutate educational backend data.
3. Private MFA session and existing RBAC remain the sole gate. Owner-only mutations use CSRF, rate controls and server audit; a JS button is never a permission grant.
4. **All automatic modules remain off** unless the owner individually approves: data collection, HTTP probes, alert mail, social publishing, log capture, cleanup, repairs. Merely opening the dashboard or reading history must not schedule work. Cron is host-side and not certified by a DB due date.
5. A missing source, OAuth grant, API result, worker, schema table, external audit, verified e-mail receipt or bank settlement is **UNKNOWN**, never zero, live, healthy, connected or complete.
6. Use only the existing mother database. New migrations, if unavoidable, must be additive, owner-reviewed and backed up. Never silently alter business, publishing, users, orders or irreversible audit evidence.

## 2. Admin surface work committed on this isolated branch

- Dark charcoal / gold / ivory mobile-first **Owner Command Center**, mounted in both existing MFA dashboards; no replacement dashboard and no change to old paths.
- Executive header, evidence provenance, most recent owner-requested read, compact KPI blocks, searchable/filterable department cards, expandable inventory and mobile quick navigation.
- Triage of recorded critical/warning events, schema/DB issues, stale HTTP source data, collector failures, overdue schedules, weak static-source SEO, ageing pending orders, social delivery exceptions and consented service inquiries.
- 13 independently represented HTML-source quality dimensions. Missing scores remain `—`; no false Core Web Vitals, Google ranking or AI citation claims.
- Owner-initiated bounded/sequential bulk **read of private stored snapshots**, with progress, stop-after-current, bounded error reporting, no background polling or external connector fetch.
- Individual on-demand read controls for alerts, DB health, HTTP, response probes, collector policies, source directory, source configuration, page quality, commerce, social distribution, GSC, AI visibility, audit, journal, growth, keyword map and free reference catalogue.
- A separately confirmed owner-only button for the **already supported GitHub collector sources**; do not advertise it as a universal external data collector.
- Show role-dependent controls as **verified by API** versus control not yet verified; do not infer operational capability from the presence of a UI card.
- Export an evidence-labelled summary to CSV using existing output protections and MFA-only workspace.
- Do not change the existing free, commerce, social, journal, content editor, community or analytics backend implementations in this branch.

## 3. Expected status for department groups

| Department | Evidence source | Current owner control | Crucial limitation |
|---|---|---|---|
| Alerts/incidents | `/api/admin/operations/alerts` | MFA settings, scope e-mail switches, rule editor | No mail receipt or Cron assertion |
| Database structure/log | `/database-health` | Manual scan, owner policy, preview/confirmed limited purge | Live health tables require owner-approved additive SQL; physical integrity/restore not measured |
| HTTP/404 | `/http-health` | View recorded access-log observation | Host access-log reader and private path remain owner/host-dependent |
| HTTPS/response | `/response-health` | Manual owner config and queued probe | No false TLS monitoring merely because policy row is enabled |
| SEO/per-page quality | `/page-quality` + `model.pageQualityOverview` | Filtering, per-page dimension inspection, export | Static HTML heuristics, not field UX or search ranking |
| Schema & keyword strategy | Existing `jr-intelligence`, `/keyword-map` | Open on-demand editor/report | Registry/canonical markup not proof of Google rich-result eligibility |
| Search Console | `/gsc-direct` | Read owner private aggregate | Local file is unattested unless Google API origin proven |
| AI/GEO | `/ai-visibility` | Read dated provider sample | Small provider snapshot; no synthetic Google/Claude citation count |
| Source inventory | `/source-directory` and `/source-controls` | Owner per-source allowed state, cadence, retention | Listing a provider is not an authenticated connection |
| Collector policy | `/collection-settings` | Master OFF, per-source cadence/time, scoped fetch, scoped diagnostic cleanup | Only existing collector adapters work; host Cron unknown |
| Commerce | `/commerce` | Existing guarded order/case controls | Paid ledger != independently bank-settled revenue |
| Social | `/social` + `/social/settings` | Existing draft/review/publish approval workspaces | Provider OAuth, API publication and receipt not presumed |
| Growth/leads | `/growth` | Existing consented-lead transition tools | Lead != sale; consent and identity controls enforced |
| Journal JHELA | `/jhela/maturity` | Existing first-party editorial workspaces | Prelaunch roadmap != accepted or published indexed issue |
| Administrative audit | `/audit-timeline` | Owner view/export (history immutable) | Bounded history, not real-time notification guarantee |
| 13 engines, 36 reports | Core `operations-live-v1` source | Existing read-only executor contracts and evidence | Registered != executable; current code ≠ deployed production |

## 4. Acceptance boundaries before **any** eventual release

**Deferred on instruction — NOT executed**:

- After **all** development is complete, obtain owner authorization to run isolated regression QA; do not execute while actively implementing features.
- Source/unit/browser checks should cover both language UIs, 320–1440 px layouts, keyboard navigation, private MFA reset, empty/missing evidence, all department shortcuts, CSV escape, error states and no auto-activation.
- Do not assert cPanel Cron installation without Bertina confirmation and independent actual execution evidence.
- Do not install DB-health additive migrations without backup, private credentials and explicit owner approval.
- Verify no preexisting URL, sitemap, canonical, hreflang, schema, educational engine, payment and existing working module has regressed.
- Release integration to the developer's active branch only after resolving latest divergence via code review; never force push or rebase over the developer's ongoing work.
- The owner is the final decision-maker for any host-side activation, cost, deployment or destructive data operation.

## 5. Outstanding items / no false completion claims

- UI source commits alone do not demonstrate live API response, connection, permission or successful real-server rendering.
- External third-party sources may remain disconnected until account-level OAuth/API permissions and private ingestion are provided.
- Current DB-health tables may not be installed live.
- All deployment and test success claims for this feature remain **UNVERIFIED** until the explicitly deferred complete QA.
- Some private owner features load their own secure sub-workspaces rather than duplicating protected customer/editorial records in the new overview.
- **Do not expand this project's scope into Golden Talent, RCAS, BAHAR or other educational scoring.**
