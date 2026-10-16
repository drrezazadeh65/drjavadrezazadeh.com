# Owner website implementation ledger — 16 October 2026

**Canonical branch:** `migration/bertina-linux6` — Bertina PHP/MySQL production remains separately gated.  
**Purpose:** Track the owner's 17 original requirements and subsequent authentication/brand/SEO requests without confusing source implementation with released production.  
**Status vocabulary:** `SOURCE_READY_QA_PENDING` (implemented in repository, not certified); `PARTIAL`; `PENDING`; `PARKED`; `EVIDENCE_CLOSED_SOURCE_ONLY`.

| ID | Owner requirement | Current evidence | Status / next gate |
|---|---|---|---|
| 01 | PWA install popup offered only once | Shared `jr-pwa-auto-shown-v1` in `assets/js/site.js` and `assets/js/language-gateway.js` | SOURCE_READY_QA_PENDING — test Chromium/iOS, accepted/dismissed/route changes, storage-denied fallback |
| 02 | Manual install button near homepage footer on mobile and desktop | `assets/js/site-extras.js` on /fa/ and /en/; `assets/js/language-gateway.js` on root | SOURCE_READY_QA_PENDING — test browsers without native beforeinstallprompt |
| 03 | Official website emblem beside eNAMAD | `assets/js/footer-brand-seal.js`, loader on public site and gateway; eNAMAD URL preserved | SOURCE_READY_QA_PENDING — production seal, footer geometry, actual merchant badge |
| 04 | Rewrite professional profile in editorial third person | Only verified editorial substitutions (11 EN / 16 FA) applied to `en/about/index.html`, `fa/darbare-man/index.html` | PARTIAL — scan other CV and biography surfaces, preserve first person when directly quoted |
| 05 | Shared brand visual language with reusable templates | Frozen `foundation/DESIGN-SYSTEM.md`, premium auth/shop additions | PARTIAL — screenshot, visual/a11y regression, complete remaining templates |
| 06 | Premium bilingual bookstore | `assets/css/store-premium-editorial-2026.css` appended last to `fa/shop/index.html` and `en/shop/index.html`, pricing/checkout untouched | SOURCE_READY_QA_PENDING — real mobile/desktop review and catalog renders |
| 07 | Publisher, ISBN and imprint details from 3 photographed copyright pages | Original photos not reliably retrievable from accessible Project/Library search; no invented bibliographic data | PENDING — obtain source scans or verified publisher/catalog records |
| 08 | Commerce management, catalog, inventory, orders, discount UX | Existing `assets/js/book-store.js` and operations-commerce, no speculative data migration | PARTIAL — production end-to-end and admin features audit |
| 09 | User comments with administrator moderation before publication | No verified moderated production backend in this workstream | PENDING — server approval queue, abuse controls, retention/privacy and impersonation prevention |
| 10 | User article/book star rating, honest SEO schema | No verified production rating/aggregate review flow | PENDING — verifiable submitted ratings, moderation/anti-fraud, comply with Google structured data rules |
| 11 | Replace labels «پولی» on Golden Talent stages | 3 public + 3 assessment `gt-badge` labels now «بسته تخصصی» on canonical branch | SOURCE_READY_QA_PENDING — confirm inactive digital offerings remain inactive |
| 12 | Knowledge-current public AI assistant | Existing static assistant resources; private current-content retrieval unverified | PENDING — authoritative retrieval and secured model backend with non-disclosure guarantees |
| 13 | AI Discovery & GEO engine ENG-02 | Preexisting robots/llms/CI foundations; measured AI citations/referrals unavailable | PARTIAL — collect genuine crawl/referral/AI visibility evidence |
| 14 | Bilingual keyword research, competitive master plan | 13 editorial owner-route seeds privately stored in `api/internal/keyword-master-map-v1.json`, MFA-only route `/api/admin/operations/keyword-map`; admin UI filter/export | PARTIAL — secure E2E, real GSC/competitor measurements, query map expansion |
| 15 | Circular intelligence dashboard, audit and always three priorities | `assets/js/operations-intelligence.js` bounded public HTML schema sample and plan-derived priority list; score labeled internal | PARTIAL — secure AI runtime, consent, provenance and actual private engine diagnostics not connected |
| 16 | Professional independent schema intelligence | `jr-intelligence` module in both MFA admin dashboards, bounded JSON-LD/canonical source checks | PARTIAL — content consistency, complete page inventory, verified rich-results/Google feedback not yet present |
| 17 | Entrance exam outcome simulator title only | Admin-only roadmap tile «شبیه‌ساز نتایج کنکور», no computation or public API | PARKED — do not activate |
| 18 | Premium login and signup with logo, welcome and motto | Four FA/EN auth pages plus `assets/css/auth-premium-2026.css`; existing form markup maintained | SOURCE_READY_QA_PENDING — real MFA/email verification and mobile/browser/a11y QA |
| 19 | Canonical Persian brand motto | `platform/brand-motto.json`: «ادراک ندانستن سرآغاز فهمیدن است.»; EN translation in auth | SOURCE_READY_QA_PENDING — brand placement and final editorial review |
| 20 | Footer reuse/copyright notice, domain history and version | `assets/js/site-footer-meta-2026.js`; owner-confirmed 18 Nov 2022; technical PWA build ID observed from /sw.js | SOURCE_READY_QA_PENDING — legal copy review, no unsupported semver/release claim, domain registry confirmation if needed |
| 21 | External alt-image SEO warning across 13 launch articles | 39 source images = 26 descriptive alt, 13 legitimate redundant icons with alt="", 0 omitted; `scripts/article-image-alt-policy.mjs` and CI fixtures | EVIDENCE_CLOSED_SOURCE_ONLY — live crawler recheck needed; never keyword-stuff empty decorative alt |

