# MASTER ECOSYSTEM ROADMAP — v1.0 FROZEN

**Owner:** Dr. Javad Rezazadeh Yazdeli  
**Primary brand:** Dr. Javad Rezazadeh Yazdeli  
**Publisher:** Rezazadeh Foundation Press  
**Journal:** Journal of Human-Centred Education, Learning and Assessment (JHELA)  
**Frozen on:** 2026-10-05  
**Status:** MASTER ROADMAP — SOURCE OF TRUTH

> This file is the authoritative roadmap for the website, educational platform, Golden Talent ecosystem, commerce, research infrastructure, publisher, and journal. It should be updated by status change rather than replaced by a new plan unless a major architecture decision is deliberately renewed.

---

## 0. Status language

Every roadmap item must carry one of these statuses.

- **FROZEN** — architecture or policy decision is approved and should not drift without a deliberate decision.
- **DONE** — implemented and accepted at the current maturity level.
- **MODIFIED** — an implemented item has been materially improved without changing its fundamental role.
- **RENEWED** — an earlier implementation has been replaced or substantially rebuilt.
- **IN PROGRESS** — active implementation is under way.
- **PLANNED** — approved but not yet started.
- **WAITING** — blocked by an external dependency, user-provided information, legal eligibility, budget, or infrastructure.
- **DEFERRED** — intentionally postponed because it does not serve the present strategic priority.
- **RETIRED** — intentionally removed and no longer part of the roadmap.

### Reporting rule
Future progress reports must refer to roadmap IDs and use this vocabulary, for example:

- **SEO-007 — DONE**
- **UX-004 — MODIFIED**
- **SERV-001 — RENEWED**
- **JRN-014 — WAITING**

No item is silently removed. If the strategy changes, the item is marked **MODIFIED**, **RENEWED**, **DEFERRED**, or **RETIRED**, with a dated note.

---

# 1. Non-negotiable operating principles

- [x] **GOV-001 — FROZEN — One ecosystem, multiple specialised surfaces.** The project is not a personal brochure site. It is a bilingual education, research, publishing, consulting, assessment and commerce ecosystem.
- [x] **GOV-002 — FROZEN — Public knowledge / private personal data boundary.** Knowledge, articles, services and verified professional content may be public. Accounts, educational records, messages, assessments, reports, orders and research-participant data are private.
- [x] **GOV-003 — FROZEN — Root English + /fa/ Persian.** English remains at the root; Persian lives under `/fa/`. No artificial `/en/` duplicate.
- [x] **GOV-004 — FROZEN — Stable URLs.** URLs are treated as long-term assets and are not casually renamed after indexing.
- [x] **GOV-005 — FROZEN — Verified claims only.** No invented affiliations, metrics, awards, indexing, editorial memberships, prices, dates, capacities, outcomes or scholarly claims.
- [x] **GOV-006 — FROZEN — Human-centred educational positioning.** Services must support judgement and development rather than deterministic labelling or one-size-fits-all prescriptions.
- [x] **GOV-007 — FROZEN — Writing voice.** Persian public writing follows Dr. Rezazadeh's own diction and argumentative habits. English public and scholarly writing follows the Javad Rezazadeh Integrated English Writing Style.
- [x] **GOV-008 — FROZEN — Confidential pre-publication work stays off public surfaces.** Confidential research constructs/projects are not exposed in public pages, metadata, schema, sitemap or public repository descriptions until explicitly released.
- [x] **GOV-009 — FROZEN — No false technical maturity.** A static placeholder is not described as a working login, payment system, journal submission platform or secure private database.
- [x] **GOV-010 — FROZEN — Accessibility, security and research integrity are architecture requirements, not later add-ons.**

---

# 2. SEO is the first gate, the middle gate and the final gate

## SEO Gate A — before a page or product exists
- [x] **SEO-001 — FROZEN — Search intent before page creation.**
- [x] **SEO-002 — FROZEN — One primary intent per canonical page.**
- [x] **SEO-003 — FROZEN — Entity-first identity architecture for Javad Rezazadeh Yazdeli, Rezazadeh Foundation Press, Golden Talent and JHELA.**
- [x] **SEO-004 — FROZEN — Keyword clusters, not keyword stuffing.**
- [x] **SEO-005 — FROZEN — URL, language, canonical and content purpose decided before indexing.**
- [ ] **SEO-006 — PLANNED — Formal keyword/intention map for every commercial and editorial cluster.**
- [ ] **SEO-007 — PLANNED — Competitor/SERP review before each major public cluster is expanded.**

