# JR WEBSITE — NEXT CHAT MASTER HANDOFF (2026-10-14)

Repository: `drrezazadeh65/drjavadrezazadeh.com`; branch: `migration/bertina-linux6`; hosting: Bertina Linux6.

## Mandatory successor instructions
Before changing code, retrieve and READ all accessible conversations in Website — drjavadrezazadeh.com, including design/prototypes, Stage 7, v5.1.0, SEO master and this chat; retrieve the files `Golden Talent_ page prototype.md` and `Rezazadeh Yazdeli_ hero prototype.md`. Read GitHub branch source and commit history, Actions deployment history, build script and relevant tests. Do not claim to have read inaccessible material. Recover exact specifications for seven design modes from source, never invent them. The user's complaints about unfulfilled promises are requirements.

## Mission and constraints
Create truly superior cinematic, premium, scholarly, bilingual FA/EN responsive desktop/mobile app-like site with cohesive logo, imagery, typography, accessible nav, interactions, Golden Talent/RCAS/BAHAR/Golden Path, assessment safeguards, shop, donations, consultation booking, customer/admin dashboards, diagnostics, alerts, PWA, SEO/GEO and reusable visual templates for reports, tests, invoices, receipts, certificates, forms and communications. No parallel repo or project; use the canonical branch. Preserve approved SEO baseline and existing URLs, protect private data, respect production deployment guardrails. Never assert a ten-out-of-ten result without independent evidence.

## Known facts and limitations
Actions deploy #351 was reported successful for SHA `64123d21088feb914752abaf0ce2648edac5562d`, and user provided matching live `sw.js` CACHE_VERSION. This does not establish visible redesign. `identity/` is excluded by `scripts/build-public-site.mjs`. GitHub fetch on 2026-10-14 confirms `fa/index.html` and `en/index.html` both load `assets/css/jr-public-identity-v1.css`. Previous turns reported Golden Talent and nav CSS commits `2c61aa78` and `cc60a6eb7ce2b8a2237bbfa0d5d61e5bd82ef4d7`; independently check branch HEAD. User says Claude prototypes were much better and requested substantial redesign, authentic approved logo, correct imagery, full mobile/desktop and seven modes. Those outcomes are NOT verified. Never claim CSS-only work equals the promised redesign.

## Mandatory work loop
1. Read source chats, prototypes, current repo and previous commitments.
2. Maintain traceable list of coded / committed / deployed / independently live-verified / incomplete.
3. Implement actual user-visible changes in existing branch, avoiding layered contradictory CSS and duplicate systems.
4. Test mobile and desktop, FA RTL and EN LTR, navigation, links, forms, security and accessibility.
5. Publish only through authorized guarded workflow; validate live SHA and visual output independently.
6. Update this handoff with latest exact SHA, changed paths, tests, blockers and next action before chat context runs out.

## Immediate next action
Inspect current GitHub branch, FA/EN homepage markup, existing mobile nav JS/CSS, logos/media and public build. Review actual Claude prototype files if available. Deliver the highest-impact verifiable visual fix, then test and report evidence rather than promises.

## 2026-10-14 navigation stabilization checkpoint
- `1ed42785`: desktop dropdown and mobile breakpoint CSS.
- `a6b86285`: site.js identifies itself as primary mobile sheet event controller.
- `fcc7324f`: mobile-app-v431.js skips its duplicate click controller when site.js owns it.
- `762b095b`: site.js adds Back/visibility close handling and focuses the close control on opening.
- Important: browser automation, real Android testing, live Bertina deployment, keyboard accessibility and visual checks remain UNVERIFIED. Do not mark them complete. Check menu script interactions and browser Back history behavior; ensure no regressions before deploy.

## Further checkpoint (2026-10-14)
- `a0ab53afadbf7f3f6337bbff723941bb7e06e5e2`: Escape dismissal prevents default keyboard event.
- `4cdd066d7cbb5b82778a8170f0e7f2441d4c933e`: added `tests/public-mobile-navigation.spec.js` Playwright regression tests for FA/EN menu open/close, focus, Escape and Back.
- The new test file has NOT been executed and is NOT in the existing deploy workflow's explicit Playwright file list. It must be run, reviewed for correctness, then integrated into CI through approved workflow governance. Do not claim a passing test or successful deploy.

## CI integration checkpoint
- `abeb7d428c1035c03ed2f8162d85b341e548a75f`: `.github/workflows/deploy-bertina.yml` now includes the FA/EN navigation Playwright spec in its explicit browser test list.
- `9f65bfbc896aa3be87b5499649d304c9dea681b2`: test adds a deterministic synthetic same-URL history entry before asserting `popstate` dismissal. This tests handling of Back on an existing history entry, NOT whether opening the menu creates a new history entry. That separate UX requirement remains open.
- CI run and live deployment still unverified; workflow-only commits do not independently trigger the release because path filters exclude `.github/workflows/**`.

