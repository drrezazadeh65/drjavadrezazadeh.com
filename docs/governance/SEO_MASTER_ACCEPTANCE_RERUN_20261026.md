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

## Second run — immutable CSS gate compatibility

The source audit rerun `40280795052` on `81a03cf74427727aede075a1c0aaf96b9f96728e` removed all four earlier failing groups. Only `SEO/GEO regression` was blocked by an obsolete comment-substring check that assumed *every* CSS file must be network-first.

`scripts/seo-regression.mjs` now enforces the actual invariant: private routes use `cache:'no-store'` first; only the builder's exact SHA-12 `style`, `public-v2` and `operations-owner.(fa|en)` CSS aliases can use immutable cache-first; **all mutable CSS and JavaScript remain network-first**. The negative private-cache test already passed in the second run. No live site files were deployed.

**Third audit run requested for the exact new commit. Do not deploy until the third audit passes.**

## Third run — preserve the 120 KiB critical CSS source budget

The third acceptance run on `23792f3bbfa44ebdd38a3096ecfb9770ca2e5c57` identified one remaining source performance failure: `assets/css/style.css` at approximately 126,656 bytes exceeded its 122,880-byte gate.

The core CSS now retains the local Persian font face, logical bilingual alignment, essential heading families and anti-overflow rules. Fine-grained heading styling, decorative hover/focus polish and motion preferences remain implemented in the existing secondary `assets/css/public-v2.css` layer. This forward-only change reduces `style.css` to approximately **122,520 characters**; combined with expected UTF-8 overhead the source budget is now below 122,880 bytes. `public-v2.css` remains below the same file-size cap. No route, private HTML, payment API or mother database changed.

The next GitHub audit must confirm the exact release source byte budget, font hierarchy, independent service screens, CSS packaging, and the unchanged `no-store` cache firewall. No live performance claim is made.

**Fourth source-only master audit and SEO regression requested. No Bertina deployment authorised.**

## Fourth run — preserve luxury within BOTH CSS budgets

The fourth source-only audit on `a6ff87667bbee7a4c0e6a85ef70509e0b17901fd` passed the former 120 KiB `style.css` gate, but found that the newly expanded `assets/css/public-v2.css` exceeded its independent, stricter 90,000-byte luxury design gate (about 91,835 bytes).

No visual rules, gold/cyan treatments, focus states, luxury motion effects or Persian fonts were removed. Only nonsemantic rule-boundary newlines and indentation were compacted in `public-v2.css`. It is now approximately **88,811 source characters**, with all historic design declarations and media queries retained. A new test `source CSS stays within both performance budgets without sacrificing luxury visuals` in `tests/iran-first-bilingual-presentation-contract.test.mjs` enforces **both** numeric caps and the required luxury effect, reduced-motion, responsive and font tokens.

This change is **not** a claim of Lighthouse 100, field Core Web Vitals approval or Google position #1. It is a source-level improvement designed to avoid regressions before the independent device and live-host verification.

**Fifth nondeploying master audit and SEO GEO regression requested for this commit. Release remains blocked until they pass.**