## SEO Gate B — during design and implementation
- [x] **SEO-008 — MODIFIED — Semantic heading hierarchy and one H1 per major public page.**
- [x] **SEO-009 — MODIFIED — Internal-link architecture between About, Publications, services, Golden Talent, articles and journal calls.**
- [x] **SEO-010 — MODIFIED — Canonical, robots, Open Graph and structured-data foundations.**
- [x] **SEO-011 — MODIFIED — Image filenames, alt text, dimensions and image sitemap where relevant.**
- [x] **SEO-012 — FROZEN — Public pages indexable only after substantive content exists.**
- [ ] **SEO-013 — PLANNED — Breadcrumbs on every deep public page.**
- [ ] **SEO-014 — PLANNED — Full structured-data audit: Person, ProfilePage, Article/NewsArticle, Book, Service, BreadcrumbList, Organization, Product/Offer only where valid.**
- [ ] **SEO-015 — PLANNED — Core Web Vitals optimisation: LCP, INP, CLS budgets.**
- [ ] **SEO-016 — PLANNED — Accessibility audit as an SEO/UX quality gate.**
- [ ] **SEO-017 — PLANNED — Self-hosted production fonts and removal of remaining external-font fragility.**

## SEO Gate C — immediately before release/indexing
- [x] **SEO-018 — MODIFIED — XML sitemap controlled by approved canonical URLs.**
- [x] **SEO-019 — DONE — robots.txt allows crawling while page-level noindex controls unreleased routes.**
- [ ] **SEO-020 — WAITING — Google Search Console on the permanent domain.**
- [ ] **SEO-021 — WAITING — Bing Webmaster Tools on the permanent domain.**
- [ ] **SEO-022 — PLANNED — Pre-release broken-link, metadata, schema and hreflang validation.**
- [ ] **SEO-023 — PLANNED — Post-release indexing and query monitoring dashboard.**
- [ ] **SEO-024 — PLANNED — Content refresh/decay review every 90–180 days for high-value pages.**

---

# 3. Brand, domain and infrastructure

- [x] **INFRA-001 — DONE — Public GitHub repository and GitHub Pages staging/temporary hosting.**
- [x] **INFRA-002 — DONE — HTTPS on GitHub Pages.**
- [x] **INFRA-003 — FROZEN — Permanent main domain target: `drjavadrezazadeh.com`.**
- [x] **INFRA-004 — FROZEN — Journal target: `journal.drjavadrezazadeh.com`.**
- [x] **INFRA-005 — FROZEN — Future app target: `app.drjavadrezazadeh.com`.**
- [x] **INFRA-006 — FROZEN — Publisher initially lives at `/publisher/`; `press.` is optional later.**
- [ ] **INFRA-007 — WAITING — Purchase/activate permanent domain.**
- [ ] **INFRA-008 — WAITING — DNS cutover and HTTPS for permanent domain.**
- [ ] **INFRA-009 — PLANNED — One-time canonical/OG/schema/sitemap/robots migration from GitHub URL to permanent domain.**
- [ ] **INFRA-010 — PLANNED — Production backend hosting separate from static GitHub Pages.**
- [ ] **INFRA-011 — PLANNED — Staging environment kept noindex.**
- [ ] **INFRA-012 — PLANNED — Production database, private object storage and backup infrastructure.**
- [ ] **INFRA-013 — PLANNED — Transactional email/domain mail infrastructure.**
- [ ] **INFRA-014 — PLANNED — CDN/cache strategy for public media and documents.**

---

# 4. Design system, mobile experience and PWA

- [x] **UX-001 — MODIFIED — Obsidian/Graphite + Ivory + Muted Gold visual direction.**
- [x] **UX-002 — MODIFIED — Luxury academic UI foundations, cards, hero systems and content layouts.**
- [x] **UX-003 — MODIFIED — App-like bottom mobile navigation on major Persian service/content pages.**
- [x] **UX-004 — MODIFIED — Mobile menu sheet/controller.**
- [x] **UX-005 — DONE — Web manifest foundation.**
- [x] **UX-006 — RENEWED — Verified portrait asset and portrait integration after earlier wrong-image incident.**
- [x] **UX-007 — RENEWED — Educational-philosophy visual asset replaced after broken-image incident.**
- [ ] **UX-008 — IN PROGRESS — Global design consistency across every public page, journal page and foundation route.**
- [ ] **UX-009 — PLANNED — Formal design tokens: typography, spacing, radii, shadows, components, motion and states.**
- [ ] **UX-010 — PLANNED — Fully self-hosted Persian/English fonts.**
- [ ] **UX-011 — PLANNED — Mobile UX QA on small/medium/large devices and landscape orientation.**
- [ ] **UX-012 — PLANNED — PWA icons, installability, offline shell and service worker.**
- [ ] **UX-013 — PLANNED — Accessible focus states, keyboard navigation, screen-reader landmarks and reduced-motion QA.**
- [ ] **UX-014 — PLANNED — Native app considered only after PWA usage justifies it.**