## Consolidated mobile navigation implementation (2026-10-14)
- `5c42c6d37ea8a6c00ff5ce88a4fc553b21be3ee4`: primary site.js menu controller now pushes history state on opening and consumes browser Back to dismiss. It also synchronizes hidden, is-open, aria-expanded, aria-hidden, focus and nav-open.
- `eec55cf8fe178defce8dd255556fee979171621c`: Playwright regression asserts real `jrMobileMenu` history entry rather than a synthetic history entry.
- `abeb7d428c1035c03ed2f8162d85b341e548a75f`: regression is included in the Bertina deployment workflow's explicit Playwright list.
- Status: committed, NOT browser-tested or deployed/verified live in this conversation. Do not equate commits or CI wiring with successful release. Review rapid toggle, link navigation, history behavior, PWA Android Back, focus and keyboard accessibility in a real browser. Next run must check actual GitHub Actions run logs and Bertina origin release SHA before claiming deployed.

## Latest navigation regression expansion
- `f767ec9a6ad46ac6c15aedb4d59b973b2284546a`: FA/EN Playwright test also exercises close-button dismissal, focus restoration, and history cleanup before reopening. Code committed; test run unverified.

## Desktop navigation continuation
- `3434193c55abf68a9c57b5c11c2e1c053713979f`: desktop details groups are mutually exclusive, close on outside click and close/focus summary on Escape.
- `89a8bc5b4a3d5e2dfa07e4f7a78fc254e2eacef4`: Playwright FA/EN desktop navigation regression coverage added to existing navigation spec, which is already included in the Bertina workflow.
- Test execution and live deployment remain unverified. Review event ordering for click/toggle and keyboard Escape under Playwright before release.

## Navigation regression checkpoint (2026-10-14)
- `8061b9a310f4753be95d803490cc8e9693ce491c`: mobile menu link click avoids history.back racing destination navigation.
- `9a0d830e2461f71baf0d4b5136a735290c5972af`: Playwright tests link navigation in FA/EN.
- `ad16c7d4e5cf36d1be88719fd4a9387ef37cd3bd`: outside-click test no longer assumes a main element.
- `def668fe4985ba4c360a7fd12b3b00d49e1f40f6`: navigation test asserts the temporary menu history marker is cleared after link navigation.
- These are committed, not proof of passing CI or Bertina deployment. Prior GitHub workflow lookup was PR-only and could not establish push-run status.

## Responsive navigation test coverage
- `c6dcbd392cc8abcfd244bbcf9ae5d0a3bc8b65f4`: adds FA/EN Playwright viewport checks at 320px and 430px, with minimum 40px trigger dimensions, sheet open/close, horizontal overflow and JS error checks. These are regression assertions, not passing test results.

## Keyboard accessibility coverage
- `21c4a73050839c6ae1f7f902f55462760ebfb126`: bilingual Playwright checks mobile menu Tab and Shift+Tab focus wrapping, Escape focus restoration and ARIA open/closed synchronization.
- Regression source is included in the existing Bertina browser workflow. Execution, CI pass and production deployment are NOT verified.


---

## Live continuation checkpoint — 2026-10-15 (post bilingual marketplace)

**Read this checkpoint FIRST; it supersedes old "not tested" assertions above when newer GitHub Actions evidence is available.** Earlier dated sections are historical, not an invitation to reimplement work. This document is a handoff and cannot replace live GitHub/source/production verification.

### Owner's binding instructions
- Work for `drjavadrezazadeh.com` **only** in repo `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`; preserve full conversation/project decisions, canonical bilingual /fa/ and /en/ architecture, links/404 policy, frozen SEO/GEO baseline, approved visual identity, scientific safeguards, books, Golden Talent/RCAS/BAHAR, booking, account, store, donations, administrative control, and real monetization. Do **not** start again or build a separate system. Maintain a reusable brand/design system for all screens, tests, outputs and printed/digital instruments.
- **DO NOT publish the main live site now.** The owner chose to complete a commercially useful, coherently designed v5.1.0 candidate before **one controlled launch**, and said: "Continue and tell me when it is time to publish." Alert owner before publication and obey production recovery gates. No live deployment took place during the latest development conversation.
- The owner's aspirational goal is **USD 10,000/month contribution** over time, *not* an accomplished revenue or proof of sales. Avoid fake availability, testimonials, paid status, scientific validity, revenue, live-settlement claims, or hidden tracking; neither gateway nor private production restore can be inferred from code/CI.
- The work is source-first; ongoing monitoring is NOT an autonomous development process. An hourly publication-readiness **condition watch** was set in ChatGPT to notify only on meaningful ready-state evidence or a critical blocker. It is not allowed to deploy or modify code.
- User frequently works in parallel desktop and mobile ChatGPT contexts: **fetch fresh HEAD and file blob SHA before every write**, don't overwrite simultaneous work. If source content, user attachment, or a past chat is not accessible, say so rather than hallucinate access.