## Release and integrity gates

- **No production deploy** is demonstrated by the source commits in this ledger.
- CI workflow source now references `tests/admin-intelligence-private.test.mjs`, `tests/pwa-install-once.test.mjs`, `tests/bookstore-premium-layout.test.mjs`, and existing ALT/SEO audits. Verified passing GitHub Actions run for exact current SHA remains **UNKNOWN**.
- Static source spot checks confirmed MFA route positioning, private keyword map, PWA key consistency, both language dashboard imports and parseability of changed frontend scripts. Source checks do not certify actual authentication or browser behavior.
- `api/internal/.htaccess` denies direct access; the new keyword-map route executes after server-side admin membership and fresh MFA checks, and public `assets/data/keyword-master-map-v1.json` was deleted. Verify public 403/404 and anonymous 401 on Bertina before release.
- Existing `operations-control.js`, JHELA tools, commerce, original book covers/prices, canonical/hreflang, 13 articles, user accounts and customer reports must not regress.
- Draft PR #79 is **divergent** and must not be merged wholesale; only independently reviewed deltas belong in the canonical branch.
- Release policy in `AGENTS.md`, `docs/governance/SOURCE_OF_TRUTH.json` and Bertina release gate remains binding, including an operator-certified backup and post-deploy smoke tests.

## Proposed next three production priorities

1. Run fresh canonical-head CI, PHP lint, privacy tests, MFA login/registration and live mobile/desktop visual accessibility acceptance; record exact SHA and backup before any deploy.
2. Finish the customer-facing commerce trust chain: real book bibliographic records, store visual review, end-to-end order, payment, donation and customer dashboard acceptance.
3. Implement comments/ratings through a server-side moderation workflow, then deploy knowledge-current AI assistant and measured competitor/GEO intelligence only with genuine data and secure backend authorization.


## 16 October — additional canonical integration and evidence

- Bilingual public landing pages now present the approved owner motto verbatim: `/fa/` displays «ادراک ندانستن سرآغاز فهمیدن است.» and `/en/` displays “Recognizing what we do not know is the beginning of understanding.” The root language gateway displays both, with language attributes, while existing H1 and language choices remain intact.
- `/fa/` professional hero language was corrected from the first person to the editorial third person without changing its academic scope.
- `tests/admin-schema-intelligence.test.mjs` added five source-contract checks for private MFA dashboard placement, bounded same-origin public HTML sampling, absence of Google-rank claims, PWA and existing admin workstream preservation.
- `tests/brand-motto-home.test.mjs` added five tests for the exact canonical bilingual motto across gateway/home/auth routes and source page structural checks.
- Both test files were registered in `.github/workflows/seo-regression.yml` and `.github/workflows/bertina-master-seo.yml`.
- Eleven targeted cross-file source assertions were independently rechecked from current GitHub sources and passed. **Not equivalent to a green Actions run**: commit-status endpoint showed no check/status evidence for examined SHA; node test execution and live browser acceptance remain unverified.
- During book-source discovery, the searchable image named `Three Persian Books in Golden Light.png` proved to be a promotional mockup containing unreliable fictional academic/medical credentials and no imprint data. **Do not use as evidence of ISBN, publisher, book titles, or professional role.** Actual photographed colophon/copyright pages remain unverified and are still required.
- Public production webpage fetch was unavailable from the research tool. Do not infer deployment or live functionality from repository edits.

The outstanding P1 release gate is a passing CI run for the exact immutable canonical SHA, privacy/auth/PWA/mobile and bilingual smoke tests, and a recoverable Bertina backup. Work on public comments/ratings must not publish user content before a server-side moderation system and audit log have passed security review.

## 16 October — owner mobile bookstore and third-person release continuation

Canonical source continuation after the previously recorded `c760001c` newsletter opt-out milestone. These are **source commits, not live Bertina deployment**. Preserve the latest verified production deployment and follow the exact-SHA backup, approval, private MFA and recovery gates before any FTP publish.

