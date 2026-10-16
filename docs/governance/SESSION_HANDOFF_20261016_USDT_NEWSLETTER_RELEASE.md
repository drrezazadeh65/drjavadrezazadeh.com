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