### Canonical checkpoint and verifiable CI
- Last **pre-handoff** source HEAD independently fetched: `7fd008f973b725e77319eed05d2c1f64ccf599a3` at 2026-10-15 08:30 UTC. This documentation commit itself may advance HEAD: fetch current branch when resuming.
- Latest GitHub v5.1.0 nondeploying candidate: [run 38705902132](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38705902132): contracts, public-observation, browser, and candidate jobs all SUCCESS; **175/175 Playwright browser tests passed** at source commit `7fd008f...`. The public-observation explicitly says **source/live revision drift**, so this is **not production deployed or live-certified**.
- Latest same-SHA Master SEO Audit, SEO/GEO Regression and Bertina provider guard: SUCCESS [SEO 38705902098](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38705902098), [GEO 38705902124](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38705902124), [guard 38705902116](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38705902116).
- On immediate parent commit `ce5f8befe21d8d51aa0ccf01a71e5a39a599cb06`, Independent Browser QA, Responsive Certification, Full Visual Crawl, Navigation QA, Bertina preflight, provider guard and Stage14 growth checks were successful. Check if the latest source SHA has equivalent full coverage before promotion. As of this checkpoint, *production promotion remains unauthorized by this handoff*.

### Work already completed and committed, not published
1. Stage14 growth self-history: privacy-safe authenticated keyset pagination on `api/growth-stage14.php`, the consented intake UI, bounded account summary with accurate `QUALIFIED` / `NEEDS_INFO` states, tests and workflow triggers. Older requests retain consent-withdrawal pathway. Earlier commits `4637e208`, `701bc781`, `864b304c`, `244ed90b`, `2fe11dcc`, `db16aa44`.
2. Browser regression fixture repairs: `03ecb7bc`, `e642aa20`, `aaf49443` fixed real source/test contract drift. On SHA `aaf49443` both v5 candidate and independent Browser QA passed (148 and 107 tests respectively before later expansion).
3. Bilingual book product-detail redesign for all three published poetry books (Sepidi, Tariki, Bonbast): coherent front/back cover gallery, scientific/bibliographic truth, honest order steps, add-to-cart and email-info links, mobile responsiveness, accessibility and independent style `assets/css/book-detail-v51.css`. Relevant paths `assets/js/book-store.js`, `assets/css/store.css` **shared source was restored to keep generated bundles byte-identical**, `fa/shop/book/index.html`, `en/shop/book/index.html`, `tests/bookstore-checkout-browser.spec.js`. Commits from `cc9facbb` through `3e09324`; original bundle-regression was repaired, full CI passed at `3e09324` with **168 browser tests**.
4. English account dashboard now has parity with Persian 21-service searchable marketplace. `assets/data/service-descriptions-en.json` contains carefully bounded descriptions keyed **exactly** to `assets/data/service-catalog.json` (source of truth for prices and SKUs), `en/account/index.html` has [data-dashboard-services] section, `assets/js/customer-dashboard.js` renders verified localized descriptions and filters, with correct account/checkout honesty; both locale dashboard scripts are cache-versioned. Commits `615959f7`, `30c540f1`, `4b925ac8`, `a18045cb`, `66b0d15a`.
5. English-service account QA, locale parity regression, required candidate asset packaging: commits `955df432`, `1c565b1c`, `c4342f7e`, `99f2f6ad`, `4a5b2cae`, `732270cf`. 21/21 source description parity is a factual requirement; no duplicated price data in locale JSON.
6. Further **English consultation intent and journey** changes landed at `f2d2a08`, `cdcdb444`, `ce5f8befe`, `7fd008f`: preserve selected public service into a locally reviewed English email draft, show server/catalogue-grounded scope and registered fee, repair bilingual script cache invalidation, add browser coverage for intent and withdrawal of stale summary. The draft is NOT an automatically submitted lead or booked appointment.

### Existing broader mission documents — read rather than reconstruct
- `docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md` — overall design/science/booking/admin/store/SEO/operations acceptance.
- `docs/governance/MASTER_DIRECTIVE_AUDIT_RECONCILIATION_20261015.md` — earlier cross-chat audit.
- `docs/governance/REVENUE_GROWTH_EXECUTION_V2_20261015.md` — revenue/conversion without fake outcomes.
- `docs/governance/V5_CONTROLLED_CPANEL_RELEASE_20261013.md`, `docs/releases/V5_1_0_FIRST_USABLE_LAUNCH.md`, `.github/workflows/deploy-bertina.yml` — controlled release mechanics, verified actor and production SHA gates.
- `docs/governance/EXECUTION_HANDOFF_20261012.md` — historical consolidation; do not follow stale SHA or reopen resolved work.
- Original older Claude design prototype files `Golden Talent_ page prototype.md` and `Rezazadeh Yazdeli_ hero prototype.md` may require re-access through relevant Project attachments; do not pretend they were read if unavailable.

### Precisely what to do in the next chat
1. First retrieve current HEAD and Actions, compare it against the checkpoint above. Check whether parallel work changed the branch after this handoff.
2. Continue the requested **real implementation** and quality audit, with priority on **FA/EN visual/UX parity of all customer paths**, converting educational discovery to customer-selected services to signed-in consented lead/consultation, account, verified appointment, safeguarded checkout/fulfilment. Do not create an alternate store/CRM.
3. Inspect customer dashboard, English service enquiry integration, and customer-facing donation/store/booking UX for material gaps (e.g. duplicate stylesheets, stale caches, misleading CTAs, missing locale variants) and fix only source-proven defects. Run exact relevant E2E, automated SEO/GEO, privacy/crawl and artifact checks.
4. Before advising deployment, certify backup/recovery gates, exact source vs production SHA, controlled manual deployment availability, physical gateway/email/MySQL readiness, post-deploy monitoring and rollback. The deploy workflow was historically `workflow_dispatch` owner-only; tool connection cannot be assumed able to trigger it. Do not call a dry-run/source artifact a live release.
5. Provide periodic *meaningful* progress reports, no promise of continuous unattended coding. On finishing a chat, update this handoff with latest current SHA, tests, operational blockers and the next single highest-impact task.