### Implemented in canonical branch
- Public footer JS `assets/js/site-footer-meta-2026.js`: removed all technical cache fingerprint fetching/display and replaced it with the owner-requested bilingual public label `v5.1.0` (Persian: «نسخه وب‌سایت: ۵.۱.۰»). The Git SHA and service-worker cache marker remain usable for privileged technical release verification. The owner-facing release label itself is **not** evidence of production deployment.
- Mobile bottom navigation `assets/js/mobile-app-v431.js`: retained the existing five primary navigation destinations in both languages and added a sixth dedicated **Install** control in the same bottom dock, hidden when already installed. Native prompt requested only on direct click; honest Safari or browser-menu fallback shown when not available, with an accessible status element, safe-area support and reduced-motion CSS. Existing one-time automatic offer remains capped and independent from the manual button. Updated `site-extras.js` and `site.js` asset loader version strings to require a fresh shared mobile script after the next verified release.
- Existing bookstore premium stylesheet extended with a mobile image-first layout, authentic book-cover emphasis, gold/black/ivory hierarchy, touch-accessible actions, contained card images and 350/690px breakpoints; `fa/shop/index.html` and `en/shop/index.html` use a new versioned stylesheet URL. No retail price, checkout control, cover art, stock reconciliation, donation field or protected URL was changed.
- Professional third-person prose edited in `fa/darbare-man/index.html`, `fa/index.html`, `fa/faaliat-haye-elmi/index.html`, `fa/amoozesh-zaban/index.html`, `fa/tadris/index.html`, `fa/pajouhesh/index.html` and `en/academic-profile/index.html`. **Seventeen** source passages were converted while preserving meaning and facts. Personal poems, explicitly authorial philosophical writing, first-person survey items and customer dashboard labels were intentionally not rewritten. Full editorial sweep beyond these seven routes is still required.
- New deterministic guard `tests/owner-mobile-store-version-editorial.test.mjs` integrated into existing `seo-regression.yml` and `bertina-master-seo.yml`. Original first source test had an overly escaped version regex; corrected to an exact string assertion in commit `ead2aa53`. The first failing runs `38903316793` and `38903316759` are **superseded by the corrective commit** and must not be represented as green. Subsequent SEO GEO run [38903570083](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38903570083) and Bertina Master SEO run [38903570163](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38903570163) on `ead2aa53` were both SUCCESS. Other workflows must be checked at their own exact SHA before release.

### Design tool artefacts: explicitly not implementation substitutes
- **Canva:** created an editable imported *current-live-storefront baseline*, ID `DAHYLI4vvKc`, [edit](https://www.canva.com/d/dwOiA4aTJTiL-8I). This imports the existing live Persian page; it **does not yet show the new source-only mobile CSS, product metadata or final design**.
- **Figma:** created the planned file [JR Ecosystem — Premium Bookstore, Mobile PWA & Unified Design System](https://www.figma.com/design/MM2wC6wDAG9YGJSwgjAFMw), key `MM2wC6wDAG9YGJSwgjAFMw`. File is **EMPTY / DESIGN NOT IMPLEMENTED**: the available Figma `send_prompt` command returned `Tool send_prompt not found`, and a canvas-write capability was not exposed. Do not claim an editable Figma screen exists. Next Figma edit requires a supported connected editor/write surface.
- Canva public imported prototype and empty Figma workspace are ancillary **design deliverables in progress**, not substitute for responsive CSS, product truth or server-backed checkout.

### Unresolved bibliographic source gate
- The three published titles are `سپیدی`, `تاریکی`, `بن‌بست`; the physical covers are authentic and already mapped in `platform/book-catalog.json`.
- **Publisher, ISBN, publication year and printing edition are null for all three titles.** The three original photographed imprint pages were reported previously but no reliable transcript or image bytes were recovered in connected Project/Library search or prior conversation context. A promotional mockup includes demonstrably fictional professional credentials; it cannot establish publication facts. The three metadata groups must remain `REQUIRES_OWNER_INPUT` (original pages or genuine publisher/library records). **Never invent imprint information; ignore printed historical cover prices.**
- Previous user-confirmed historical stock count (100 copies per title) is not independently reconciled with current live order ledger; do not broadcast 100 as current available quantity without checking fulfilment.

### Acceptance status
- SOURCE_TESTED: public footer JS, shared mobile PWA dock, bilingual store premium styling, selected third-person professional pages. CI outcomes are SHA-specific.
- HOST_UNVERIFIED: mobile dock appearance on user device, live footer, live mobile shop layout, real native PWA installation, all private checkout journeys, production database state.
- REQUIRES_OWNER_INPUT: genuine three-book imprint photographs or independently matched official bibliographies; new protected upload/deployment credentials when required.
- BLOCKED_BY_CONFIGURATION: owner-approved USDT receipt wallet/chain settlement, actual newsletter SMTP worker delivery, OJS security and real JHELA intake, where the previous audit gates remain.
- Deployment was **NOT triggered** by these source edits. No irreversible database migration, payment receipt acceptance or live service change occurred.

Additional third-person navigation pass: visible «درباره من» labels replaced with «درباره دکتر رضازاده» across the FA homepage/about page and shared site/mobile navigation; historical `/fa/darbare-man/` URL, schema target, canonical and breadcrumbs destination retained. New source guard asserts third-person labels without route renaming. 

Continue with the verified production gate: exact HEAD CI, safe public build, image/metadata audits, responsive screenshots at 320/390/430/768/1440 and actual book-page rendering before an approved single deployment. Revalidate previous working newsletter and commerce code instead of rebasing or merging the divergent PRs wholesale.
