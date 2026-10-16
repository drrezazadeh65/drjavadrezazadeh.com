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

### Continued mobile and newsletter checkpoint (same-day, no deployment)

The canonical `migration/bertina-linux6` branch changed concurrently during this continuation. Every newer change was compared or read before follow-on edits; no rollback or wholesale PR merge was performed.

- Source commit `254bc8fc` extended the **already existing** `tests/owner-mobile-store-install-browser.spec.js` suite with two narrow-mobile tests for the original front/back cover gallery, missing bibliographic-field disclosure and honest PWA install affordance on book-detail routes. `4d1d56f3` removed the independent, duplicate mobile test file after its unique assertions were consolidated. `b423668c` corrected a real asynchronous cover-image decoding race in that same QA suite using bounded Playwright polling.
- Existing, concurrently added mobile tests check the Persian and English hero markup, 320/390/430-pixel layout, real book covers, user-click installation help and the public `v5.1.0` footer. All such tests must be judged by the latest exact-SHA browser result. Several earlier Browser QA runs were cancelled by newer commits; cancelled is **not** equivalent to passed.
- Read-only source inspection confirmed `api/newsletter-worker.php`, `api/newsletter-delivery.php`, and `api/newsletter-publication.php` already exist. The mother-database MySQL fixture in `tests/newsletter-preferences-mysql.php` exercises consent, opt-out, hash-pinned sitemap publication, simulated one-time SMTP, failure and duplicate suppression. **Do not create a second worker or marketing database.** SMTP and cron activation, genuine mailbox receipt, and production migrations remain separately `HOST_UNVERIFIED`/`BLOCKED_BY_CONFIGURATION`; sending actual customer mail requires verified opt-in and private owner approval.
- Recovering original publisher/ISBN/year/edition from prior history yielded only references to the three October 13 book-imprint photographs, not the image bytes or reliable bibliographic values. Preserve null fields, original cover paths and author-provided canonical titles; never extract author credentials or imprint data from promotional mockups.
- New code remains `SOURCE_TESTED` only until full exact-SHA browser, schema, preflight and live Bertina acceptance succeeds. **No live production deployment, actual payment, email sending, submission or database DDL occurred in this continuation.**

## Mobile install and storefront live-DOM browser gate — 16 October 2026

**Predecessor source commit:** `5554ad83c28466a921659809f062c1e2a84173d5`. This is a source/test checkpoint, **not** a new Bertina deployment. Changes after it must earn their own exact-SHA checks.

- `9a67e4fb`: connected premium mobile CSS to the actual distinct Persian cinematic hero and English hero stage markup, preserving approved photographic artwork and the two canonical `/fa/shop/` and `/en/shop/` URLs.
- `6b746f79` + `0b2ede20`: added Playwright checks for the six-position mobile install dock (five preserved navigation links + one manual install action), app-installed state, accessible fallback help, 320/390/430px width constraints, no overflow, and first authentic book-cover rendering.
- `bb1db38f` + `4f2d31c5`: removed remaining first-person scholarly prose from the public Persian scientific-activities page and the English research introduction, preserving factual meaning and any genuine first-person voice of personal literary texts.
- `50a76767`: versioned the footer loader after replacing its public technical fingerprint with user-friendly `v5.1.0`.
- `34a1e62b` + `5554ad83`: augmented the same navigation browser gate with distinct FA/EN image-before-copy/layout tests, the official front/back cover detail view, bibliographic placeholder and public footer version check. No duplicate website runtime, test-scoped fake payment or separate database was added.