### A ready-to-paste next-chat request
"Continue the drjavadrezazadeh.com Website project from `docs/JR-NEXT-CHAT-MASTER-HANDOFF.md` in the canonical GitHub repo `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`. Read the new 2026-10-15 checkpoint and SUPER MASTER directive, check the **latest** GitHub HEAD/Actions and project history. Do not redo already committed work. Keep coding, testing and integrating the bilingual v5.1.0 commercial customer journey and premium design until defensibly ready for a *single* controlled release. **Do not deploy the live site yet; tell me first when the verified release gate is ready.** Give evidence-based updates and keep this handoff current."


---

## 2026-10-15 continuation — catalogue-grounded consent and release-candidate retest

**Read this newest checkpoint after the previous October 15 section. It supersedes test-status guesses from this session.** This is an explicitly *NONDEPLOYING* development checkpoint.

### Branch, change provenance and no-live-release

- Start-of-session canonical HEAD: `38c44eadf4d9cee2e5db5e238ee8fa9e9dad7672`. Compared against `7fd008f973b725e77319eed05d2c1f64ccf599a3`: **one handoff-documentation-only commit**, not missing code.
- Last tested code HEAD before adding this note: **`bf1d7e4db994f3e1459256f198b8a74d52399d56`**. Re-fetch latest HEAD before the next modification because parallel desktop/mobile work may have moved it. This handoff commit is documentation-only and **will advance the branch beyond the tested code SHA**; do not falsely label the resulting docs-only SHA as a separately CI-certified release.
- `.github/workflows/deploy-bertina.yml` checked at source: `workflow_dispatch` only, current-branch and exact source/live SHA checks still present. No production deployment or payment was initiated in this chat; owner authorization for a final controlled deployment remains withheld.

### Implemented and committed in canonical development branch

The source-proven problem was duplicated, outdated English labels in the Stage14 account-consented consultation enquiry form. This disagreed with the established 21-entry official `assets/data/service-descriptions-en.json` and the customer dashboard / email composer.

- `b1ebe69e`: `assets/js/consented-lead-intake.js` now retrieves authoritative `assets/data/service-catalog.json` plus the English descriptions file; deletes parallel hard-coded 21 English service names. The ordinary selected service displays catalogue-grounded fee, fit, expected outcome and boundary before consent, rendered through safe DOM `textContent`. Prices are displayed as **catalogue information only**, not proof of payment, entitlement or booking. Changing selected service revokes the unchecked consent checkbox. If English localization is unavailable the consented submission option fails closed while the separate email route remains available.
- `764e47e3`, `04d97892`, `bf1d7e4d`: `tests/service-request-summary.spec.js` asserts official EN names, FA/EN selected-service details and consent reset, and negative missing-localization / visible email fallback.
- `fd1266a3`: `assets/css/jr-ecosystem-design-v2.css` shared bilingual scope-panel styling.
- `f70d9c16`, `f7f51128`: `fa/darkhast-moshavere/index.html` and `en/request-consultation/index.html` invalidate relevant JS/CSS caches by shared new asset query versions.
- `89b464c1`, `797e7bfd`: `tests/stage14-growth-privacy.test.mjs` now asserts exact canonical 21 English translations and privacy/no-payment guard, not existence of a duplicate JS English list; regex test fixture repaired.
- No existing store, price source, authentication, payment/settlement, appointment write endpoint, GitHub deploy workflow, service URLs or live database were rewritten.

### Verification evidence — source, CI, live are different

- **SUCCESS:** [v5.1.0 nondeploying candidate, run 38709230938](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38709230938), on tested code SHA `bf1d7e4db994f3e1459256f198b8a74d52399d56`: contract, public-observation, browser and candidate jobs successful; **176/176 Playwright tests passing** (browser job log). Earlier code snapshot 797e had 175 passing plus one faulty new test locator for a hidden mailto preview; fixed in `bf1d7e4d`. No need to re-open this resolved fixture failure.
- **SUCCESS** same tested code SHA: [Master SEO 38709231110](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38709231110), [SEO/GEO 38709231088](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38709231088), [Bertina provider guard 38709231136](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38709231136).
- **SUCCESS** Stage14 consent/privacy contract checks on immediate prior `797e7bfd`: [run 38708950936](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38708950936); the final `bf1d7e4d` change was only a Playwright locator correction.
- Prior public-observation job independently counted **164/164 sitemap URLs present on both source and live discovery** and **90/90 valid WebP media**, but specifically reported **source/live revision drift**. Neither sitemap parity nor passing code/browser CI proves this source revision is in Bertina or that real checkout, customer MFA, booking, SMTP or database writes operate there.
- English and Golden Talent prototype Markdown text was found in Project Library and examined; treat as conceptual copy guidance, **not** a full visual specification. Do not invent unavailable seven-design-mode definitions.

### Release still blocked; precise next high-impact task

