# ROADMAP CHANGELOG

This file records status transitions for the frozen Master Ecosystem Roadmap. Items are never silently removed.

## 2026-10-05

### Authority expansion
- **AUTH-010 | PLANNED → DONE** — Published bilingual Books & Creative Work hubs at `/books/` and `/fa/ketab-ha/`. Added verified published poetry collections, works in preparation, publishing-status boundaries, hreflang, structured data, internal links and SEO visuals.
- **AUTH-011 | PLANNED → DONE** — Published bilingual University Teaching portfolios at `/teaching/` and `/fa/tadris/`. Added verified institutions, teaching areas, educational positioning, hreflang, structured data and SEO visuals.
- **SEO-009 | MODIFIED → MODIFIED** — Extended internal-link architecture so Home and About surfaces connect to Books and Teaching.
- **SEO-018 | MODIFIED → MODIFIED** — Added the four new authority URLs and their image metadata to the XML sitemap.
- **UX-008 | IN PROGRESS → IN PROGRESS** — Applied the current authority-page design system to the new public surfaces; full-site visual convergence is still incomplete.

### Foundation governance
- **Master Foundation** — Registered `/books/`, `/fa/ketab-ha/`, `/teaching/` and `/fa/tadris/` as public indexable authority surfaces.

### Reader-facing Books copy
- **AUTH-010 | DONE → MODIFIED** — Removed internal publishing-policy language from the public Books pages. Replaced it with a concise reader-facing “Forthcoming works / آثار در دست انتشار” note, while retaining the verification rule internally in roadmap/publisher governance.

### SEO architecture and academic engagement expansion
- **SEO-006 | PLANNED → DONE** — Frozen `foundation/SEO-INTENT-MAP.md` defining canonical ownership, cannibalisation rules, public/private index boundaries, service intent, Golden Talent, commerce and journal SEO architecture without invented search-volume claims.
- **AUTH-012 | PLANNED → DONE** — Published bilingual academic-engagement pages at `/academic-engagements/` and `/fa/faaliat-haye-elmi/` using evidence-controlled conference, academic-service and professional-development records.
- **SEO-009 | MODIFIED → MODIFIED** — Linked Academic Engagements from Home and About surfaces in both languages.
- **SEO-018 | MODIFIED → MODIFIED** — Added both engagement URLs and the conference visual to the sitemap.

### Search-demand and editorial operating system
- **SEO-007 | PLANNED → IN PROGRESS** — Completed a live SERP review for the core Persian counselling/field-selection/entrance-exam/talent cluster. Future major clusters must repeat this review before expansion.
- **CONTENT-008 | PLANNED → DONE** — Created `foundation/EDITORIAL-CALENDAR-90D.md` with a 90-day publishing rhythm, page intent, internal-link targets, image requirements, quality gates and cycle-close audit.

### First post-SERP editorial execution
- **CONTENT-FS-01 | PLANNED → DONE** — Published «چه رشته‌ای برای من مناسب است؟ از پاسخ سریع تا تصمیم قابل دفاع» with a distinct informational intent, Article + FAQ structured data, original SEO visual, internal links to field-selection/talent/counselling services, and sitemap registration.

### Source-level SEO release gate closure
- **SEO-013 | PLANNED → DONE** — Added visible breadcrumbs and BreadcrumbList structured data across every current deep indexable public page.
- **SEO-014 | PLANNED → DONE** — Audited the current indexable structured-data surface, repaired missing metadata and confirmed all JSON-LD blocks parse as valid JSON.
- **SEO-022 | PLANNED → DONE** — Validated title/meta/robots/H1/canonical/schema/OG metadata across all 27 sitemap URLs, checked internal links against the repository tree with zero broken targets, and confirmed reciprocal hreflang on all six genuine bilingual pairs.

