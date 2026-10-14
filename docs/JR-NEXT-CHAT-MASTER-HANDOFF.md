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
