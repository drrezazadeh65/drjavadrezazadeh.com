# Image alternative-text audit — 13 Persian academic articles (16 October 2026)

## External report
The site owner supplied an SEO tool warning labelled **"Alt attribute for images is missing"** for 13 URLs under `/fa/akhbar/`, each with an observed count of **3**. This is third-party audit output, not proof that three `alt` attributes were missing.

## Source inspection
All 13 corresponding canonical HTML documents were fetched and inspected at the time of this review. Total: **39 `<img>` elements**.
- **26 images** have nonempty Persian descriptive `alt` text (featured article image and related bookstore image in each article).
- **13 linked service icons** have an intentionally empty `alt=""` and immediately adjacent visible service text within the same `<a class="launch-offer">`.
- **0 images** were missing the `alt` attribute.
- **0 semantic violations** were detected by the new source-level rules.

The icon does not contribute independent content beyond the service link's visible label. Replacing `alt=""` with repetitive keyword text would make screen-reader output noisier and need not improve indexing. This distinction is consistent with established image alternative-text accessibility principles; missing `alt` is a different case from empty `alt` on a purely decorative/redundant image.

## Permanent regression protection
- `scripts/article-image-alt-policy.mjs`: rule distinguishing required descriptive `alt` from a justified empty service icon `alt`. Empty `alt` must be part of the labelled service link.
- `scripts/audit-13-articles.mjs`: now applies that rule to each listed launch article and fails the release audit on missing or unjustified `alt`.
- `tests/article-image-alt-policy.test.mjs`: six positive and negative semantic fixtures.
- `.github/workflows/seo-regression.yml`: runs the new policy tests before article source audits.
- Existing `scripts/seo-regression.mjs` also checks globally for omitted `alt` attributes; retain this pre-existing safeguard.

## Acceptance and remaining evidence
- **Source semantic audit:** 13/13 affected files checked; all 39 images classified; no semantic rule failures.
- **Not independently verified:** live Bertina HTML after actual deploy, any JavaScript-injected images, third-party crawler configuration/cache, screenshots at mobile/desktop widths, CI run for the exact resulting commit.
- **Action:** request crawler recheck after verifying the production SHA; if warning persists, compare its exact affected HTML nodes with live DOM and inspect whether it classifies empty `alt` as missing, rather than blindly adding keyword text.

**Result:** No content-image ALT replacement is justified by the current source evidence. Keep incident on monitoring checklist until production crawl revalidation.