### Design-system and accessibility baseline
- **UX-009 | PLANNED → DONE** — Frozen `foundation/DESIGN-SYSTEM.md` covering semantic tokens, typography, component families, mobile rules, image governance, interaction rules and release checks.
- **UX-013 | PLANNED → IN PROGRESS** — Added global visible focus styles, minimum 44px touch targets, target scroll offsets and forced-colour focus fallback; full assistive-technology and live-device QA remains pending.

### Production platform foundation
- **INFRA-010 | PLANNED → IN PROGRESS** — Frozen a provider-neutral production architecture separating public SEO web, authenticated app and versioned API. Added consultation state machine, commerce/payment abstraction, Golden Talent assessment versioning, RBAC, private storage, CMS/admin, research-data and security boundaries.
- **Core Data Model | NEW FROZEN FOUNDATION** — Added `foundation/CORE-DATA-MODEL.md` defining identity, educational record, consultation, assessment, Golden Talent, commerce, content/SEO, communication, consent, research and journal-recruitment domains without committing to a vendor before eligibility and hosting are confirmed.

### Consultation intake and API contract
- **SERV-009 | PLANNED → IN PROGRESS** — Added a central NOINDEX consultation gateway at `/fa/darkhast-moshavere/`; public counselling CTAs now converge on one transactional entry point. The current safe fallback uses email and explicitly avoids collecting sensitive documents on GitHub Pages.
- **CRM-002 | PLANNED → IN PROGRESS** — Froze the consultation state model and published `foundation/API-CONTRACT-v1.yaml` covering consultation requests, appointments, payment intents/callbacks, assessment sessions, reports and private file uploads.
- **INFRA-010 | IN PROGRESS → IN PROGRESS** — Added `foundation/PROVIDER-DECISION-MATRIX.md`; the platform remains provider-neutral until account/access and production suitability are verified.

### Database implementation foundation
- **COM-005 | PLANNED → IN PROGRESS** — Added provider-neutral PostgreSQL product, price, cart, order, payment-intent, verified-payment, refund, entitlement and invoice schema. No public product/Offer claim is enabled yet.
- **DATA-007 | PLANNED → IN PROGRESS** — Added research-study registry/version and pseudonymous case schema.
- **DATA-008 | PLANNED → IN PROGRESS** — Added separated identity-link and de-identification run/transformation-log schema; executable transformation logic remains pending.
- **DATA-009 | PLANNED → IN PROGRESS** — Added codebook-version, dataset-freeze and research-export schema; actual research mart generation remains pending.
- **Platform DB foundation** — Added four ordered migrations under `platform/db/migrations/` for identity/consultation, commerce, assessment/Golden Talent and research governance, plus `platform/README.md` documenting deployment gates.

### Privacy, RBAC and private-app prototype expansion
- **SEC-009 | PLANNED → IN PROGRESS** — Added bilingual NOINDEX privacy/data-use notices, consultation service policies, a frozen RBAC/relationship permission matrix and privacy governance baseline. Jurisdiction-specific legal review remains pending before production.
- **SERV-016 | PLANNED → IN PROGRESS** — Defined educational-service scope, no-guarantee rule, professional boundaries and pre-payment disclosure requirements; final cancellation/refund/no-show terms await the real booking/payment model.
- **PORTAL-008 | PLANNED → IN PROGRESS** — Added Persian student dashboard prototype.
- **PORTAL-009 | PLANNED → IN PROGRESS** — Added Persian parent dashboard prototype and parent-child relationship schema.
- **PORTAL-010 | PLANNED → IN PROGRESS** — Added Persian teacher dashboard prototype and scoped teacher-student assignment schema.
- **PORTAL-011 | PLANNED → IN PROGRESS** — Added Persian consultant dashboard prototype reflecting triage, assigned cases, notes and follow-up.
- **PORTAL-012 | PLANNED → IN PROGRESS** — Added privacy-request schema for access/correction/export/deletion/restriction/consent-withdrawal.
- **PORTAL-013 | PLANNED → IN PROGRESS** — Added private-document metadata, malware-scan state and scoped access-grant schema; private storage remains pending.
