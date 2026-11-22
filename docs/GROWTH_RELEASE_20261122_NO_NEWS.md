# Brand, mobile-first and search-growth release — 2026-11-22

**Scope:** A unified source release, staged for the existing owner-controlled Deploy to Bertina workflow. **No production deployment has been executed.**

## Owner's binding exclusions
No modifications to public newsroom, its data, scheduler, engine, settings, live feeds or publishing queue. The **permanently frozen** owner deployment workflow is unchanged. Its existing public-site build chain now fails closed before packaging/upload if the source delta against the live revision contains a news-related path.

## Changes in this release
- Structured Person identity synonyms using the **correct** Persian spelling رضازاده; stable `#person` entity ID and existing `sameAs` remain intact.
- Evidence-based, original, helpful discovery content and decision aids on 15 bilingual existing routes; no URLs changed or created.
- Scoped, responsive CSS for newly added components only; tap targets >= 48px; keyboard focus and reduced-motion supported. No additional JS, tracking, marketing popup, library or server runtime.
- Query-intent to landing-page registry for branded, talent-development, educational consulting, entrance examinations and English identity discovery.
- Transparent lead-intake explanation: existing guest email composer is **not a submitted form**; verified-account intake remains optional and gated. No promise of a new live backend or purchase flow.
- End-of-development read-only source audit and protected-news SHA-diff deployment guard.

## Known unresolved operational checks
GSC clicks, impressions, CTR and keywords need real 30-day historical data; Ahrefs did not grant API usage. Core Web Vitals need field or validated lab measurements. Real visitor-to-paid conversion depends on the existing MySQL, email, checkout and order/receipt probes. Google or AI search rankings cannot be guaranteed by deployment. Preserve consent and the existing single owner release.

## Release procedure
1. Review this branch and compare against the current production head.
2. Run the integrated source and browser/SEO/security gates (CI) and verify no regressions.
3. Merge into `migration/bertina-linux6` only after acceptance. No production deployment occurs on merge because `deploy-bertina.yml` is owner-dispatched only.
4. Owner visits the existing GitHub **Deploy to Bertina** workflow, selects `migration/bertina-linux6`, and clicks **Run workflow** once. The additional news delta guard must pass before host changes.
5. After launch, confirm news routes byte-equivalent where applicable, lead flow and checkout, mobile layouts, Core Web Vitals, and GSC indexing. Roll back through the pre-existing controlled recovery policy on verified failure.

**Safety:** No third-party externally controlled provider, new paid service, fake AI ranking/citation, raw student data, automatic consent, renamed URL, finance change or news change.

## Integrated QA findings and fixes
The first PR run detected three shortened title variants and four Person alternateName contract mismatches; the full official Persian name was restored to all affected titles and the entity guard now validates each approved alias. Browser suites initially failed at browser installation because the runner moved to Ubuntu 26.04 while Playwright 1.56 expects a supported distribution; browser and production workflow runners are pinned to Ubuntu 24.04. These are QA fixes, not exceptions that skip tests.

### Immutable deployment contract preserved
The original one-click workflow is protected by fixed Git blob SHA tests and must not be modified. Release-scoped news protection is attached to the existing package-stamp build step, which runs after owner checks and before upload, and is accompanied by read-only tests. The owner workflow still uses its historical runner definition; browser compatibility on that runner must be verified before claiming release readiness.

## Verified analytics diagnostic (Ubersuggest)
The existing account-level drjavadrezazadeh.com project is **inactive** (user_inactivity), tracks just **English, United States (loc_id 2840)**, has 8 tracked English keywords and 10 English AI visibility prompts. Its October 22–November 20 AISV results contain **zero sampled answers**; 0% visibility there must not be presented as proof that any AI provider omitted the site. Persian/Iran search performance and qualified lead counts are not measured by that project. Do not silently replace tracked settings or incur brand-operation credits. Use real GSC/first-party leads and explicitly accepted geographic/language tracking before inferring progress.

## Runner compatibility
GitHub's `ubuntu-latest` now resolves to Ubuntu 26.04 (2026-11), while pinned Playwright 1.56 browser installers reject it. Independent browser CI has been pinned to Ubuntu 24.04. The **owner deployment workflow remains unchanged and frozen**; its browser dependency/runner compatibility is an external release readiness blocker until independently verified or explicitly authorized to update. Do not claim ready-to-deploy solely because source CI passes.

### Independent live-news preflight
The read-only `Growth Release — Protected Live News Preflight` workflow also inspects the exact live `sw.js` SHA during PR validation and compares all news-related source paths to the proposed commit before the owner authorizes release. A missing live fingerprint or any news change causes this check to fail closed. The same check is repeated in the original owner release's existing package-stamp stage.

Independent initial PR preflight revealed a false positive: the protect-news source files had `news` in their own *filenames*. Those two protective files are now explicitly excluded from the protected newsroom path set; real news routes, API code, publication queues, feeds and sitemaps remain protected. Live SW fingerprint identified the existing base commit `e32a6d9feea06e8a284a5592d396a45f6c71b319` at the time of the check.