**DO NOT DEPLOY THE MAIN SITE.** Real Bertina acceptance for one commercially usable release still requires independently validated host deployment/rollback evidence, operational account email verification and MFA, MariaDB consultation-week schema and owner-published real capacity (1–4 hours/day, Tehran), end-to-end consented lead / withdrawal with real owned account, live payment provider and reconciled settlement where claimed, accurate stock/fulfilment and student-support donation configuration, and secure post-release incident observability. Psychometric standardisation for Golden Talent, RCAS and BAHAR remains separate from synthetic source tests; no diagnostic/predictive claims.

**Next implementation priority:** inspect FA/EN consultation and account journey for additional confirmed data-flow/visual mismatches (including VIP option evidence and parity) and the protected dashboard/administrator workflow; fix a real source-proven defect in one coherent batch and run matching E2E. Then independently review homepage/mobile/desktop visual quality against approved identity and conceptual prototypes. Keep updating this same document with new exact HEAD + Actions run IDs. No new branch, duplicated CRM or store, and no live deploy without explicit owner go-ahead.

---

## 2026-10-15 continued execution — account and owner Stage14 service identity (178-browser-test checkpoint)

**Latest source code SHA before this documentation-only update:** `74873a492b1a58c07aed62514f1aefed13e508ee` on `migration/bertina-linux6`. Re-fetch HEAD AND target blob SHA before making additional changes; a parallel desktop workflow may advance the branch.

**Verified nondeploying acceptance:** [v5.1.0 candidate run 38711458063](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711458063) **SUCCESS** for code SHA `74873a492b1a58c07aed62514f1aefed13e508ee`: all contracts, read-only public observation, browser, and candidate packaging jobs pass. Browser job recorded **178/178 Playwright tests passed**. Same SHA: [Stage14 growth run 38711458105](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711458105), [SEO/GEO 38711458112](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711458112), [Master SEO 38711458227](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711458227), [Bertina provider guard 38711458127](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711458127) all **SUCCESS**. Independent Operations Control Center QA [run 38711278142](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38711278142) successful on code-bearing preceding SHA `9cf6b5d6` (later changes adjust contract tests only).

### Cohesive completed and committed change set — no live deployment
1. `b09b9914`, `97fa5da9`, `e8af14d7`: `assets/js/consented-lead-intake.js` supports **VIP pre-consent review**: verified canonical VIP catalogue fee, confirmation-dependent coordination, honest Tehran/Kashan in-person eligibility; English VIP names are now a six-entry public locale file `assets/data/vip-descriptions-en.json`, without duplicating prices or booking authority. Unsupported EN VIP translations do not produce phantom options.
2. `f3c638ab`, `5b61d474`: `assets/js/customer-consultation-leads.js` maps authenticated customer-owned lead SKUs to existing canonical Persian/English service/VIP public titles; private states remain server-authoritative; no private browser storage or invented delivery/settlement state. Previously added duplicate consent-management CTA was **removed** because the FA dashboard already contained the canonical static link.
3. `e8eb433d`: existing EN dashboard consent CTA now links directly to `/en/request-consultation/#secure-consented-lead`; FA route remains `/fa/darkhast-moshavere/#secure-consented-lead`. Preserve these URLs.
4. `e0e20dff`: `assets/js/operations-growth.js` now displays source-grounded localized names alongside canonical SKUs in existing owner MFA worklist; **clears all previously displayed contact details when an API refresh/page fails** rather than retaining stale or partially validated private contacts. No new CRM, email sending, owner authorization or DB mutations added.
5. New `tests/service-request-summary.spec.js` VIP FA/EN journey assertions at `87f5474b`; `tests/operations-browser.spec.js` customer/admin locale and failed-refresh privacy coverage `83438dea`, corrected `9cf6b5d6`; `tests/service-locale-contract.test.mjs` VIP 6/6 source-of-truth contract `b2cd95f5` and regex repair `3b4d8e9b`; Stage14 privacy regression `74873a49` updated to assert existing HTML consent CTA instead of obsolete duplicate JS link. All pass in above candidate.
6. FA/EN cache-busting script-version updates committed across `fa/darkhast-moshavere/index.html`, `en/request-consultation/index.html`, `fa/customer-dashboard/index.html`, `en/account/index.html`, `fa/app/admin/index.html` and `en/account/admin/index.html`, commits `552973cd` through `d8ec9f88`.

**What this does NOT claim:** GitHub CI/178 tests are on fixtures and sanitized source; not a live paid purchase, not a confirmed consultation, not a verified book delivery, email deliverability, donation, operational owner MFA, real Bertina MySQL deployment, banking settlement, end-to-end authenticated case acceptance or psychometric standardisation. The user explicitly forbids deploying the live website now; `.github/workflows/deploy-bertina.yml` remains manual dispatch only. **Do not trigger it.** No public production deployment, financial operation, database write/migration or sensitive personal-data action was performed by this development session.

**Next single highest-impact task:** Complete a production-readiness evidence dossier for the FA/EN authenticated lead-to-owner-triage-to-order-to-consultation journey, specifically verify whether account email confirmation, real owner MFA, MariaDB schema migration, genuine Tehran capacity (maximum four owner-published hours/day), SMTP, gateway/callback and transactional fulfilment can operate on Bertina. Without independently verified private operational prerequisites, keep code fail-closed and record precise provider/owner activation dependencies. Audit coherent responsive visual quality and original approved assets without introducing duplicate design systems. Release approval remains explicitly withheld until owner authorizes one controlled release.

