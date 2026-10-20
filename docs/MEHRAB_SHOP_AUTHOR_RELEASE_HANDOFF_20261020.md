# Mirkarimi Digital Storefront & Private Author Dashboard — Release Handoff
Date: 2026-10-20 | Branch: `migration/bertina-linux6`

## Scope completed in source
- Bilingual `/fa/shop/` and `/en/shop/` catalogue displays three pre-existing printed books plus one Mirkarimi two-PDF product.
- Digital SKU is NOT put into the physical-book cart. It links to the existing server-verified guest checkout.
- The digital card checks `/api/publishing/offer` without trusting static browser prices to initiate bank transactions.
- Printed/digital format filters are accessible and mobile responsive.
- Product detail pages retain existing canonical/hreflang and now include `Product/Offer` JSON-LD in **IRR**: 10,000,000 IRR is 1,000,000 toman.
- Author's private dashboard retains noindex and uses the existing authenticated overview and onboarding APIs. UI adds keyboard-accessible tabs, explicit refresh, protected last-50-sales CSV and responsive financial cards.
- Author dashboard clears its private content if the authenticated read fails and revalidates after returning to the browser tab.
- Contextual links added in Persian and English publication hubs, clearly distinguishing a contributing author's teaching resource from the site's owner's scholarly publications.

## Production PHP synchronisation — critical
The production owner had independently installed and successfully activated the `jr-publishing-activate-existing-cli.php` v2 and corresponding `jr-publishing-digital.php` owner-approved PDF fulfilment flow. GitHub previously contained v1 with an obsolete scanner evidence gate.
The source branch has now been brought into **byte-exact parity with the two owner-installed v2 files**. Both local v2 files passed `php -l` checks.
This keeps mandatory PDF existence, SHA-256, size and PDF header checks while avoiding fabricated malware-scan attestations.
**Do not revert either PHP file to v1**, or a production deploy can disable digital fulfilment despite the database checkout switch being on.
Existing financial and author records, product SKU and physical commerce remain untouched.

## Suggested automated checks before owner-controlled release
```sh
node --test tests/jr-publishing-shop-author-integration.test.mjs
php -l api/internal/jr-publishing-activate-existing-cli.php
php -l api/internal/jr-publishing-digital.php
node scripts/build-public-site.mjs
```
The sanitized site builder now requires the new digital catalogue stylesheet and existing author/dashboard scripts. The frozen one-click GitHub Actions deployment workflow must not be changed.

## Status and manual production acceptance after deployment
Source-level syntax/metadata consistency checks passed during preparation. GitHub CI and a real post-deploy purchase have **not** been run in this preparation session. Do not mark those checks complete without output.
1. Owner starts the existing one-click Bertina workflow on `migration/bertina-linux6`; inspect build/QA and release acceptance.
2. Visit `/fa/shop/` and `/en/shop/` on mobile and desktop; confirm three printed books plus digital Mirkarimi card, filters and links.
3. Open the Persian and English Mirkarimi product pages; verify exact 1,000,000 toman price, `/api/publishing/offer` availability and BitPay handoff.
4. Complete **one authorised** real or permitted sandbox purchase from a non-admin buyer email and verify paid callback, one order, buyer receipt, both distinct PDF entitlements and private links.
5. Check exactly 700,000 toman author allocation and 300,000 toman talent-support accounting for a full-price sale; verify no duplicates after repeated callbacks, and that failed/abandoned payment gives no files.
6. Verify buyer email, author email and notification cron; an accepted payment without both files and receipt is not a passing release.
7. Log in as the verified author and confirm private dashboard, sales/financial totals, contracts, notifications, responsive tabs, CSV output and profile/bank onboarding; confirm unauthorized accounts cannot access the API.
8. Inspect PWA updates, search metadata and Search Console indexation after publishing.

## Clear release boundary
- **Committed source:** completed.
- **Production deployment of this storefront/dashboard release:** pending owner one-click action.
- **Full live paid transaction and private PDF delivery acceptance:** pending evidence.
- **Previous owner CLI activation:** independently confirmed with `all_checks_passed=true`, `changed=true`, and no missing checks; it is not itself a buyer delivery test.