---

# 5. Academic authority and professional identity

- [x] **AUTH-001 — MODIFIED — English homepage with canonical scholarly identity.**
- [x] **AUTH-002 — MODIFIED — Persian homepage.**
- [x] **AUTH-003 — RENEWED — English About page expanded with public CV content and Applied Linguistics.**
- [x] **AUTH-004 — RENEWED — Persian About page expanded with public CV content and Applied Linguistics.**
- [x] **AUTH-005 — MODIFIED — Public doctorate presentation protects the completion-year detail while retaining the agreed public timeline marker.**
- [x] **AUTH-006 — MODIFIED — University-teaching record replaces unwanted LIMS/RIMS material on public About pages.**
- [x] **AUTH-007 — DONE — Verified Publications page foundation.**
- [x] **AUTH-008 — DONE — Public research page foundation.**
- [x] **AUTH-009 — DONE — Educational philosophy in Persian and English, explicitly linked to «کشف مسیر طلایی استعداد».**
- [ ] **AUTH-010 — PLANNED — Books hub: academic books, Golden Talent, literary books and international editions.**
- [ ] **AUTH-011 — PLANNED — Teaching portfolio page.**
- [ ] **AUTH-012 — PLANNED — Public talks/webinars/conferences page with only verified entries.**
- [ ] **AUTH-013 — PLANNED — Exact Google Scholar profile verification and sameAs update when confirmed.**
- [ ] **AUTH-014 — PLANNED — Downloadable public CV version with privacy-safe fields.**
- [ ] **AUTH-015 — PLANNED — Citation/download cards for publications and books.**

---

# 6. Content, news and knowledge engine

- [x] **CONTENT-001 — RENEWED — Persian news/insights archive with visual editorial cards.**
- [x] **CONTENT-002 — DONE — In-depth article: «مشاوره تحصیلی برای تصمیم، نه نسخه آماده».**
- [x] **CONTENT-003 — MODIFIED — 1405 field-selection article expanded with analysis, internal links and multiple visuals.**
- [x] **CONTENT-004 — MODIFIED — JHELA collaboration call expanded with governance detail and SEO visual.**
- [x] **CONTENT-005 — DONE — Editorial image system for consulting, talent, decision-making and journal collaboration.**
- [ ] **CONTENT-006 — PLANNED — Evergreen Persian knowledge clusters for counselling, field selection, entrance exam, parents, teachers and talent.**
- [ ] **CONTENT-007 — PLANNED — English insights/research communication cluster.**
- [ ] **CONTENT-008 — PLANNED — Editorial calendar with priority, intent, owner, publication date, update date and internal-link targets.**
- [ ] **CONTENT-009 — PLANNED — Author/reviewer/date/last-reviewed metadata for high-stakes educational guidance.**
- [ ] **CONTENT-010 — PLANNED — Media library with SEO-safe alt/caption/licensing/provenance fields.**

---

# 7. Consulting and professional services

- [x] **SERV-001 — RENEWED — Persian consulting hub.**
- [x] **SERV-002 — RENEWED — Talent-identification service page tied to Golden Talent philosophy.**
- [x] **SERV-003 — DONE — Dedicated field-selection service page.**
- [x] **SERV-004 — DONE — Dedicated entrance-exam consulting page.**
- [x] **SERV-005 — DONE — Report-card analysis service section.**
- [x] **SERV-006 — DONE — Parent-consulting service section.**
- [x] **SERV-007 — DONE — Seven-step consulting process published.**
- [x] **SERV-008 — DONE — Consulting FAQ and Service structured data on the main hub.**
- [ ] **SERV-009 — PLANNED — Secure intake questionnaire.**
- [ ] **SERV-010 — PLANNED — Triage: service type, urgency, documents needed and advisor assignment.**
- [ ] **SERV-011 — PLANNED — Appointment calendar and timezone-aware scheduling.**
- [ ] **SERV-012 — PLANNED — Consultation payment before appointment where required.**
- [ ] **SERV-013 — PLANNED — Consultation notes, recommendations and follow-up record.**
- [ ] **SERV-014 — PLANNED — Human-reviewed report generation.**
- [ ] **SERV-015 — PLANNED — Institutional/school consulting packages.**
- [ ] **SERV-016 — PLANNED — Clear service boundaries, cancellation/refund/no-show policy and consent.**

---

# 8. Golden Talent ecosystem

