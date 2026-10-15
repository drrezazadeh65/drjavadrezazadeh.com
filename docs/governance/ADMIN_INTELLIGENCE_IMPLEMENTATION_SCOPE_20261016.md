# Admin intelligence and Schema Center — implementation scope

Branch: `feature/admin-intelligence-schema-20261016`. This branch must not be automatically deployed.

## Immediate requirements

- Dedicated authenticated admin-only Schema Intelligence Center for Persian and English URLs, JSON-LD linting, content-to-schema consistency, duplication checks, evidence-backed scoring, and change-triggered revalidation.
- Reuse ENG-02 AI Discovery & GEO Engine; preserve existing `llms.txt`, crawler policy, entity identity and audits. Do not claim AI citations without measurements.
- Keyword Intelligence: bilingual query inventory, keyword-to-canonical mapping, competition, cannibalization and measured sources.
- Admin Intelligence Command Center: circular design consistent with existing design tokens; provenance-aware 0–10 scoring, issue audit, previous decisions and top three priorities. Live model access requires secured server-side runtime, scoped permissions and consent.
- Public assistant: evolve existing static bilingual guide through approved knowledge base and private backend, never publish credentials.
- Premium bookstore, moderation of comments and star ratings, PWA prompt once, homepage install button, footer logo balance, third-person professional biography, bibliographic data from verified imprint pages and Golden Talent plan labels remain required and must be audited against existing implementation before changes.
- **Konkur results simulator:** admin-only parked item, name only, no public route, computation, predictions or activation.

## Release gates

Admin MFA and server-side authorization; no-store/noindex; no regression in canonical/hreflang/SEO, payments, inventory, assessment, or PWA; integration tests and real production smoke tests; single controlled Bertina deployment only after approval. No release is authorized by this scope document alone.


## Owner additions — 2026-10-16 authentication, brand and footer

- Redesign all four production login/registration entry pages (/fa/login/, /fa/register/, /en/login/, /en/register/) with the **existing authentic site logo**, a dignified premium academic aesthetic, bilingual welcome copy and a single consistent slogan. Keep input names, validation attributes, server authentication, email verification, recovery flows and noindex boundaries unchanged.
- Proposed bilingual brand slogan approved for source integration pending visual review: **«دانش برای فهم، آموزش برای رشد» / "Knowledge for Understanding. Education for Growth."**. The slogan is an editorial brand expression, not a research claim.
- Add global bilingual footer copyright notice prohibiting unauthorized commercial reuse, reproduction and republication; explain possible legal recourse while preserving statutory exceptions.
- Owner confirmed domain-origin date to display: **18 November 2022 / ۱۸ نوامبر ۲۰۲۲**. Internal original Website dateCreated was already **2022-11-18**. The 2026-10-16 public RDAP/WHOIS attempt did not provide an independent readback; do not mislabel owner confirmation as independently registry certified.
- Footer should show the **observed PWA build identifier from /sw.js** as a truthful technical identifier, not falsely treat unreleased "v5.0.0" as published. Follow up with actual production-release SHA/semver integration after provenance is available.
- Maintain role-based, private-route, cache and accessibility behavior (including keyboard navigation, RTL/LTR layouts and no new third-party scripts).
- New source files: `assets/css/auth-premium-2026.css` and `assets/js/site-footer-meta-2026.js`. Auth pages use reusable CSS only; footer metadata is appended to existing public footers and loaded on public and gateway shells.
