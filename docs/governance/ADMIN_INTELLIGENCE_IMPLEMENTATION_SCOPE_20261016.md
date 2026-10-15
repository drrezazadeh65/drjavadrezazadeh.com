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