- [x] **GT-001 — FROZEN — Golden Talent is a public brand/project within the ecosystem.**
- [x] **GT-002 — FROZEN — Scientific framing is developmental and probabilistic, not deterministic.**
- [x] **GT-003 — DONE — Public talent-identification service page.**
- [x] **GT-004 — DONE — Educational philosophy bridge from «کشف مسیر طلایی استعداد».**
- [x] **GT-005 — DONE — `/fa/golden-talent/` reserved as a controlled foundation route.**
- [ ] **GT-006 — PLANNED — Public Golden Talent Hub with framework, limitations and user pathways.**
- [ ] **GT-007 — PLANNED — Free screening level.**
- [ ] **GT-008 — PLANNED — Student self-report instruments.**
- [ ] **GT-009 — PLANNED — Parent-report instruments.**
- [ ] **GT-010 — PLANNED — Teacher Observation Instrument.**
- [ ] **GT-011 — PLANNED — School-performance and contextual evidence intake.**
- [ ] **GT-012 — PLANNED — Integrated Talent Profile.**
- [ ] **GT-013 — PLANNED — Golden Path recommendations and developmental actions.**
- [ ] **GT-014 — PLANNED — Free Snapshot, Standard, Professional, Integrated and Human-reviewed report tiers.**
- [ ] **GT-015 — PLANNED — Book/workbook/toolkit integration.**
- [ ] **GT-016 — PLANNED — Parent and teacher resource hubs.**
- [ ] **GT-017 — PLANNED — Referral from free screening to paid professional services without manipulative design.**

---

# 9. Accounts, portals and identity

- [x] **PORTAL-001 — DONE — Student portal public landing page.**
- [x] **PORTAL-002 — DONE — Static student login/register UX shells with data submission disabled.**
- [x] **PORTAL-003 — DONE — Reserved student/parent/teacher/app routes as noindex foundations.**
- [x] **PORTAL-004 — FROZEN — Roles: Student, Parent, Teacher, Consultant, Researcher, Editor, Admin, Super Admin.**
- [x] **PORTAL-005 — FROZEN — One account may hold multiple roles.**
- [ ] **PORTAL-006 — PLANNED — Production authentication and email verification.**
- [ ] **PORTAL-007 — PLANNED — Password reset, session security and account recovery.**
- [ ] **PORTAL-008 — PLANNED — Student dashboard.**
- [ ] **PORTAL-009 — PLANNED — Parent dashboard with multiple-child relationships.**
- [ ] **PORTAL-010 — PLANNED — Teacher dashboard with classes/students/observations.**
- [ ] **PORTAL-011 — PLANNED — Consultant dashboard.**
- [ ] **PORTAL-012 — PLANNED — User privacy, data export and deletion workflow.**
- [ ] **PORTAL-013 — PLANNED — Secure document upload for report cards, certificates and records.**

---

# 10. Assessment and report engine

- [x] **ASSESS-001 — FROZEN — Assessment model: Assessment → Version → Dimensions → Items → Responses → Scoring → Interpretation → Report.**
- [x] **ASSESS-002 — FROZEN — Historical results never silently change under a new scoring model.**
- [x] **ASSESS-003 — FROZEN — Autosave/resume/progress UX is required.**
- [x] **ASSESS-004 — FROZEN — QTI-aware future portability.**
- [ ] **ASSESS-005 — PLANNED — Assessment authoring/admin tools.**
- [ ] **ASSESS-006 — PLANNED — Item bank with version control.**
- [ ] **ASSESS-007 — PLANNED — Scoring engine.**
- [ ] **ASSESS-008 — PLANNED — Interpretation-rule engine.**
- [ ] **ASSESS-009 — PLANNED — Report template engine.**
- [ ] **ASSESS-010 — PLANNED — PDF/web reports.**
- [ ] **ASSESS-011 — PLANNED — Multi-respondent linking: student/parent/teacher.**
- [ ] **ASSESS-012 — PLANNED — Norm/reference metadata where scientifically justified.**
- [ ] **ASSESS-013 — PLANNED — Human review and override with audit trail.**

---

# 11. Commerce, store and payment