**Browser proof:** [Navigation QA #38912444302](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38912444302) = **SUCCESS, 30/30 Playwright checks** on `0b2ede20`. Navigation QA [#38913116270](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38913116270) on `5554ad83` was **CANCELLED**, not a pass. The actual [Navigation QA #38913158519](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38913158519) completed **SUCCESS, 40/40 Playwright checks** on exact SHA `5a5eaef4543ed2b4c0614b2856d3bdfa94d5adbb` (verified directly from the runner job log). This is actual Chromium viewport execution against local checked-out source, **not** certification of installation from the Android/iOS OS prompt or live Bertina deployment.

**Editorial status:** SOURCE_TESTED for converted pages. This remains a sampled scholarly biography pass, not a claim that user-owned poems, direct quotations or first-person student assessment items have been rewritten. Preserve the last two categories.

**Unchanged live gate:** original published Bertina SHA `f8914d6` until an exact new deploy run and trusted post-deploy readback prove otherwise. Production migration, live SMTP inbox proof, USDT settlement and independent OJS submission still require their separate guards and evidence. The recipient-specific three-book metadata remain deliberately unfilled until documentary publication evidence is available.


**PWA duplicate-loader correction:** `dfd54b87` adds a document-scoped initialization guard to the existing mobile shell, because legacy book routes include the shell directly as well as via `site-extras.js`. `a8ded372` adds an actual Chromium re-injection test to ensure no duplicated or replaced bottom dock, menu or install control. This is `SOURCE_TESTED` only until the exact-SHA Browser QA job completes successfully. No live deployment or native OS-install proof is claimed.

## Figma editable master-storefront checkpoint — 16 October 2026

The previously empty Figma Design file [JR Ecosystem — Premium Bookstore, Mobile PWA & Unified Design System](https://www.figma.com/design/MM2wC6wDAG9YGJSwgjAFMw) is now **populated with editable Figma-native layers**. This corrects the earlier explicit finding that only an empty file existed. The Canva baseline [DAHYLI4vvKc](https://www.canva.com/d/dwOiA4aTJTiL-8I) remains separate and was not misrepresented as the production page.

Figma Design file key: `MM2wC6wDAG9YGJSwgjAFMw`.
- Brand variable collection `JR Brand | Storefront 2026`: six master colors (Background, Surface, Gold, Antique Gold, Ivory, Muted), obtained from the owner's approved master palette. The earlier `identity/tokens.css` records an alternate OS foundation; do not silently replace that CSS or the frozen production design identity with Figma variables.
- Editable screen `3:9`: English 1440px institutional bookstore desktop view: branded navigation, editorial hero, verified title presentation, a three-book catalogue, educational-support language, and public `v5.1.0` footer. It contains 74 native Figma child/nested nodes, rather than a flattened screenshot.
- Editable screen `3:10`: Persian 390px mobile bookstore with brand hero, three catalogue cards, price and unverified-metadata disclosure, educational support, six-position bottom navigation including PWA install action, and public release number. It contains 79 native Figma child/nested nodes rather than one raster mockup.
- Correct product identities: سپیدی / تاریکی / بن‌بست, and the currently confirmed storefront listing of 2,000,000 toman per print title. **No publisher, ISBN, publication year or edition was invented.**
- **Important design gap**: explicit neutral book/hero image slots remain. The approved photographic hero and authentic cover assets are implemented in the repository's website but were not yet transferred as image fills into Figma. The external Figma live-capture flow could not be completed without a supported browser capture session. Therefore this is an **editable first-pass layout**, not yet a final art-complete Figma sign-off and not a substitute for the production CSS.

Recent Chromium storefront/browser evidence: [Navigation QA 38913116270](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38913116270) completed **40/40 tests**, including mobile install state, authentic covers on the actual local website, distinct bilingual visual hierarchy and public version UI, on commit `5554ad83`. Separate independent on-device Android/iOS and on-server Bertina verification remains required.

Current evidence grades: `SOURCE_TESTED` for mobile storefront and editable Figma layout; `HOST_UNVERIFIED` for the updated production website/PWA, Figma image fidelity and independent paid-order journey; `REQUIRES_OWNER_INPUT` for the three book imprint records; `BLOCKED_BY_CONFIGURATION` for newsletter real SMTP delivery, USDT settlement, and OJS submission where previously documented gates have not changed.

No production database migration, money movement, or Bertina publish was performed by the Figma work.

## Verified original book covers recovered from Library — 16 October 2026

**Correction to the earlier Library-availability statement:** The owner's **three original first/front-cover photographs** were located and inspected in the persistent ChatGPT Library on this date. Their image headers/date filenames correspond to `1000100955.png`, `1000100956.png` and `1000100957.png`, together showing the actual printed covers of **سپید**, **تاریکی** and **بن‌بست**. The verified first book title, visibly printed on the physical cover, is **سپید**, *not* «سپیدی». An earlier image-generated studio mockup portraying a different «سپید» book and credentials is not admissible bibliographic evidence and must never replace the authentic cover.

**Source alignment applied on the canonical `migration/bertina-linux6` branch**:
- `platform/book-catalog.json` and `assets/data/book-catalog.json`: first book title `سپید`, English transliteration `Sepid`, and authentic description heading.
- `fa/ketab-ha/index.html` and `en/books/index.html`: first title/transliteration corrected without altering historical URLs, product IDs, stock or payments.
- `assets/media-registry.json`: text alt/captions corrected while preserving cover and back-cover image filenames.
- `scripts/catalog-integrity.mjs`, `tests/owner-mobile-store-version-editorial.test.mjs`, `tests/owner-mobile-store-install-browser.spec.js`: matching identity guards adjusted to the actual photographic evidence. Figma Design file `MM2wC6wDAG9YGJSwgjAFMw` also had 3 native editable title nodes corrected.

**Bibliographic limitation:** The recovered images are **front covers**, not legible internal imprint/copyright pages. They do **not** establish the publisher, ISBN, publication year or edition. All four fields remain null. Search results for the exact book/author pair returned no reliable bibliographic registry evidence; no value has been fabricated. To complete the bibliography, inspect the actual interior shenasname/copyright pages or a verifiable matching official library/publisher record. Do not request the already recovered cover photos again.

No Bertina deployment, database migration or money transfer resulted from this metadata correction. Verify exact-SHA CI and the live source/view separately before claiming the title is corrected on production.

### Recovered original three-book colophons — 16 October 2026

Previously designated `REQUIRES_OWNER_INPUT` is now **resolved for verified bibliographic fields** from the three *original book-imprint photographs* in the owner's personal Library. The photos were created/available on 13 October and visually examined upright at native image resolution; no synthetic promotion artwork was used.

| Canonical product ID | Printed original imprint source | SHA-256 of original JPEG | Publisher | ISBN-13 | First printing (Solar Hijri) | Original print run |
|---|---|---|---|---|---|---|
| `roshanaei` | `1000101520.jpg` | `8dbb8f60a217257b8312f1d3acc917305c31f80e974e1d8c10440ff06a6f0983` | نشر دارما | 9786229465141 | 1404 | 200 copies |
| `tariki` | `1000101519.jpg` | `6f7939739ba97c4ed9f5b5b317534a147b656c19387ff0a1204740480071885d` | نشر دارما | 9786229636275 | 1404 | 200 copies |
| `bonbast` | `1000101518.jpg` | `b764acdb3b1a5f724d30ba02cf8e807df220a605444ce40a647c4f7920124fad` | نشر دارما | 9786229636237 | 1399 | 200 copies |

Each 13-digit ISBN has also passed the weighted ISBN-13 checksum. The individual book title on the current official photographed *front cover* is already treated separately in the existing canonical catalogue and must not be relabelled solely from a catalogue internal ID or earlier promotional image. Avoid silently changing URLs/book IDs. All three original book-imprint photographs remain in the owner's private Library; no customer imagery or private photos were committed or placed under the site's public media tree.

**Changes:** `platform/book-catalog.json` now carries the documented `publisher`, `isbn`, `publication_year`, `publication_calendar`, `edition` and `print_run` for each published book. `assets/js/book-store.js` renders publisher, true Solar Hijri year, first printing and bidirectionally isolated ISBN in FA/EN detail pages. The 200-print quantity is first *printing* only, **not live available stock**. It must not populate `inventory_on_hand`, order allocations or customer promises. No payment, purchase price, commerce status, checkout flow, cover image path, migration or private data has been changed.

**Design source:** The existing Figma file `MM2wC6wDAG9YGJSwgjAFMw` has six bibliographic labels and corresponding verified title copy updated within the existing FA mobile + EN desktop native text layers. This does not establish deployed pixels, actual cover image placement or independent review of every screen. Keep the verified original covers from the website source.

**CIP-versus-print distinction:** For `tariki`, the FIPA/cataloguing entry on `1000101519.jpg` gives publication **1401 SH**, while the original colophon separately gives *first printing* **1404 SH**. Both belong in the same mother book catalogue but must be stored in different fields (`publication_year=1401`, `printing_year=1404`). For `roshanaei` both years are 1404; for `bonbast` both are 1399. The public FA/EN book-detail renderer must show the two fields separately, and the first-print quantity is never the saleable on-hand stock. The current officially reconciled source title for the first original printed book is «سپیدی» (English reference `Sepidi`); never infer a different book or silently switch to artwork-labelled «سپید» as a substitute for the physical imprint.

**Proof gate:** source-code tests must now assert these independently evidenced non-null fields rather than the previous null-only sentinel. Re-run the exact-SHA SEO/source, navigation/browser and store detail tests. Production Bertina publication remains a separate controlled action; prior success of the historical SHA cannot certify these new book facts on the live server.
