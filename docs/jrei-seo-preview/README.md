# JREI SEO Intelligence — commercial frontend staging
Owner: Dr. Javad Rezazadeh. Persian is primary; Arabic and English are full interface alternatives.
## Contents
- fa/jrei/seo/, ar/jrei/seo/, en/jrei/seo/: isolated static design previews.
- assets/jrei-seo-preview/: shared stylesheet and catalogue client; 100 action identifiers from Foundation v0.1.0 (20) and Advanced v0.2.0 (80), with translated labels.
- docs/jrei-seo-preview/api-contract.json: proposed API contract, not an existing endpoint.
## Design decisions
Preserve the existing public URLs and mother-site design. Black/gold parent identity and teal product workspace. Responsive RTL/LTR, no external scripts, no fake scores. The domain form is local-only and the engine run button is disabled. The three language routes are proposed, noindex preview routes, not final published canonicals.
## Scope and next integration
Only frontend is stored here. Engine archives, Python, Qwen, credentials, private databases and worker code remain in the private JREI environment. No auth, billing, payment, deployment, news, sitemap, current navigation, PWA or production API changes. Academic and Forge will be transferred separately by the owner. Reuse the site account and payments after integration; never create parallel systems. The future portal may link these three products using common routes and shared design tokens.
## Acceptance
Before any owner-approved publication, verify the real site route inventory, all 3 locales and mobile layouts, navigation, access control, noindex removal only for approved public marketing pages, private dashboard no-store, API authentication, job provenance, localization of engine results, load limits, and no regressions. This is design-only source staging; no commercial functionality or live deployment claimed.