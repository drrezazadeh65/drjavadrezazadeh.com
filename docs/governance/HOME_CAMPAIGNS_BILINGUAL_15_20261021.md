# Bilingual homepage campaigns — fifteen real destinations

Date: 21 October 2026. Scope: source branch `migration/bertina-linux6`; **not proof of production deployment**.

## Contract

The 15 cards come from `platform/home-campaigns-20261021.json`: one featured campaign, five learner/student pathways, five academic/professional services and four books, journal, news or support placements. Every Persian and English destination is an existing public `index.html`; every banner uses an existing editorial or article image. No invented offers, external ad networks, autoplay, personalization or tracking.

For crawlability, `fa/index.html` and `en/index.html` contain static semantic text, real anchor destinations and all 15 images. CSS: `assets/css/home-campaigns-v1.css`. Progressive enhancement: `assets/js/home-campaigns-v1.js`. The static pages remain usable if JavaScript is unavailable. The three rails support native swipe, RTL/LTR scroll snap, keyboard scrolling and labeled previous/next buttons. No service-worker, account, database or payment changes.

## Brand and content governance

- Preserve the approved dark/charcoal, ivory and restrained gold system. Use existing approved assets; never add unlicensed imagery.
- Use direction-aware `text-align:start`: Persian RTL, English LTR. Maintain high contrast. All 15 promo images are lazy to prevent a homepage network burst.
- Golden Talent, RCAS and BAHAR messaging is research-stage and educational; never imply validated psychometrics or guaranteed educational outcomes.
- Avoid unverified offers, fake discounts, prices, ratings, publication statuses or projected benefits.
- When editing, change the catalog and matching static markup; source contract tests require full parity and reject missing targets/media. Preserve homepage hero, canonical/hreflang, private noindex, payments and PWA.
- Owner-facing, live dashboard editing of campaigns is a separately gated capability and is **not** implemented by this release.

## Acceptance

`node --test tests/home-campaigns.test.mjs` and `npx playwright test tests/home-campaigns.browser.spec.js` with a local HTTP server on port 4173. CI also runs browser regressions, full responsive route checks, visual crawl, SEO/GEO and Bertina preflight. Passing CI is not proof of deployment. Production upload requires the guarded owner-authorized publication workflow.
