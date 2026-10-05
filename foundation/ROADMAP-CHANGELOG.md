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

### Golden Talent public framework launch
- **GT-006 | PLANNED → DONE** — Published bilingual indexable Golden Talent hubs at `/golden-talent/` and `/fa/golden-talent/` after a dedicated SERP/positioning review. The framework explicitly distinguishes talent from interest, skill and achievement; uses multi-source evidence; preserves uncertainty; and keeps personal assessments/reports in the private app.
- **SEO-007 | IN PROGRESS → IN PROGRESS** — Completed a second cluster-level live SERP review for Golden Talent/talent identification. The review remains an ongoing gate for future major clusters.
- **SEO-009 | MODIFIED → MODIFIED** — Connected Golden Talent to Home, Books, Educational Philosophy and talent-identification surfaces.
- **SEO-018 | MODIFIED → MODIFIED** — Added the bilingual Golden Talent URLs and framework image to the XML sitemap.

### Iranian-first payment strategy
- **COM-009 | PLANNED → IN PROGRESS** — Launch payment strategy is now explicitly Iranian-first for Golden Talent, books, consultation and other domestic educational services. ZarinPal, NextPay and Zibal form the initial provider-comparison set. International payment is deferred.
- **COM-010 | PLANNED → IN PROGRESS** — Payment architecture now explicitly requires server-side callback verification, idempotency and reconciliation for Iranian gateway adapters. Browser return alone never marks an order paid.
- **Commerce currency rule | NEW FROZEN DECISION** — Domestic orders use integer IRR internally; the interface may display toman using the explicit 1 toman = 10 IRR conversion rule.


### Bilingual architecture renewal, authority completion and Golden Talent implementation alignment
- **GOV-003 | FROZEN → RENEWED** — Replaced the earlier root-English architecture with the frozen 2026 bilingual international standard: neutral root gateway, Persian under `/fa/`, English under `/en/`, and NOINDEX transition handling for legacy unprefixed English routes.
- **SEO-015 | PLANNED → IN PROGRESS** — Added enforceable static performance budgets for core CSS/JS and large-image warnings; real-user LCP/INP/CLS remains a production-domain task.
- **SEO-016 | PLANNED → IN PROGRESS** — Added source-level accessibility release guardrails plus skip navigation, visible focus, keyboard mobile-menu handling, touch-target and reduced-motion support; full assistive-technology/live-device QA remains pending.
- **SEO-018 | MODIFIED → MODIFIED** — Rebuilt sitemap architecture as a sitemap index with separate core, Persian, English and news sitemaps and automated canonical/NOINDEX consistency checks.
- **SEO-022 | DONE → MODIFIED** — Extended release regression to the full current surface with sitemap membership, hreflang reciprocity, metadata, accessibility, performance, entity/fact and release-firewall checks.
- **INFRA-009 | PLANNED → IN PROGRESS** — Added atomic permanent-domain cutover tooling and runbook; execution waits for domain/DNS/HTTPS.
- **AUTH-003 | RENEWED → RENEWED** — Corrected English doctoral degree representation to PhD in Education, Arak University, 2026; removed unsupported current-affiliation wording and connected About to the structured Academic Profile.
- **AUTH-004 | RENEWED → RENEWED** — Corrected Persian doctoral degree representation, added Persian Research/Publications routes and removed unsupported current-affiliation wording.
- **AUTH-016 | NEW → DONE** — Published a dedicated English Academic Profile with a distinct factual/navigational intent, structured data and verified scholarly identifiers.
- **CONTENT-001 | RENEWED → RENEWED** — Split Persian time-sensitive News from evergreen Guides and constrained the news sitemap accordingly.
- **CONTENT-006 | PLANNED → IN PROGRESS** — Launched the Persian evergreen Guides hub and migrated the first two non-news guidance articles into it.
- **CONTENT-007 | PLANNED → IN PROGRESS** — Established English News & Insights, Language Education, Teacher Education, Projects and Collaboration communication hubs.
- **GT-007 | PLANNED → DONE** — Implemented RCAS Start free screening as P0 + Core 28 + routing without a fabricated total score.
- **GT-008 | PLANNED → IN PROGRESS** — Implemented the free student self-report baseline; deeper module execution awaits production entitlements/backend.
- **GT-012 | PLANNED → IN PROGRESS** — Implemented student-profile/dashboard preview plus provider-neutral persistence model.
- **GT-013 | PLANNED → IN PROGRESS** — Implemented Golden Path routed-module and professional-report preview.
- **GT-014 | PLANNED → IN PROGRESS** — Implemented staged product/entitlement architecture for free entry, Deep Module, Golden Path Professional and BAHAR Continuity; live pricing/payment remains pending.
- **GT-015 | PLANNED → IN PROGRESS** — Integrated RCAS Core, D1–D6 scope and E1–E10 evidence tasks from the Golden Talent toolkit into the digital product architecture.
- **GT-017 | PLANNED → IN PROGRESS** — Implemented the non-manipulative free-to-routed-premium product journey; conversion remains inactive until secure payment/backend.
- **GT-018 | NEW → IN PROGRESS** — Added BAHAR longitudinal-growth workspace and persistence schema; authenticated persistence remains pending.
- **Trust/Entity governance | NEW** — Added Public Facts Registry, pre-domain launch audit, full-name/title guardrails, degree-fact consistency checks, JHELA title enforcement, JHELA indexation allowlist and protected-research firewall.

### Font dependency hardening
- **SEO-017 | PLANNED → IN PROGRESS** — Removed third-party Inter/Vazirmatn webfont requests from the production stylesheet; final self-hosted font selection and integrity QA remain pending.
- **UX-010 | PLANNED → IN PROGRESS** — Standardised current rendering on system-safe English/Persian fallback stacks until final self-hosted assets are approved.