- [x] **COM-001 — DONE — Shop namespace reserved as noindex foundation.**
- [x] **COM-002 — FROZEN — One commerce identity for books, eBooks, workbooks, tests, reports, consultations, courses and toolkits.**
- [x] **COM-003 — FROZEN — Product/Offer schema only when a genuine purchasable product with verified price and availability exists.**
- [ ] **COM-004 — PLANNED — Public shop/category architecture.**
- [ ] **COM-005 — PLANNED — Product model: physical, digital, service, assessment, report, course.**
- [ ] **COM-006 — PLANNED — Cart.**
- [ ] **COM-007 — PLANNED — Checkout.**
- [ ] **COM-008 — PLANNED — Order and invoice records.**
- [ ] **COM-009 — PLANNED — Lawful payment-provider abstraction suitable for the actual publisher/business jurisdiction.**
- [ ] **COM-010 — PLANNED — Payment callback/verification and reconciliation.**
- [ ] **COM-011 — PLANNED — Refund/cancellation policy.**
- [ ] **COM-012 — PLANNED — Coupons/discount rules only if commercially useful.**
- [ ] **COM-013 — PLANNED — Digital delivery and entitlement management.**
- [ ] **COM-014 — PLANNED — Inventory/fulfilment for physical books if self-fulfilled.**
- [ ] **COM-015 — PLANNED — Consultation payment connected to booking.**
- [ ] **COM-016 — PLANNED — School/institution invoice workflow.**
- [ ] **COM-017 — FROZEN — Card/banking credentials are never stored by the site.**

---

# 12. CRM, booking and communication

- [ ] **CRM-001 — PLANNED — Contact/lead record with source attribution.**
- [ ] **CRM-002 — PLANNED — Consultation request → triage → booking → payment → session → follow-up pipeline.**
- [ ] **CRM-003 — PLANNED — Transactional email templates.**
- [ ] **CRM-004 — PLANNED — Appointment reminders and rescheduling.**
- [ ] **CRM-005 — PLANNED — Secure client messaging distinct from general support.**
- [ ] **CRM-006 — PLANNED — Notification preferences.**
- [ ] **CRM-007 — PLANNED — Consent-aware newsletter only after explicit opt-in.**
- [ ] **CRM-008 — PLANNED — Reviewer/editorial recruitment pipeline for JHELA kept separate from consulting CRM roles.**

---

# 13. CMS and administration

- [ ] **ADMIN-001 — PLANNED — CMS for articles, news, books, services, products and SEO fields.**
- [ ] **ADMIN-002 — PLANNED — Draft/review/publish workflow.**
- [ ] **ADMIN-003 — PLANNED — SEO fields: title, description, slug, canonical, hreflang, index state, OG, schema, dates, author/reviewer.**
- [ ] **ADMIN-004 — PLANNED — Redirect manager and URL-integrity guards.**
- [ ] **ADMIN-005 — PLANNED — User/role management.**
- [ ] **ADMIN-006 — PLANNED — Assessment management.**
- [ ] **ADMIN-007 — PLANNED — Order/payment management.**
- [ ] **ADMIN-008 — PLANNED — Consultation management.**
- [ ] **ADMIN-009 — PLANNED — Audit log for sensitive administrative changes.**
- [ ] **ADMIN-010 — PLANNED — Content revision history.**

---

# 14. Research-ready data foundation

- [x] **DATA-001 — DONE — Research-Ready Data Contract v1.**
- [x] **DATA-002 — FROZEN — Operational data is not automatically a research dataset.**
- [x] **DATA-003 — FROZEN — Raw responses immutable; corrections append events.**
- [x] **DATA-004 — FROZEN — Identity separated from pseudonymous research identifiers.**
- [x] **DATA-005 — FROZEN — Service/privacy/research/publication consents are distinct.**
- [x] **DATA-006 — FROZEN — Instrument/scoring/interpretation/report versions retained.**
- [ ] **DATA-007 — PLANNED — Research registry and study IDs.**
- [ ] **DATA-008 — PLANNED — De-identification pipeline.**
- [ ] **DATA-009 — PLANNED — Version-frozen research marts.**
- [ ] **DATA-010 — PLANNED — SPSS-ready export + codebook.**
- [ ] **DATA-011 — PLANNED — R/Python/CSV/XLSX exports.**
- [ ] **DATA-012 — PLANNED — MAXQDA/NVivo-ready qualitative export package.**
- [ ] **DATA-013 — PLANNED — Research-data access approvals and audit trail.**
- [ ] **DATA-014 — PLANNED — Retention/deletion rules that distinguish operational from research obligations.**

---

# 15. Rezazadeh Foundation Press

- [x] **PRESS-001 — FROZEN — Publisher identity: Rezazadeh Foundation Press.**
- [x] **PRESS-002 — DONE — Public publisher page.**
- [x] **PRESS-003 — FROZEN — Independent publisher; no university or society ownership is claimed without a formal agreement.**
- [x] **PRESS-004 — FROZEN — “Foundation” is a brand/publishing identity only unless legal foundation status is actually established.**
- [ ] **PRESS-005 — WAITING — Real publishable postal address.**
- [ ] **PRESS-006 — WAITING — Permanent main domain.**
- [ ] **PRESS-007 — PLANNED — Dedicated publisher-domain email.**
- [ ] **PRESS-008 — PLANNED — Publisher imprint/copyright/licensing policy.**
- [ ] **PRESS-009 — PLANNED — Book metadata/ISBN workflow where applicable.**
- [ ] **PRESS-010 — PLANNED — Long-term preservation policy for publisher content.**
- [ ] **PRESS-011 — PLANNED — Rights, permissions and takedown policy.**

