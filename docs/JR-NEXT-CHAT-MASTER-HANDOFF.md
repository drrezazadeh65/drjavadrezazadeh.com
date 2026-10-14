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
