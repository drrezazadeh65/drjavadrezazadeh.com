# Verified session handoff — 16 October 2026
**Project:** drjavadrezazadeh.com | **canonical branch:** `migration/bertina-linux6`
**Status:** SOURCE DEVELOPMENT; NOT A PRODUCTION DEPLOYMENT OR RELEASE CERTIFICATE.

## Owner instructions (preserve verbatim in scope)
- Bring the entire bilingual site toward a complete, fully working release, retaining the approved luxurious mother-brand design and existing functionality; no inactive/misleading public interfaces.
- Make manual USDT available for donations, books, services and eligible invoices, with administrator verification and real customer/admin status.
- Use Ramzinex public market USDT/IRR live rate for a toman/USDT converter; server-authoritative immutable payment quotes, never browser-generated executable sums.
- Reuse **the existing modular unified mother database**; inventory before any migration, reuse canonical accounts, orders, consent, price and notification modules, no duplicated database.
- Offer topic-specific opt-in newsletter subscription where relevant across the site, email verification and opt-out.
- Preserve all scientific validity boundaries for Golden Talent/RCAS/BAHAR, JHELA/OJS privacy, existing MFA, SEO, PWA and no broken links.
- Owner requested wrap-up now to avoid chat limit. **Do not restart prior changes from scratch.**

## Verified repository status during this session
1. Earlier unified design/release ledger:
   `docs/governance/FINAL_INTEGRATION_SUPER_MASTER_PLAN_20261016.md` (exists).
2. Public Ramzinex probe `scripts/ramzinex-public-rate-probe.mjs` and workflow `.github/workflows/ramzinex-public-rate-discovery.yml` exist. Real Actions run 38881927842 passed: specific public `/exchange/api/v1.0/exchange/pairs/11` returned HTTP 200, `base_currency_symbol.en=usdt`, `quote_currency_symbol.en=irr`, active, numeric buy/sell. Historical sampled prices must not be promoted into live display. A legacy `/exchange/api/exchange/prices` returned HTTP 404 and must not be used.
3. Public **indicative-only** PHP adapter `api/ramzinex-public-usdt-rate.php` exists and is routed via `api/index.php` at GET `/api/rates/usdt-irt`; static PHP checks were added to the no-payment public API workflow. No live Bertina endpoint smoke is yet verified.
4. `tests/ramzinex-public-usdt-rate.php` exists: rejects wrong pair, wrong unit, suspended/delisted market, invalid rates; tests IRR/10 to toman. CI run 38882487717 passed.
5. `docs/governance/RAMZINEX_TOMAN_USDT_LIVE_RATE_QUOTE_MASTER_20261016.md` exists. The unified design already has `eco_fx_rate_versions` and finance/notification tables, but *these schema designs were not verified applied on production*.
6. `api/newsletter-preferences.php` exists in the canonical branch; the last observed branch compare from `3a4e6270322e34e5fce7b681349fa0e3d27747a7` was two commits ahead, changing `api/index.php` and adding this 123-line PHP module. It is **NOT wired to public API routes yet, has no forms, no confirmed migrated schema, no sender/worker, and no newsletter E2E CI proof**. Do not claim the newsletter can send mail. Its code requires fresh code and test review before any activation.
7. Earlier PR #86 manual USDT code was **not blindly merged or activated**. Its draft schema and PHP have outstanding consistency issues; proof-of-payment/settlement, receiving wallet ownership and authorisation remain unverified. Prior exposed Ramzinex private read-only key must be revoked and rotated outside Git/chat.
8. Last observed `Production SEO Health` live-host run 38882197943 failed: two public WebP fetches and historical source/live revision drift. Source CI health is not live acceptance.
9. Earlier source QA on SHA `9a850f8cfa99123022258c265daea4987a635999` passed all 14 workflows, but new code requires **fresh** exact-SHA validation.
10. **No production deployment was performed or verified in this handoff.**

## Next execution sequence (no duplicate work)
A. Check actual latest `migration/bertina-linux6` HEAD, source CI and security policies. Confirm network accessibility and response of live `/api/rates/usdt-irt`. Fix any adapter incompatibility found by host/PHP test.
B. Finish read-only converter UI in FA/EN with source, currency units, bid/ask explanation, observed freshness and rate-unavailable state. Optional prominent website/service integration uses the shared design tokens; client-side estimator must never issue payment instructions.
C. Complete approved quote/order binding and audited manual BSC USDT workflow only after actual wallet ownership/contract and backup-restored mother DB schema readiness; preserve existing `commerce_orders` and `eco_` architecture; fix PR #86 SQL/audit mismatches before migrations. Do not enable money collection until end-to-end checks pass.
D. Review and wire `api/newsletter-preferences.php` safely, test its SQL and CSRF/consent, add account-linked bilingual opt-in and topic selector, unsubscribe/preferences and suppression-backed outbound jobs using `eco_notification_preferences`, `eco_consent_records`, `eco_notifications`. Verified delivery requires real provider/worker evidence. Never mail non-opted-in readers.
E. Resolve live WebP problems and source/live release drift; audit JHELA/OJS and all service, bookshop, donation, scientific and dashboard journeys using the *final exact source SHA*. Keep scientific scoring unvalidated unless evidence exists.
F. Controlled, serialized Bertina deployment only after signed artifact, current CI/visual/SEO/security/database backup and restoration evidence, rate and payment safeguards, journal host readiness, and post-deploy smoke with rollback.

