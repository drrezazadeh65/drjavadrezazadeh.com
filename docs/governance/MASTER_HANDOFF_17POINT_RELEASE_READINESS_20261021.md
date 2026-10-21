# Seventeen-point owner handoff — release-readiness ledger
21 October 2026 · drjavadrezazadeh.com · only branch: `migration/bertina-linux6`

## Interpretation
This ledger traces the owner's original 17-section SUPER MASTER DEVELOPER HANDOFF prompt. It is a source-development and acceptance record, NOT a production certification. Do not conflate a source Commit, static assertions, a successful older deployment, the existence of five community tables, or registered GA4/GTM IDs with a working purchase, live journal intake, Google indexing, or validated psychometrics.

The owner confirmed the 15 bilingual homepage banners are **already designed and visible in production**. Never regenerate or replace their imagery without explicit editorial authorization.

## Implemented or materially advanced in source
1. Existing branch and frozen deployment workflow retained; no parallel services/database.
2. Global FA/EN typography logical-alignment contract and test coverage.
3. Native PWA/private-cache policy, release notice, mobile navigation and scientific experiences preserved; device acceptance remains open.
4. 15 live banner identities remain intact. `scripts/render-home-campaigns.mjs` now projects both static homepages from one validated JSON registry with `--check` by default; preservation + source tests are integrated into Master SEO source audit. This is NOT a live administrator banner editor.
5. Reused FA/EN/JHELA search index. Public publishing-imprint discovery was repaired; client-side path admission also rejects private account/admin/checkout/journal route families even if the public index were accidentally contaminated.
6. Five owner-provisioned MariaDB community tables were verified through phpMyAdmin screenshots. Existing Operations workspace inherits administrator membership + fresh MFA. Moderation, draft/publish/hide/edit/revisions, older-comments keyset pagination, permanent erasure for SUPER_ADMIN and approved-only public replies are in source and under conditional feature flags. Approved-only descriptive star mean is computed over the entire page, not the displayed subset; no speculative Review schema.
7. New browser source tests cover all seven requested breakpoints (320/360/390/430/768/1024/1440) on bilingual home/login/shop/journal plus 320px field focus; they are connected to the existing public scientific QA job.
8. Bilingual in-press book detail/canonical/hreflang/search discovery, sitemap lastmod and private schema sampling were improved earlier in this conversation.

## Unclosed requirements — do NOT mark verified
| Prompt section | Remaining acceptance evidence |
|---|---|
| 1 / 2 | Fixed final source SHA, exact current live SHA, proven no-regression delivery, staging backup/recovery evidence. |
| 3 | Run new seven-breakpoint visual/browser suite and fix actual overflows/text direction; independently check Safari, keyboard and 200% zoom. |
| 4 | Installed PWA upgrade in Android/iOS and desktop, no reload loops or form loss; legacy service pages/mobile nav require direct route QA. |
| 5 | Full owner dashboard banner create/edit/reorder/schedule/publish RBAC and durable editorial storage are NOT implemented; static single-source generation is a source-authoring improvement only. |
| 6 | Real indexed public search across site/JHELA, language/category relevance, links, and no private content via production smoke tests. |
| 7 | Real MySQL/PHP registered-user submission, moderation MFA, publish/draft/reply/erasure, anti-abuse, correct aggregate votes; current article pilot is limited to Persian news/guides; English/service coverage NOT finished. |
| 8 | Independent server-verified BitPay/commerce E2E, receipts/fulfilment and customer-owner ledgers for 21 sellable services. USDT chain/order/manual approval must remain gated. No fake payment proof. |
| 9 | Golden Talent/RCAS/BAHAR/admissions simulated/free-step, identity/consent, parent-child permissions, privacy, source provenance, printable reports and real Bertina persistence; scientific calibration remains research-stage. |
| 10 | Native JHELA private PDF custody, host TLS, antivirus, publisher roles/review/finance and authenticated end-to-end test. Do not claim first issue, DOI, ISSN or operational peer review without proof. |
| 11 | Google Search Console and Bing real indexation evidence, schema validation, alt text, Core Web Vitals, GA4/Clarity consent/live tags, public/private crawl checks. |
| 12 | Re-run 146-case historical strict live redirect and canonical TLS verifier with current Force HTTPS settings and analyze failures; do not weaken `.htaccess` or tests. |
| 13 | Resolve owner-scoped phased gate with exact source/live SHA, authorized release inputs, recoverability evidence and audit; keep frozen deploy workflow unchanged. |
| 14 | Run one exact-SHA full Master SEO, public science/Playwright, community MySQL and browser, payment, JHELA, accessibility, PWA/cache, security, performance and release preflight matrix. Record GitHub run IDs and artefacts. |
| 15 | Only after owner-approved GO and host backup, one exact SHA Bertina workflow release and post-release smoke/rollback readiness. |
| 16 / 17 | Final evidence report must distinguish source, CI, live, blocked, deferred; no fictitious 10/10. |

