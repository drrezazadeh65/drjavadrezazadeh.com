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