---

# 16. JHELA — journal roadmap

## 16.1 Identity and staging
- [x] **JRN-001 — FROZEN — Title: Journal of Human-Centred Education, Learning and Assessment.**
- [x] **JRN-002 — FROZEN — Abbreviation: JHELA.**
- [x] **JRN-003 — FROZEN — Founding Editor-in-Chief: Dr. Javad Rezazadeh Yazdeli.**
- [x] **JRN-004 — DONE — Journal staging site under `/journal/`.**
- [x] **JRN-005 — FROZEN — Permanent target: `journal.drjavadrezazadeh.com`.**
- [x] **JRN-006 — DONE — Public reviewer call.**
- [x] **JRN-007 — DONE — Public founding-collaboration call.**
- [x] **JRN-008 — DONE — Persian founding/collaboration announcement with visual.**

## 16.2 Policies already drafted
- [x] **JRN-009 — DONE — Aims & Scope foundation.**
- [x] **JRN-010 — DONE — Peer-review policy foundation.**
- [x] **JRN-011 — DONE — Publication-ethics foundation.**
- [x] **JRN-012 — DONE — Author-guidelines foundation.**
- [x] **JRN-013 — DONE — Fees/payments foundation.**
- [x] **JRN-014 — DONE — Editorial-board governance foundation.**
- [x] **JRN-015 — DONE — Submission workflow foundation.**
- [x] **JRN-016 — DONE — Reviewer-registration model foundation.**
- [x] **JRN-017 — DONE — Current/archive/founding-checklist routes reserved.**
- [x] **JRN-018 — FROZEN — Core journal home/submission/current/archive remain noindex until launch-ready.**

## 16.3 Production infrastructure
- [ ] **JRN-019 — WAITING — Permanent domain connected.**
- [ ] **JRN-020 — PLANNED — Production OJS deployment.**
- [ ] **JRN-021 — PLANNED — Journal-domain email addresses.**
- [ ] **JRN-022 — WAITING — Real publisher address on publisher/journal legal pages.**
- [ ] **JRN-023 — PLANNED — ISSN application once title, permanent URL, publisher identity and required evidence are ready.**
- [ ] **JRN-024 — WAITING — DOI registration route through a legally available Registration Agency/sponsor.** Under current Crossref sanctions rules, an Iran-based organisation cannot apply for direct Crossref membership; the first operational investigation remains a lawful sponsored/alternative Registration Agency route (including the previously identified mEDRA/Sinaweb route where eligible). No nominal foreign address or misrepresentation is permitted.
- [ ] **JRN-025 — PLANNED — DOI landing-page and metadata workflow for every published article.**
- [ ] **JRN-026 — PLANNED — Preservation: PKP PN/Internet Archive and/or another appropriate long-term archive.**
- [ ] **JRN-027 — PLANNED — JATS XML or equivalently robust machine-readable article metadata.**
- [ ] **JRN-028 — PLANNED — ORCID integration where technically available.**
- [ ] **JRN-029 — PLANNED — Plagiarism/similarity workflow where lawfully and financially available.**

## 16.4 Editorial board and review
- [ ] **JRN-030 — IN PROGRESS — Recruit a genuinely international editorial board.**
- [ ] **JRN-031 — IN PROGRESS — Recruit reviewer pool by subject and method.**
- [ ] **JRN-032 — FROZEN — No person is publicly listed without explicit acceptance.**
- [ ] **JRN-033 — PLANNED — At least five appropriately qualified editors before DOAJ application; avoid one-institution concentration.**
- [ ] **JRN-034 — FROZEN — Research articles ordinarily receive at least two independent reviewers.**
- [ ] **JRN-035 — FROZEN — Editor/board conflicts require independent handling editor.**
- [ ] **JRN-036 — PLANNED — Reviewer performance/turnaround/quality monitoring.**