**Truthful release status:** Not yet ready to state that every public section, live USDT payments, OJS and mailing are fully operational. Missing server and payment proof is a genuine blocker, not a cosmetic flag to bypass.

## Continued verified integration — 16 October 2026, source RC

**Last code SHA verified on GitHub Actions:** `c5f25e07ecdf916bda9cdfd835d8f7b68ff8df98`. The next commit to this document is **documentation-only**. Before any further code/deploy operation, re-read the current branch SHA.

### Code actually integrated (no parallel registry or routing)
- Bilingual, indicative-only USDT/toman calculator integrated into existing storefront, service and talent-support routes. Real market API reader `GET /api/rates/usdt-irt` reads active public Ramzinex pair 11 (base USDT, quote IRR); converts rial to toman exactly once; has no automatic checkout or settlement. [Browser FX QA green](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38885566852).
- First-party `/api/newsletter/health` and authenticated `/api/newsletter/preferences` are routed in `api/index.php`; bilingual opt-in/withdrawal UI is integrated in **existing** account dashboards `/fa/customer-dashboard/` and `/en/account/`, not a new customer dashboard. Handles 6 topics, verified account, adult/consent checkboxes, CSRF/origin and auditable mother-database consent. On unavailable schema or unverified account, submit controls are removed and no disabled public subscription is advertised.
- Tested the original `database/unified/001_core_governance.sql` and `005a_communications_support.sql` in isolated MySQL 8 with no duplicate newsletter tables; verified grant and withdrawal persistence plus Chromium usage. [MySQL + bilingual UI both green](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38889741611).
- Repaired the desktop unified dashboard rail so its final account/privacy link remains clickable above a fixed sign-out footer in low-height viewports, with independent nav scrolling. Updated `tests/customer-dashboard-browser.spec.js` to insist on a cache-busted stylesheet without matching an obsolete fixed version string. Keep both desktop and mobile variants intact.
- The earlier isolated browser regression and MySQL/consent failures were corrected by actual UX fixes and fail-closed DOM cleanup, not by bypassing consent, authentication or hidden private data assertions.

### SHA-scoped acceptance evidence for `c5f25e07...`
All seven workflows returned **success**:
1. [v5.1.0 full nondeploying candidate](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890012015).
2. [Sitewide Browser QA](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890012000).
3. [Scientific experience and bilingual designs](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890012003).
4. [Bertina Master SEO Audit](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890012149).
5. [SEO/GEO Regression](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890011976).
6. [Bertina-only hosting guard](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890011983).
7. [Progressive release policy and full preflight](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38890012055).

### Not yet live / not to claim ready
- The production deployment is **not verified executed**. Bertina's `.github/workflows/deploy-bertina.yml` uses manual `workflow_dispatch`, exact approved source SHA and expected live /sw.js SHA, private FTP secrets, recovery-mode gate and independent on-host post-deploy smoke. Connected GitHub tools in this conversation could commit/read but could **not dispatch** that workflow; never claim source CI was the deployment.
- Public FX reading and converter are green in fixture/CI; the **live host** `/api/rates/usdt-irt` has not been independently smoke-tested after deploying this code.
- Newsletter preference persistence is source/fixture-tested, but unified `eco_` consent/notification table migration on *production* was not applied or verified in this chat. The outbound publication event queue, suppression/recheck worker, actual SMTP acceptance and unsubscribe email link remain operational gates. **No sent newsletter emails verified.**
- Manual USDT payment **for donations, books, services, Golden Talent and eligible scholarly invoices is NOT LIVE**. PR #86 is open/unmerged; its draft SQL had a duplicate `PRIMARY KEY`, enum mismatch and lacks server-authoritative payable quote for all order types. Neither a payment transaction nor receiver ownership/settlement was independently verified. Rotate previously exposed private read-only Ramzinex key off-platform. Do not display a wallet as active simply because a constant exists in source.
- Native OJS status in `platform/jhela-ojs-activation.json`: not independently installed/secured and real editorial/test mail workflow not certified. Do not publicize fake review, publication, fees, DOI/ISSN or accepted articles.
- Previous read-only production observation reported source/live revision drift; a new version's exact SHA, host database snapshot/restore, private receipt storage and live SSL/SMTP must all be retested before declaring release.

**Next source + host actions:** A) Read actual HEAD and source/live fingerprints and audit host database modules; B) fix/implement authoritative BSC quote/order claim and private approved receipt flow using mother finance tables; C) add consent-rechecking, suppression-aware newsletter enqueue/delivery with verified SMTP and safe opt-out; D) verify native OJS and source/public file privacy; E) only then run one explicitly authorised manual Bertina deployment and full post-release smoke with rollback. Keep each change narrowly scoped to canonical branch and do not re-merge stale PRs.