## Current independent blocker evidence
- `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` reports `BLOCKED_PENDING_FULL_ACCEPTANCE`: 0/41 acceptance gates and 0/21 sellable-service records marked VERIFIED, with no final owner authorization. It must not be modified to pretend success.
- Existing protected production workflow `.github/workflows/deploy-bertina.yml` remains frozen (Git blob `280c6ac95d534ef6db9b292ddbe7467053f0ba76`). Full-masterplan publication is blocked until external evidence and explicit owner approval exist; limited phased release requires its own exact-scope permissions and independent preflight.
- Real-time provider settlement, private manuscript storage/antivirus and production database restore proofs remain unavailable; do not substitute static source reviews for these.
- GitHub Actions REST evidence was checked on 2026-10-21: workflow dispatch `39627329014`, commit `124b17829873bd9ab342d02277e1213d3bc7c6a6`, succeeded after prior failures `39626512180` (phased release owner-scope authorization) and `39625169003` (strict historical HTTPS verifier). The successful run's jobs showed success for `BLOCK unsafe guarded phased release`, `Extract and checksum every managed file on Bertina`, and `Verify every registered historical URL with trusted public TLS`. This demonstrates the earlier two observed release blockers were resolved in that **older release**; it is NOT approval of this later development SHA and MUST be repeated when publishing a new snapshot.
- Workflow `39658907336` initially rejected source SHA `13f4bc676e410d7ccee6535b076cc5e6da08af22` because the unchanged banner test expected an obsolete sequential-write pattern. Source fix preserves two-language prevalidation; the safety assertion was updated in commit `55e4b2f62f3d6ab1faabf385493bad5c0cc67396`. Re-run conclusion is required before recording a PASS.
- This handoff must not request a redundant CREATE TABLE for the five existing community tables or a second deployment workflow.

## Acceptance commands for the eventual **fixed** final SHA (in a real checkout)
```sh
node scripts/render-home-campaigns.mjs --check
node --test tests/home-campaigns.test.mjs tests/home-campaigns-renderer.test.mjs
node --test tests/site-search-public-scope.test.mjs
node --test tests/community-moderation.test.mjs tests/community-design-consistency.test.mjs tests/community-academic-replies.test.mjs
node --test tests/bilingual-typography-contract.test.mjs
php -l api/community.php
# CI fixture, NEVER production DB:
# node --test ... and php tests/community-mysql-smoke.php with isolated MySQL
# Playwright: existing public-scientific-experience-qa and community database gate workflows.
```
After these targeted checks, run complete existing CI and affected browser/host gates. An unsuccessful check is a real blocker requiring a focused fix, not a reason to remove its assertion.

**Release position:** SOURCE WORK CONTINUES; FINAL COMBINED QA NOT PROVEN; NO NEW PRODUCTION DEPLOYMENT AUTHORIZED.