## 16.5 Founder-authored papers — integrity rule
- [x] **JRN-037 — FROZEN — JHELA is not a vehicle for publishing the entire backlog of the Editor-in-Chief's papers.**
- [x] **JRN-038 — FROZEN — A manuscript authored by the Editor-in-Chief may be considered, but the Editor-in-Chief has no role in its editorial decision.**
- [x] **JRN-039 — FROZEN — Founder-authored research papers require an independent handling editor, at least two external reviewers, conflict disclosure and a provenance/handling statement on publication.**
- [x] **JRN-040 — FROZEN — Research-article endogeny target must remain below the recognised 25% ceiling in each relevant issue/year; the operating target should be lower where possible.**
- [x] **JRN-041 — FROZEN — The founding issue should contain external scholarship; it must not consist mainly or entirely of the Editor-in-Chief's own research.**
- [ ] **JRN-042 — PLANNED — Classify the existing manuscript backlog into: external-journal priority, future-JHELA candidate, book/chapter, working paper, or archive/do-not-submit.**
- [ ] **JRN-043 — PLANNED — One founder editorial may introduce the journal's philosophy without being presented as peer-reviewed empirical research.**

## 16.6 Frequency and maturation
- [x] **JRN-044 — FROZEN — Quality and regularity outrank high issue frequency.**
- [ ] **JRN-045 — PLANNED — Founding recommendation: begin conservatively at two issues per year or a carefully managed continuous-publication model; move to quarterly only after submission volume, reviewer capacity and production reliability justify it.**
- [ ] **JRN-046 — PLANNED — Avoid bimonthly frequency in the founding year unless a genuine external manuscript pipeline exists.**
- [ ] **JRN-047 — PLANNED — DOAJ application only after the journal is actively publishing and all current criteria are satisfied.**
- [ ] **JRN-048 — PLANNED — Broader indexing applications are staged after publication stability, metadata quality, citation footprint and policy compliance are demonstrated.**
- [ ] **JRN-049 — PLANNED — Annual journal audit: endogeny, author geography, board diversity, review times, corrections, metadata, preservation and accessibility.**

---

# 17. Security, privacy and governance

- [x] **SEC-001 — FROZEN — Private data is never placed in public static assets.**
- [x] **SEC-002 — FROZEN — OWASP ASVS Level 2 is the production target.**
- [x] **SEC-003 — FROZEN — Least privilege and role-based access.**
- [ ] **SEC-004 — PLANNED — Admin MFA.**
- [ ] **SEC-005 — PLANNED — Secure password hashing and session management.**
- [ ] **SEC-006 — PLANNED — Encrypted transport and secure secrets management.**
- [ ] **SEC-007 — PLANNED — File malware/type/size validation and private storage.**
- [ ] **SEC-008 — PLANNED — Audit logs for administrative and sensitive-user actions.**
- [ ] **SEC-009 — PLANNED — Privacy policy, terms, consent records and child/parent relationship rules.**
- [ ] **SEC-010 — PLANNED — Data retention, deletion and export processes.**
- [ ] **SEC-011 — PLANNED — Backup/restore tests and disaster-recovery plan.**
- [ ] **SEC-012 — PLANNED — Incident response and vulnerability reporting.**

---

# 18. Analytics, observability and quality

- [ ] **OBS-001 — WAITING — Analytics on permanent domain with privacy-aware configuration.**
- [ ] **OBS-002 — WAITING — Search Console and sitemap monitoring.**
- [ ] **OBS-003 — PLANNED — Error logging and uptime monitoring.**
- [ ] **OBS-004 — PLANNED — Performance monitoring and Core Web Vitals.**
- [ ] **OBS-005 — PLANNED — Conversion events: consultation request, booking, checkout, assessment start/complete, report purchase.**
- [ ] **OBS-006 — PLANNED — Content metrics: impressions, CTR, organic landing pages, assisted conversions, content decay.**
- [ ] **OBS-007 — PLANNED — Journal operational metrics without vanity or fake impact claims.**
- [ ] **OBS-008 — PLANNED — Monthly technical QA and quarterly strategic review.**

---

# 19. Monetisation architecture

The revenue model is diversified so no single product has to carry the ecosystem.

- [ ] **REV-001 — PLANNED — One-to-one consultation.**
- [ ] **REV-002 — PLANNED — Field-selection packages.**
- [ ] **REV-003 — PLANNED — Entrance-exam planning/follow-up packages.**
- [ ] **REV-004 — PLANNED — Paid assessments and reports.**
- [ ] **REV-005 — PLANNED — Integrated Golden Talent Profile.**
- [ ] **REV-006 — PLANNED — Human-reviewed Golden Path report.**
- [ ] **REV-007 — PLANNED — Print books.**
- [ ] **REV-008 — PLANNED — eBooks/workbooks/toolkits.**
- [ ] **REV-009 — PLANNED — Courses/webinars where substantive value exists.**
- [ ] **REV-010 — PLANNED — School/institution licences and consulting.**
- [ ] **REV-011 — PLANNED — Teacher resources/observation tools.**
- [ ] **REV-012 — PLANNED — Journal APC only if later adopted transparently; never linked to acceptance and never charged at submission in the founding model.**
- [x] **REV-013 — FROZEN — No manipulative scarcity, false guarantees or pay-for-acceptance logic.**