---

## 2026-10-15 next continuation — preserve concurrent book announcement and restore all source gates

**Important:** Another contributor committed a single new Persian indexable page, `fa/ketab-ha/how-languages-are-learned/index.html`, on `e67a719115b3d4835f888a95c1c9fcb194e1fb0a`, after our prior docs checkpoint. This was NOT overwritten or deleted. It broke SEO/sanitized Bertina release CI because the new indexable canonical was absent from sitemap, search inventory, immutable URL manifest, HTML route-count guard, social metadata and accessibility, and its original-book authors were incorrectly interpreted as site owner Person objects by the frozen entity schema audit. All of these issues were source-proven through specific failed runs and fixed in a small coherent integration batch. **No live deployment.**

**Last verified CODE SHA:** `b6d6006ea9bc71efc375216df69954ee795d0a8b`. Commits:
- `3e120903`: add canonical new book permalink to `sitemap-fa.xml`; `dc879f01`: synchronize `sitemap.xml` child max lastmod to 2026-10-15.
- `50df892b`: extend guarded sanitized HTML route count in `scripts/build-public-site.mjs` from 319 to 320 **for this one acknowledged new public page**, without removing the publication guard.
- `feb6acf8`: connect new in-press title to `fa/ketab-ha/index.html`, marked **NOT YET ON SALE**; no change to checkout SKUs or entitlement.
- `bec9e07d`: add canonical existing book image `og:image`, `twitter:card`, accessible skip link and main landmark to the new page; `375d0ef7`: extend `platform/public-url-stability-manifest.json` with this immutable new route.
- `283d5a5b`: synchronize `assets/search-index.json` with the new Persian title (164 total indexed search entries), no claim of in-stock inventory.
- `b6d6006e`: change the scholarly source-book's original authors from two nested `Person` schema identities into text author credits, retaining both author names while avoiding false attribution to the website owner. The official `platform/public-entity-registry.json` was NOT weakened.
- `fc48ee87`: append actionable dated real-operation gates (auth/SMTP/BitPay/inventory/capacity/leads/support/controlled deployment) to existing `docs/releases/V5_1_0_FIRST_USABLE_LAUNCH.md`. **Documentation-only** commit advancing the branch beyond the CODE SHA.

**Verified SUCCESS at code SHA `b6d6006ea9bc71efc375216df69954ee795d0a8b`:**
- [v5.1.0 nondeploying release candidate **38713166031**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166031), all four jobs successful (contracts, **178/178 browser Playwright tests**, public read-only observation, sanitized candidate).
- [SEO GEO Regression **38713166046**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166046) SUCCESS; [Bertina Master SEO **38713166316**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166316) SUCCESS; [Bertina-Only Provider Guard **38713166182**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166182) SUCCESS; [Bertina Migration Preflight **38713166156**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166156) SUCCESS; [Navigation QA **38713166237**](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38713166237) SUCCESS; separate Browser QA **38713166079** SUCCESS.
- Full Route Visual Crawl **38713166229** and Full Route Responsive Certification **38713166060** were still **in progress** on last check, so DO NOT report them as passed without a fresh Actions inspection.
- Fresh read-only public API GET via general web was **not accessible** from this session's tool pathway (no trustworthy observed JSON); do not call this proof of outage or success.

**Real operational activation still NOT independently verified:** `platform/payment-provider-registry.json` records a successful BitPay official 2026-10-07 sandbox roundtrip, but ir_primary is disabled and private production credential injection and bank settlement remain unobserved; `api/config.example.php` mail, SMTP, commerce, public TLS flags default false (defaults are not actual live state); full authenticated email verification/reset, actual owner MFA, installed MariaDB capacity/lead migrations, genuinely published Tehran slots, real owner/customer case, book physical inventory, independent backup restoration, student support financial governance and post-release incident monitoring all need private host evidence. Future-state `platform/deployment-topology.json` PostgreSQL app blueprint is NOT the deployed Bertina PHP/MySQL authority. See amended `docs/releases/V5_1_0_FIRST_USABLE_LAUNCH.md`.

**NEXT HIGHEST PRIORITY:** Inspect latest HEAD/Actions for concurrent edits. After confirming source gates, improve only a real uncovered production customer/admin/payment readiness gap, with source+negative tests. Verify independent host release prerequisites with permitted read-only methods when available; do not invent readiness from source. Maintain the exact current URL identity including the new book route, and NEVER deploy live without the user's explicit final go-ahead. Update this handoff at end of each session.


---

## 2026-10-15 next continuation — 185/185 provider-claim and private order history checkpoint

**Canonical code SHA:** `2897a63e92f2031b1544492ad50c7feec6d3d168` (followed by docs-only release acceptance commit `11691488` and this handoff update). Re-fetch latest branch HEAD and workflows before changing any source due to parallel desktop activity. **NEVER deploy live** without owner-authorized final release.

