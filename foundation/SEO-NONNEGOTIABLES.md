# SEO NON-NEGOTIABLES

Status: **Release-blocking project invariant**  
Owner priority: **SEO and URL integrity outrank visual convenience, refactoring convenience and short-term feature speed.**

## 1. URL identity

- Existing indexable public paths are stable identifiers.
- Do not rename, shorten, translate, reorganise or delete a released path merely because a new information architecture looks cleaner.
- A future URL migration requires explicit approval, a one-hop permanent redirect, canonical/hreflang/sitemap updates in the same release, and post-release verification.
- Redirect chains and redirect loops are prohibited.
- On the current GitHub Pages host, do not assume repository `_redirects` is an active server redirect engine. Prefer path preservation. Any future host migration must revalidate redirect behaviour before relying on it.

The frozen released set is stored in:
`platform/public-url-stability-manifest.json`

## 2. Zero broken-link policy

A release must not introduce:

- broken internal `href` targets;
- broken local image/script/stylesheet/form targets;
- missing local fragment IDs;
- empty `href`, `href="#"` or JavaScript placeholder links in shipped HTML;
- internal HTTP links;
- internal `www` links when apex is canonical;
- exposed `index.html` route links;
- avoidable missing-trailing-slash links to directory routes;
- sitemap URLs without a real page;
- redirect destinations that do not exist;
- redirect chains or loops.

Enforced by:
`scripts/link-integrity-audit.mjs`

## 3. Canonical production origin

Canonical public origin:
`https://drjavadrezazadeh.com`

The GitHub Pages repository origin is legacy only and must not appear in public SEO-bearing HTML/XML after the completed 2026-10-06 cutover.

Canonical, hreflang, Open Graph URLs, JSON-LD IDs/URLs, sitemaps and robots must move together in any future origin migration.

## 4. Canonical and sitemap continuity

Every frozen indexable route must:

- remain present or have an explicitly approved permanent migration;
- self-canonicalise to the production HTTPS apex;
- remain represented in the correct child sitemap while indexable;
- never be simultaneously `noindex` and listed in a sitemap;
- never silently disappear from the sitemap set.

Enforced by:
`scripts/url-stability-audit.mjs`

## 5. Hreflang

- Hreflang is used only for genuine equivalents.
- Reciprocal links are required.
- Persian and English pages are independent editorial products; a language switch must not be invented where no equivalent exists.
- `x-default` is used only where its routing meaning is defensible.

## 6. 404 discipline

- Internal site links must never intentionally lead to 404.
- `404.html` remains `noindex`.
- Recovery links and assets on `404.html` must be root-absolute because GitHub Pages can serve that document at arbitrary missing path depths.
- Do not auto-redirect every 404 to the home page; that hides errors and creates soft-404 risk.

## 7. External links

Public external links are checked independently for hard 404/410 responses.

Enforced by:
`scripts/external-link-audit.mjs`
and weekly GitHub Actions workflow:
`.github/workflows/external-link-monitor.yml`

Bot-blocking, rate limits and transient network failures are warnings rather than automatic broken-link classifications.

## 8. Design-change rule

Visual redesign may change layout, typography, hierarchy, responsive behaviour and component composition.

It must not casually change:

- URL path;
- canonical;
- hreflang;
- robots/index state;
- structured-data entity identity;
- breadcrumb URL identity;
- sitemap membership;
- meaningful anchor destinations.

Design commits remain subject to the same SEO regression gates as content and platform commits.

## 9. Private surfaces

Authentication, account, assessment, checkout and private educational routes remain `noindex` and excluded from public XML sitemaps unless an explicit future release decision changes the route policy.

## 10. Release gate

The main SEO/GEO CI workflow must stay green before a release is considered acceptable. Current blocking layers include:

1. source SEO/GEO regression;
2. visual-system regression;
3. zero-broken-link and redirect-chain audit;
4. frozen URL/canonical/sitemap stability audit;
5. public JavaScript and ecosystem governance tests;
6. public entity/schema checks;
7. master ecosystem audit.

A design or feature improvement is not considered successful if it weakens any of these invariants.
