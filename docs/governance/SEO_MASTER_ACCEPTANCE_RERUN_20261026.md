# Source-only master audit re-run — 26 October 2026

**Branch:** `migration/bertina-linux6`  
**Deployment authority:** none. This commit requests a GitHub Actions *nondeploying* source audit only. It does not approve the Bertina production deployment workflow, live migrations or any commercial operation.

## Findings from owner-triggered Bertina Master SEO Audit

Source workflow run `40280106757` checked commit `48a037b755681b40dab25334b195cd44345613aa` and reported **four failing audit groups**:

1. `SEO/GEO regression`: four decorative 40 × 40 / 70 × 70 logos on Golden Talent (FA/EN) and JHELA (FA/EN) were marked `fetchpriority="low"` but neither `loading="lazy"` nor `fetchpriority="high"`. All four are now `loading="lazy" decoding="async" fetchpriority="low"` with existing explicit intrinsic sizes. The LCP hero assets are unchanged.
2. `Master semantic headings / indexability / GEO`: the root language choice gateway (`/`) is the `x-default` locale, while `/en/` and `/fa/` are language-specific. The semantic audit was incorrectly requiring the gateway's document `lang="en"` to have an `en` alternate pointing to the root. It now recognizes **only** the explicitly paired gateway `x-default=/`, `en=/en/`, `fa=/fa/` configuration, without changing any canonical URLs or hreflang tags.
3. `Global FA/EN typography and bidi contract`: a 2026-10-21 text-alignment test examined every later CSS rule, accidentally prohibiting narrow `!important` heading-font overrides required to displace legacy `Tahoma`. The test now checks precisely the low-specificity alignment contract and separately preserves the self-hosted Persian H1–H6 font requirements.
4. `Owner mobile/store/version/editorial regression`: legacy test expected `20261016-imprint-v3`, while both current stores correctly reference the new crawlable-book version `20261026-indexable-books-r1`. The assertion is aligned with both existing source pages; no bookstore page, price or image was changed.

Earlier workflow reports confirm all other source groups passed **at that older SHA**, including safe public build and per-route source inventory. These results **do not certify this commit** and do not constitute a Google Search Console indexing or PageSpeed field measurement.

## Required approval sequence

- Rerun nondeploying source audit for the exact new branch HEAD and require every group to pass.
- Run responsive/browser QA and whole-route checks for the same exact source commit, including owner command deck, comments/ratings and Persian/English pages.
- If all checks pass, separately review Bertina deployment readiness and explicit production release.
- Do not label a page score of 100 or Google position #1 as achieved without independent measured evidence.

**Status: source fixes staged; re-run requested, not yet certified.**