**Nondeploying verified candidate:** [run 38716904467](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904467) **SUCCESS**: source/contracts, live-only public observations (no mutation), **185/185 Playwright browser tests passing** and packaged immutable candidate all succeeded. Same code SHA: [Browser QA 38716904497](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904497), [SEO/GEO 38716904468](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904468), [Master SEO 38716904509](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904509), [Bertina Provider Guard 38716904458](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716904458) all SUCCESS. [Previous source 08747a9d](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716537051) had Account Commerce Consistency SUCCESS, and both full-route visual crawl **38716537063** and responsive certification **38716537121** succeeded (do not misattribute these older-sha checks to the current code).

**Real changes on `migration/bertina-linux6`:**
1. `3dcbb964` buyer consultation appointments JS: partial failures in fulfilment for paid orders (or 50-entry history page, or 20-service slice) now produce an explicit FA/EN incomplete-results warning; cross-order mismatched service-case SKU is never displayed as owned. No guessed payments, slots or client storage.
2. `ed0f46a0`, `2897a63e` Playwright negative cases: 503 for one paid service while another succeeds, foreign SKU in supposedly owned fulfilment, and 50-row history boundary; fixed one fixture selector to distinguish outer card from nested order record. Added four FA/EN paid-history browser tests. **185 passing**.
3. `bdb3c958`→`15a3d679` account portal and standalone appointments FA/EN cache-bust updated JS; `849539fd` updated pinned versioned private-dashboard audit after previous source-gate failure. The corrected Customer Dashboard Audit run **38715888460** passed.
4. **Critical money-proof correction:** `ce66b955` `api/index.php` authenticated `GET /commerce/history` `paymentVerified` is now true only when Stage09 schema exists and this account's bounded order matches a provider='bitpay' `commerce_payment_claims` record on **transaction ID plus verified amount**, in addition to paid timestamp, currency, order contents and totals; missing or broken claim lookup fails CLOSED, while order history stays accessible. Merely having a `paid` database row no longer authorizes the stronger claim.
5. `acbfaba0` updated actual isolated `tests/bertina-account-order-history.php` route fixture for valid provider claim, absent claim, tampered transaction, mismatched verified amount and unavailable Stage09 schema; [Account Commerce Consistency 38716537051](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716537051) SUCCESS.
6. `14181a21` `assets/js/account-order-history.js` distinguishes provider-claim-match from separately unverified bank settlement. `06bdb845` EN `en/account/orders/index.html` now loads canonical real authenticated order history instead of a disabled preview; `08747a9d` updates FA private order history cache version. **No second checkout/CRM/database or money movement.**
7. `11691488` appended full source/evidence details to `docs/releases/V5_1_0_FIRST_USABLE_LAUNCH.md`.

**Important new LIVE, read-only evidence — not this new source deployed:** [Bertina Production Operational Pulse run 38716257161](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38716257161) SUCCESS on October 15, read-only public checks: reported auth/account/email readiness, commerce/checkout/order-capture/service/VIP/shipping/receipts/claim schema configuration, valid guest 401 private access, public routes 200, and current live fingerprint `cc60a6eb7ce2b8a2237bbfa0d5d61e5bd82ef4d7`. **Do not claim `2897a63e` is live**, or that those capability flags independently prove SMTP inbox delivery, bank settlement, material inventory counts, genuine paid consultation delivery, student donations, isolated restore or JHELA OJS operation. No live mutation or production deploy occurred in this session.

**Next strictly prioritized work:** Source hardening is currently good. Do not repeat it. Check for concurrent source changes and external acceptance proof; finish production-account-authorized real booking, real owner MFA, SMTP deliverability, provider reconciliation/inventory verification and independently auditable rollback with privacy-safe evidence. Prefer read-only verification and a precise operator checklist. Never enable payment/migrate SQL/trigger live publish merely to make a dashboard green. Respect one unified premium visual design and existing 320 HTML route identity system.

---

## 2026-10-15 continuation checkpoint — bilingual scientific UI and fail-closed RCAS, UNDEPLOYED

**Source checkpoint before this documentation commit:** `c6b8210295d9b4c405f1f0499d8acaa3cbd0be40` on `migration/bertina-linux6`. Re-fetch current HEAD and file blob SHA before any further edit. The production website was NOT deployed or changed in this continuation.

### Precisely verified baseline and failing evidence

- At the beginning of this continuation, current branch HEAD equalled the supplied handoff SHA `582a203641b49b8b87bdc62b77fb876513941702`.
- Non-deploying v5 workflow run [38720210368](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38720210368) was inspected through GitHub's job list and browser job log. Contracts and public observation succeeded; browser ran **184 passed, 1 failed**; candidate packaging was skipped. The failure was `tests/rcas-start-browser.spec.js:170`: desktop Core 28 choice height 59.59375px vs required >=70px.
- CSS inspection identified the later `assets/css/jr-ecosystem-design-v2.css` rule `min-height:44px` overriding the original readable `assets/css/portal-v2.css` choice heights of 72px desktop and 76px narrow screens. The conflicting rule was removed without relaxing acceptance tests.
- The `deploy-bertina.yml` workflow was inspected and still exposes only `workflow_dispatch`, not an automatic push trigger. No production GitHub workflow was dispatched. Other non-GitHub host integrations, live backups, and independent restoration were not certified.
- New GitHub push workflow run statuses could not be independently retrieved with the available PR-only run lookup; **DO NOT infer the current CI is green**. The previous 185-test or 184-test numbers do not apply to this revised source. Browser QA, actual screenshots, and physical mobile QA remain OPEN.