---

# 20. Phased delivery roadmap

## Phase 0 — Foundation freeze — NOW
**Goal:** stop architectural drift and preserve the current build as a coherent baseline.

- [x] Governance principles
- [x] Public/private boundary
- [x] SEO three-gate rule
- [x] Current bilingual public identity
- [x] Consulting cluster
- [x] Golden Talent conceptual foundation
- [x] Research-data contract
- [x] Publisher and journal founding identity
- [x] This master roadmap

## Phase 1 — Permanent identity and public-site maturity — NEXT
**Exit condition:** permanent domain, visual consistency, clean crawl/indexing baseline and trustworthy conversion paths.

- [ ] Buy/connect main domain.
- [ ] Migrate canonicals/schema/sitemap once.
- [ ] Configure Search Console/Bing.
- [ ] Finish global design-system consistency and mobile QA.
- [ ] Self-host fonts.
- [ ] Build books hub.
- [ ] Expand high-intent Persian service/knowledge clusters.
- [ ] Add safe consultation intake and booking architecture.
- [ ] Create domain email.

## Phase 2 — Revenue MVP and account platform
**Exit condition:** user can register securely, book/pay lawfully, receive a service/product and see a private record.

- [ ] Backend/auth/database.
- [ ] Student/parent accounts.
- [ ] Booking.
- [ ] Payment abstraction.
- [ ] Orders/invoices.
- [ ] Consultation records.
- [ ] Shop MVP.
- [ ] Digital delivery.
- [ ] Admin/CMS MVP.

## Phase 3 — Golden Talent productisation
**Exit condition:** a user can complete a versioned assessment flow and receive a traceable report.

- [ ] Assessment engine.
- [ ] Self/parent/teacher inputs.
- [ ] Scoring/interpretation versions.
- [ ] Report tiers.
- [ ] Golden Talent Profile.
- [ ] Golden Path.
- [ ] Human review.
- [ ] Research-ready export pipeline.

## Phase 4 — JHELA production launch
**Exit condition:** the journal can lawfully and transparently receive, review, publish and preserve scholarly work.

- [ ] Permanent journal subdomain.
- [ ] OJS.
- [ ] Publisher postal address.
- [ ] Domain email.
- [ ] Editorial board.
- [ ] Reviewer pool.
- [ ] ISSN.
- [ ] Legally available DOI route.
- [ ] Preservation.
- [ ] Final author/reviewer/editor policies.
- [ ] Founding manuscript pipeline with external authors.
- [ ] Independent handling protocol for Editor-in-Chief manuscripts.
- [ ] Founding issue.

## Phase 5 — 12–24 month maturation
**Exit condition:** repeatable operations, broader authority, journal stability and international discoverability.

- [ ] Regular content cadence.
- [ ] Stable revenue mix.
- [ ] Institutional partnerships.
- [ ] DOAJ application when eligible.
- [ ] Journal frequency increase only if operationally justified.
- [ ] Expanded preservation/metadata.
- [ ] International service/product pages where demand is demonstrated.
- [ ] PWA maturity; native app only if data supports it.
- [ ] Annual architecture/security/research/journal audit.

---

# 21. Release definition of done

A public page is **DONE** only when:
1. its search intent is known;
2. content is substantive and fact-checked;
3. title/H1/meta/canonical are correct;
4. internal links are deliberate;
5. schema is valid where applicable;
6. images are relevant, optimised and accessible;
7. mobile UX is acceptable;
8. performance/accessibility are within target;
9. index/noindex is intentional;
10. sitemap inclusion is intentional.

A private feature is **DONE** only when:
1. authentication/authorization are real;
2. private data is not exposed publicly;
3. auditability and consent are implemented;
4. failure/error states are handled;
5. backup and recovery are tested;
6. security review is passed.

A journal feature is **DONE** only when:
1. policy and implementation agree;
2. no false identifier/indexing claim exists;
3. editorial independence is operational, not merely written;
4. metadata and preservation are planned or active as required;
5. fees, conflicts and ownership are transparent.

---

# 22. Roadmap change protocol

Every future roadmap update must include:

- Date
- Roadmap ID
- Previous status
- New status
- What changed
- Why it changed
- Whether SEO/canonical/data/journal integrity is affected

Example:

`2026-11-02 | SERV-011 | PLANNED → DONE | Booking calendar deployed | Enables paid consultation workflow | SEO unaffected; privacy reviewed.`

This prevents the project from returning to scattered decisions or losing earlier architectural work.