### Implemented code and traceable commits (source only)

1. **RCAS geometry:** `a42892ae` removes the shared 44px height override. `68a8fc60` adds a source regression guard in `tests/jr-ecosystem-visual-contract.mjs` against reintroducing conflicting choice heights; static inspection confirmed source selectors and intended 72px/76px floor.
2. **Actual v5 CI coverage:** `3d7eb8cc` adds both `tests/rcas-english-browser.spec.js` and `tests/donation-payment-browser.spec.js` to the explicit Playwright list, and `tests/scientific-bilingual-contract.test.mjs` to Node source tests in `.github/workflows/v5-release-candidate.yml`. Neither their runtime success nor donation bank processing is independently verified.
3. **English RCAS viewports:** `65bb4c36`, `0d96c10e` add a 1440/390/320px English response-choice geometry, overflow, font, selected-border test. The written tests are awaiting a demonstrated run.
4. **Golden Path continuity:** `81060d4d` adds read-only `assets/js/golden-path-session-bridge.js`; `411d109f`, `c50c1675`, `f1e0e794` connect the existing Persian and English Golden Path pages to a **same-tab, self-selected** RCAS D1-D6 *exploratory* route, accessible headings/skip links, and shared brand CSS. The English page gains the same six evidence lenses available in the Persian professional report. Only `gt_rcas_state` bounded session summary is read, with locale-specific revision checks; it does not transmit raw answers, create a learner portfolio, diagnose aptitude, assign a programme, or grant paid access. `4a04122f`, `d2feaa2e`, `e49dd597` add source/browser regression cases; actual E2E PASS is still unverified.
5. **BAHAR scientific reconciliation:** `df7b4a0a`, `3c29936f`, `0f95cd6a`, `c6b82102` remove an unsupported English five-letter mnemonic and represent the **seven distinct book-derived formative actions** (recognise context; choose; act; monitor evidence; interpret error; revise; return to action) in both languages. The **six portfolio components** are separate from the seven action phases. `5f4ee09a`, `45263ebb` and `bbfa32ae` add/correct scientific source checks. The existing `platform/bahar-engine.mjs` has the matching seven-step `action_cycle`; no real learner-record activation.
6. **English RCAS insufficient-evidence safeguard:** `2e48dc63` prevents declaring a completed route if all 28 answers are NA/UNKNOWN, all seven domains show insufficient evidence, or the user provides no reason for choosing a pathway. This restores crucial scientific alignment with Persian RCAS. `e7e29d98`, `b1015501` update negative/browser and scientific source assertions accordingly. No invented score, diagnosis or automatic pathway recommendation.

### Source provenance and scientific boundaries

Available personal Library materials were retrieved for conceptual review: `Golden Talent_ page prototype.md`, `Rezazadeh Yazdeli_ hero prototype.md`, and `BOOK CHATS.docx`. The Book Chats project states the seven BAHAR movements explicitly and keeps 12 supporting values/principles separate from the sequence. Prototype copy/links are illustrative, not authentic source confirmation for live photographs or logos. No independent psychometric research, adaptation/translation equivalence, scoring norms, or validated D1–D6 publication approval was supplied. Instruments remain PREVALIDATION, and English RCAS remains a translation PILOT.

### Acceptance status and precise next action

**Confirmed now:** new source files and test definitions are committed on the authorized branch; selected static/regex source checks were inspected, and historical failed browser logs were read. **NOT YET CONFIRMED:** the revised Node tests actually execute/pASS, revised Chromium/Playwright flows pass, all widths/contrast/keyboard checks pass, private PHP/MySQL relationships/consent and human review function on Bertina, donation gateway actually charges or settles, independent recovery/rollback works, full Golden Path/BAHAR persists with consent, or scientific measures are validated.

**Next highest-priority action:** retrieve the newest nondeploying v5 Actions job logs for the updated SHA; fix every red Node/Playwright test without lowering thresholds; separately run/verify bilingual screenshot and mobile accessibility QA; only then consider code promotion to an UNPUBLISHED release candidate. Do not manually deploy, move money, migrate the live database, or change the approved production site without explicit final owner authorization.

### Additional evidence-parity hardening after the initial checkpoint

- `08b60b32`: English RCAS form now visibly labels its priority rationale as **required**, matching the actual client validation. No hidden mandatory field remains.
- `0b3cbf0a`: English RCAS-to-dashboard bridge now requires `p0Validated`, `routingEvidenceCompleted` and `meaningfulCoreEvidence` explicitly before a session-only journey card is marked complete; it still confers no private record or paid entitlement.
- `72693aca`: English dashboard browser contract now includes a forged-incomplete summary rejection followed by a constrained valid synthetic summary.
- `0492a2cc`: source contract checks both the visible rationale label and the tightened dashboard bridge.
- Last application/test SHA before this documentation update: `0492a2cc336ce2fdd40d0f5f790d2b41e1384d81`. **Still no confirmed new Actions result; no production deployment.**
