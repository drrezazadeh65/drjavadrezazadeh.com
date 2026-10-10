# MASTER ECOSYSTEM ROADMAP — v2.0 FROZEN

**Owner:** Dr. Javad Rezazadeh Yazdeli  
**Primary brand:** Dr. Javad Rezazadeh Yazdeli  
**Publisher:** Rezazadeh Foundation Press  
**Journal:** Journal of Human-Centred Education, Learning and Assessment (JHELA)  
**Frozen on:** 2026-10-05  
**Foundation alignment:** v5.0 extensibility baseline · reconciled 2026-10-10
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
- [x] **GOV-003 — RENEWED — Neutral root gateway + dedicated `/fa/` and `/en/` language namespaces.** The root is a neutral bilingual brand/language gateway; Persian lives under `/fa/` and English under `/en/`. Legacy unprefixed English routes remain NOINDEX transition routes. This renewal implements the FINAL MASTER SEO STANDARD — Bilingual International Edition frozen on 5 October 2026.
- [x] **GOV-004 — FROZEN — Stable URLs.** URLs are treated as long-term assets and are not casually renamed after indexing.
- [x] **GOV-005 — FROZEN — Verified claims only.** No invented affiliations, metrics, awards, indexing, editorial memberships, prices, dates, capacities, outcomes or scholarly claims.
- [x] **GOV-006 — FROZEN — Human-centred educational positioning.** Services must support judgement and development rather than deterministic labelling or one-size-fits-all prescriptions.
- [x] **GOV-007 — FROZEN — Writing voice.** Persian public writing follows Dr. Rezazadeh's own diction and argumentative habits. English public and scholarly writing follows the Javad Rezazadeh Integrated English Writing Style.
- [x] **GOV-008 — FROZEN — Confidential pre-publication work stays off public surfaces.** Confidential research constructs/projects are not exposed in public pages, metadata, schema, sitemap or public repository descriptions until explicitly released.
- [x] **GOV-009 — FROZEN — No false technical maturity.** A static placeholder is not described as a working login, payment system, journal submission platform or secure private database.
- [x] **GOV-010 — FROZEN — Accessibility, security and research integrity are architecture requirements, not later add-ons.**
- [x] **GOV-011 — DONE — Machine-readable extensibility governance.** A versioned ecosystem registry now defines route/data/auth/cache/index boundaries, expansion contracts, module separation, API/database evolution rules and mobile-app invariants; CI fails closed when critical governance drifts.

---

# 2. SEO is the first gate, the middle gate and the final gate

## SEO Gate A — before a page or product exists
- [x] **SEO-001 — FROZEN — Search intent before page creation.**
- [x] **SEO-002 — FROZEN — One primary intent per canonical page.**
- [x] **SEO-003 — FROZEN — Entity-first identity architecture for Javad Rezazadeh Yazdeli, Rezazadeh Foundation Press, Golden Talent and JHELA.**
- [x] **SEO-004 — FROZEN — Keyword clusters, not keyword stuffing.**
- [x] **SEO-005 — FROZEN — URL, language, canonical and content purpose decided before indexing.**
- [x] **SEO-006 — DONE — Formal canonical keyword/intention map created for identity, authority, services, Golden Talent, editorial, commerce, journal and private-platform clusters.**
- [ ] **SEO-007 — IN PROGRESS — Live SERP review protocol is active; the core Persian service cluster has been reviewed, and each future major cluster requires its own review before expansion.**

## SEO Gate B — during design and implementation
- [x] **SEO-008 — MODIFIED — Semantic heading hierarchy and one H1 per major public page.**
- [x] **SEO-009 — MODIFIED — Internal-link architecture between About, Publications, services, Golden Talent, articles and journal calls.**
- [x] **SEO-010 — MODIFIED — Canonical, robots, Open Graph and structured-data foundations.**
- [x] **SEO-011 — MODIFIED — Image filenames, alt text, dimensions and image sitemap where relevant.**
- [x] **SEO-012 — FROZEN — Public pages indexable only after substantive content exists.**
- [x] **SEO-013 — DONE — Every current deep indexable public page now has visible breadcrumb navigation and BreadcrumbList structured data; homepage roots are intentionally exempt.**
- [x] **SEO-014 — DONE — Current indexable surface completed a source-level structured-data audit; missing WebPage/BreadcrumbList metadata was repaired and every JSON-LD block parses successfully. Product/Offer remains prohibited until a real offer exists.**
- [ ] **SEO-015 — IN PROGRESS — Core Web Vitals optimisation.** Static CSS/JS/image performance budgets are enforced in regression; production-domain real-user LCP/INP/CLS validation remains pending.
- [ ] **SEO-016 — IN PROGRESS — Accessibility audit as an SEO/UX quality gate.** Static guardrails now cover main landmarks, accessible interactive names, form-label warnings, skip navigation, visible focus, keyboard menu handling, touch targets and reduced motion; full screen-reader/live-device QA remains pending.
- [ ] **SEO-017 — IN PROGRESS — Third-party webfont dependencies have been removed; final self-hosted production font selection/integrity QA remains pending.**

## SEO Gate C — immediately before release/indexing
- [x] **SEO-018 — MODIFIED — Sitemap-index architecture controls approved canonical URLs through separate core, Persian, English and news sitemaps; NOINDEX/private/legacy URLs are excluded and regression-enforced.**
- [x] **SEO-019 — DONE — robots.txt allows crawling while page-level noindex controls unreleased routes.**
- [ ] **SEO-020 — WAITING — Google Search Console on the permanent domain.**
- [ ] **SEO-021 — WAITING — Bing Webmaster Tools on the permanent domain.**
- [x] **SEO-022 — MODIFIED — Automated release QA now audits the entire current indexable surface on every push: metadata, H1, canonical, sitemap membership, schema/OG coverage, breadcrumbs/internal links, reciprocal genuine hreflang, accessibility baselines, performance budgets, entity/fact consistency and release firewalls.**
- [ ] **SEO-023 — IN PROGRESS — Private bilingual admin monitoring architecture now represents post-release Search Console, organic landing, field-CWV and content-decay signals without fabricated metrics; live data binding remains pending permanent-domain provider activation.**
- [ ] **SEO-024 — IN PROGRESS — The admin review calendar now formalises a 90–180 day high-value content review cadence alongside monthly technical QA and quarterly strategic review; automated scheduling and production performance evidence remain pending.**

---

# 3. Brand, domain and infrastructure

- [x] **INFRA-001 — DONE — Public GitHub repository and GitHub Pages staging/temporary hosting.**
- [x] **INFRA-002 — DONE — HTTPS on GitHub Pages.**
- [x] **INFRA-003 — FROZEN — Permanent main domain target: `drjavadrezazadeh.com`.**
- [x] **INFRA-004 — FROZEN — Journal target: `journal.drjavadrezazadeh.com`.**
- [x] **INFRA-005 — FROZEN — Future app target: `app.drjavadrezazadeh.com`.**
- [x] **INFRA-006 — FROZEN — Publisher initially lives at `/publisher/`; `press.` is optional later.**
- [x] **INFRA-007 — DONE — Permanent domain acquired and activated: `drjavadrezazadeh.com`.**
- [ ] **INFRA-008 — IN PROGRESS — Permanent domain is delegated to Bertina; Bertina reports Certum DV installed and strict proxy-mediated transport checks pass. Independent origin-certificate and historical redirect certification remain pending.**
- [ ] **INFRA-009 — IN PROGRESS — Canonical-origin migration to https://drjavadrezazadeh.com is recorded as completed; preserve frozen URLs and independently certify strict public-origin TLS and redirect behavior before any HTTPS activation.**
- [ ] **INFRA-010 — IN PROGRESS — Bertina Linux/Apache/PHP/MySQL/domain-mail production architecture is selected and implemented. Recorded release evidence reports database, auth and SMTP configuration readiness; trusted public TLS, certified delivery and private operational bindings remain pending.**
- [ ] **INFRA-011 — IN PROGRESS — Staging/preview policy frozen: non-production previews remain noindex, private no-store, synthetic-data only, with production secrets/payments excluded and CI-gated promotion.**
- [ ] **INFRA-012 — PLANNED — Production database, private object storage and backup infrastructure.**
- [ ] **INFRA-013 — PLANNED — Transactional email/domain mail infrastructure.**
- [ ] **INFRA-014 — IN PROGRESS — Bertina Apache cache/revalidation behaviour is the public baseline while assets remain non-fingerprinted; private routes use explicit no-store, Service Worker code delivery is network-first, and long immutable caching is prohibited until a content-hashed asset pipeline exists. Production header/cache verification remains part of Bertina release QA.**

---

# 4. Design system, mobile experience and PWA

- [x] **UX-001 — MODIFIED — Obsidian/Graphite + Ivory + Muted Gold visual direction.**
- [x] **UX-002 — MODIFIED — Luxury academic UI foundations, cards, hero systems and content layouts.**
- [x] **UX-003 — MODIFIED — App-like bottom mobile navigation on major Persian service/content pages.**
- [x] **UX-004 — MODIFIED — Mobile menu sheet/controller.**
- [x] **UX-005 — DONE — Web manifest foundation.**
- [x] **UX-006 — RENEWED — Verified portrait asset and portrait integration after earlier wrong-image incident.**
- [x] **UX-007 — RENEWED — Educational-philosophy visual asset replaced after broken-image incident.**
- [ ] **UX-008 — IN PROGRESS — Global design consistency across public, journal and foundation routes.** The released Persian, English and core public surface uses a shared premium academic visual layer, now including bilingual CV, search, legal and consultation utilities; JHELA retains its dedicated scholarly system; and the bilingual admin/private platform spans student dashboards, account/privacy centers and subpages, D1–D6 modules, parent/teacher/adviser workspaces, role resources/path views, consultant case workspaces, bilingual observer evidence, Golden Talent commerce/checkout and matched Persian/international student appointment workspaces. Shared components now include truthful status strips, current-navigation states, print-ready CV treatment and citation actions. A CI design-regression gate protects these visual contracts; final live-device/cross-browser visual spot QA remains pending.
- [x] **UX-009 — DONE — Formal design-system baseline documented with semantic tokens, typography, component families, image rules, interaction rules, mobile behaviour and design governance.**
- [ ] **UX-010 — IN PROGRESS — Public UI now uses stable system-safe fallbacks with no third-party font requests; final self-hosted Persian/English font package remains pending font-integrity QA.**
- [ ] **UX-011 — IN PROGRESS — Static responsive coverage has been expanded across public-v2, role dashboards, account/auth surfaces, consultation intake and student gateways for desktop, tablet and small-screen breakpoints; physical-device and landscape spot QA remain pending.**
- [ ] **UX-012 — IN PROGRESS — PWA manifest, service worker, offline shell, install prompts, cache-version governance, private-route cache bypass, network-first code delivery, exact 192×192 / 512×512 launcher icons and a dedicated 512×512 maskable icon are implemented and source-validated; only live installability/device QA remains pending.**
- [ ] **UX-013 — IN PROGRESS — Accessible interaction baseline now extends visible focus, minimum touch targets and reduced-motion support across public-v2 and portal-v2, including dashboard navigation, pills, role cards, public buttons and service/auth controls; full keyboard/screen-reader/live-device QA remains pending.**
- [ ] **UX-014 — PLANNED — Native app considered only after PWA usage justifies it.**
- [ ] **UX-015 — IN PROGRESS — Four-audience public gateway architecture (Students & Parents, Researchers & Academics, Teachers & Educators, Institutions) is implemented on both homepages and bilingual service hubs without bloating primary navigation; deeper audience-specific journeys remain ongoing.**

---

# 5. Academic authority and professional identity

- [x] **AUTH-001 — MODIFIED — English homepage with canonical scholarly identity.**
- [x] **AUTH-002 — MODIFIED — Persian homepage.**
- [x] **AUTH-003 — RENEWED — English About page carries the professional/biographical narrative, while recurrent degree claims are constrained by the Public Facts Registry and release guardrails.**
- [x] **AUTH-004 — RENEWED — Persian About page carries the professional/biographical narrative with corrected PhD field/year, Persian Research/Publications pathways and Public Facts Registry discipline.**
- [x] **AUTH-005 — MODIFIED — Public doctorate presentation protects the completion-year detail while retaining the agreed public timeline marker.**
- [x] **AUTH-006 — MODIFIED — University-teaching record replaces unwanted LIMS/RIMS material on public About pages.**
- [x] **AUTH-007 — DONE — Verified Publications page foundation.**
- [x] **AUTH-008 — DONE — Public research page foundation.**
- [x] **AUTH-009 — DONE — Educational philosophy in Persian and English, explicitly linked to «کشف مسیر طلایی استعداد».**
- [x] **AUTH-010 — DONE — Bilingual Books hub published with verified literary work, Golden Talent and publishing-status boundaries.**
- [x] **AUTH-011 — DONE — Bilingual university-teaching portfolio published with verified institutions and teaching areas.**
- [x] **AUTH-012 — DONE — Bilingual public academic-engagements pages published with verified conferences, academic service, professional development and the confirmed 30 October 2026 MATSDA engagement.**
- [ ] **AUTH-013 — PLANNED — Exact Google Scholar profile verification and sameAs update when confirmed.**
- [ ] **AUTH-014 — IN PROGRESS — Bilingual print-ready public CV pages are implemented at `/en/cv/` and `/fa/rezome/`, using only already verified public-site facts and publication metadata. Browser print/save-PDF is available; a dedicated generated PDF artifact can be added later if operationally useful.**
- [ ] **AUTH-015 — IN PROGRESS — Verified publication citation cards now provide copyable citation text and DOI actions on English and Persian scholarly-record pages. Book citation/download cards remain deferred until title-level bibliographic metadata is verified rather than inferred.**
- [x] **AUTH-016 — DONE — Dedicated `/en/academic-profile/` provides a concise factual dossier distinct from the narrative About page, using only frozen/defensible public facts and verified scholarly identifiers.**

---

# 6. Content, news and knowledge engine

- [x] **CONTENT-001 — RENEWED — Persian content taxonomy now separates time-sensitive News/Announcements from evergreen Guides; the news sitemap contains only time-sensitive news URLs.**
- [x] **CONTENT-002 — DONE — In-depth article: «مشاوره تحصیلی برای تصمیم، نه نسخه آماده».**
- [x] **CONTENT-003 — MODIFIED — 1405 field-selection article expanded with analysis, internal links and multiple visuals.**
- [x] **CONTENT-004 — MODIFIED — JHELA collaboration call expanded with governance detail and SEO visual.**
- [x] **CONTENT-005 — DONE — Editorial image system for consulting, talent, decision-making and journal collaboration.**
- [ ] **CONTENT-006 — IN PROGRESS — Evergreen Persian knowledge system launched at `/fa/rahnamaha/` with the first field-selection and counselling guides; broader parent/teacher/talent clusters remain to be expanded deliberately.**
- [ ] **CONTENT-007 — IN PROGRESS — English `/en/news-insights/`, Research, Language Education, Teacher Education, Projects and Collaboration hubs establish the communication architecture; substantive insight publishing remains ongoing.**
- [x] **CONTENT-008 — DONE — 90-day editorial calendar created with publishing rhythm, intent ownership, internal-link targets, quality gates and review cycle.**
- [ ] **CONTENT-009 — IN PROGRESS — Visible author, publication date and last-content-review metadata is enforced on the first high-stakes Persian guidance pages; independent reviewer attribution remains pending a real reviewer workflow and will never be fabricated.**
- [ ] **CONTENT-010 — IN PROGRESS — Media library with SEO-safe alt/caption/licensing/provenance fields.**
- [ ] **CONTENT-011 — IN PROGRESS — Knowledge Hub architecture is frozen around Pillar → Supporting Articles → FAQs → Tools → Services, with current Persian evergreen guides and English insights as foundations; full topical-cluster expansion remains ongoing.**

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
- [ ] **SERV-009 — IN PROGRESS — Central bilingual NOINDEX intake gateway and v1 API contract now route student/parent, academic/researcher, teacher and institutional professional-service requests with minimum-data collection; secure server-side submission is pending backend activation.**
- [ ] **SERV-010 — IN PROGRESS — Triage: service type, urgency, documents needed and advisor assignment.**
- [ ] **SERV-011 — IN PROGRESS — Bilingual private appointment workspaces are now integrated into both student dashboards and account centers, with explicit availability, timezone, payment, confirmation, reschedule/cancel and status-history boundaries; the provider-neutral appointment API contract is implemented. Live availability, calendar provider, timezone-aware slot inventory and authenticated persistence remain pending backend/calendar activation.**
- [ ] **SERV-012 — PLANNED — Consultation payment before appointment where required.**
- [ ] **SERV-013 — IN PROGRESS — Consultation notes, recommendations and follow-up record.**
- [ ] **SERV-014 — IN PROGRESS — Human-reviewed report generation.**
- [ ] **SERV-015 — IN PROGRESS — Institutional/school consulting packages.**
- [ ] **SERV-016 — IN PROGRESS — Bilingual consultation policy now defines service scope, no-guarantee rule, professional boundaries and future booking/cancellation/refund disclosure requirements; final paid-service terms remain pending.**
- [ ] **SERV-017 — IN PROGRESS — Academic and researcher professional services are now explicit on bilingual service hubs: academic English editing, manuscript diagnostic review, research/publication consultation, reviewer-response support and academic career/interview consultation. Confidential materials remain outside first-contact channels; pricing and fulfilment terms await verified operations.**
- [ ] **SERV-018 — IN PROGRESS — Invite Dr. Rezazadeh / institutional pathway now supports scoped enquiries for keynote, webinar, panel, workshop, teacher training, consulting and research collaboration without premature contractual or availability claims.**

---

# 8. Golden Talent ecosystem

- [x] **GT-001 — FROZEN — Golden Talent is a public brand/project within the ecosystem.**
- [x] **GT-002 — FROZEN — Scientific framing is developmental and probabilistic, not deterministic.**
- [x] **GT-003 — DONE — Public talent-identification service page.**
- [x] **GT-004 — DONE — Educational philosophy bridge from «کشف مسیر طلایی استعداد».**
- [x] **GT-005 — DONE — `/fa/golden-talent/` reserved as a controlled foundation route.**
- [x] **GT-006 — DONE — Bilingual public Golden Talent hubs published with developmental/multi-source framework, limitations, role pathways, Golden Path concept and private-platform boundary.**
- [x] **GT-007 — DONE — RCAS Start free screening implemented as P0 + Core 28 + D1–D6 routing, with no fabricated total-talent score and no server storage of raw answers before backend activation.**
- [ ] **GT-008 — IN PROGRESS — Student self-report baseline is implemented in RCAS Start; deeper routed-module execution remains entitlement/backend dependent.**
- [ ] **GT-009 — IN PROGRESS — Parent observation is implemented through the shared RCAS-O1 observation standard rather than a separate scored parent test; production persistence awaits verified parent–student relationship, consent/visibility rules and backend activation.**
- [ ] **GT-010 — IN PROGRESS — Teacher observation is implemented through the shared RCAS-O1 standard rather than a separate scored teacher test; production persistence awaits verified teacher–student assignment, role-based access and backend activation.**
- [ ] **GT-011 — IN PROGRESS — Private school-performance/context intake now separates R-source performance evidence from C-source context and includes the E7 Constraint→Control→Support map; persistent intake remains pending authenticated backend/provenance controls.**
- [ ] **GT-012 — IN PROGRESS — Integrated evidence-profile UX now represents A–G domains, S/P/R/O/C/T sources, the four descriptive evidence states, priority, next action, monitoring indicator and review time without a total talent score; authenticated versioned synthesis remains pending backend activation.**
- [ ] **GT-013 — IN PROGRESS — D5 Golden Path module, Evidence/Path Experiment structure and human-reviewed professional-report preview are implemented; production workflow remains pending.**
- [ ] **GT-014 — IN PROGRESS — Free entry, routed Deep Module, Golden Path Professional and BAHAR Continuity product tiers/entitlements are designed; live pricing, payment and fulfilment remain pending.**
- [ ] **GT-015 — IN PROGRESS — RCAS Core, D1–D6 scope and E1–E10 evidence-task architecture are integrated from the Golden Talent toolkit; full workbook/platform integration remains ongoing.**
- [x] **GT-016 — DONE — Private/noindex parent and teacher resource hubs are built around Support Ecology, autonomy-support, help-seeking, descriptive RCAS-O1 observation, teacher feedback/error literacy and role-access boundaries. Production authentication remains tracked separately under Portal/Security.**
- [ ] **GT-017 — IN PROGRESS — Free → routed module → professional synthesis → BAHAR funnel is implemented without fake urgency/pricing; real paid conversion remains pending secure payment/backend.**
- [ ] **GT-018 — IN PROGRESS — BAHAR longitudinal-growth workspace and persistence schema cover Baseline Snapshot, Eight-Week Compass, weekly cycles, learning evidence and periodic review; authenticated persistence remains pending.**
- [ ] **GT-019 — IN PROGRESS — Private R-source academic history, grade and verified-document workspace is implemented and mapped to existing educational_record, grade_record and private_document architecture; secure ingestion/upload remains pending private storage, malware scan, retention and access-control infrastructure.**
- [ ] **GT-020 — IN PROGRESS — Country-agnostic longitudinal development foundation now covers comparable progress measurements, versioned study plans/tasks, saved pathway options, decision history and explainable decision-support records. Real trajectories remain disabled until authenticated comparable observations exist.**
- [ ] **GT-021 — IN PROGRESS — Adaptive planning and trajectory governance is executable: plan changes remain proposed/reviewed versions, a single observation cannot become a trend, cross-measure synthetic progress scores are prohibited, and consequential recommendations preserve uncertainty/counterevidence with human review.**

---

# 9. Accounts, portals and identity

- [x] **PORTAL-001 — DONE — Student portal public landing page.**
- [x] **PORTAL-002 — DONE — Static student login/register UX shells with data submission disabled.**
- [x] **PORTAL-003 — DONE — Reserved student/parent/teacher/app routes as noindex foundations.**
- [x] **PORTAL-004 — MODIFIED/FROZEN — Role architecture now includes Student, Parent, Teacher, Consultant/Counsellor, Researcher, Consultation Client, Institution, Editor, Admin and Super Admin. Role labels never grant record access by themselves; relationship/purpose/capability and server authorisation remain mandatory.**
- [x] **PORTAL-005 — FROZEN — One account may hold multiple roles.**
- [ ] **PORTAL-006 — IN PROGRESS — Email-only registration, verification, login and session APIs and browser wiring are implemented; phone remains optional contact-only. Public register/email/verify/login certification awaits CA-trusted TLS and controlled delivery checks.**
- [ ] **PORTAL-007 — IN PROGRESS — Email-only recovery/reset endpoints, single-use tokens and session revocation are implemented; public recovery delivery and end-to-end certification remain pending.**
- [ ] **PORTAL-008 — IN PROGRESS — Persian student dashboard and its evidence, records, context, appointments, Golden Path, BAHAR and D1–D6 workspaces share a unified international-grade NOINDEX application shell; the international dashboard now has matching appointment-navigation/workspace parity. Production auth/data integration remains pending.**
- [ ] **PORTAL-009 — IN PROGRESS — Persian parent dashboard, resources, My Path and shared RCAS-O1 observation surface now share a unified role-scoped application shell; the verified parent-child relationship model is implemented and production linkage remains pending.**
- [ ] **PORTAL-010 — IN PROGRESS — Persian teacher dashboard, resources, My Path and shared RCAS-O1 observation surface now share a unified role-scoped application shell; the scoped teacher-student assignment model is implemented and production assignment workflows remain pending.**
- [ ] **PORTAL-011 — IN PROGRESS — Persian consultant dashboard, My Path and case workspace now share a unified role-scoped operations shell reflecting triage, assigned cases, notes, review and follow-up; backend integration remains pending.**
- [ ] **PORTAL-012 — IN PROGRESS — Privacy-request schema supports access, correction, export, deletion, restriction and consent withdrawal; authenticated user workflow remains pending.**
- [ ] **PORTAL-013 — IN PROGRESS — Private-document metadata, malware-scan state and scoped access-grant schema are implemented; secure object storage and upload service remain pending.**

---

# 10. Assessment and report engine

- [x] **ASSESS-001 — FROZEN — Assessment model: Assessment → Version → Dimensions → Items → Responses → Scoring → Interpretation → Report.**
- [x] **ASSESS-002 — FROZEN — Historical results never silently change under a new scoring model.**
- [x] **ASSESS-003 — FROZEN — Autosave/resume/progress UX is required.**
- [x] **ASSESS-004 — FROZEN — QTI-aware future portability.**
- [ ] **ASSESS-005 — IN PROGRESS — Assessment authoring/admin tools.**
- [ ] **ASSESS-006 — IN PROGRESS — Item bank with version control.**
- [ ] **ASSESS-007 — IN PROGRESS — Scoring engine.**
- [ ] **ASSESS-008 — IN PROGRESS — Interpretation-rule engine.**
- [ ] **ASSESS-009 — IN PROGRESS — Report template engine.**
- [ ] **ASSESS-010 — IN PROGRESS — PDF/web reports.**
- [ ] **ASSESS-011 — IN PROGRESS — Multi-respondent linking: student/parent/teacher.**
- [ ] **ASSESS-012 — IN PROGRESS — Norm/reference metadata where scientifically justified.**
- [ ] **ASSESS-013 — IN PROGRESS — Human review and override with audit trail.**

---

# 11. Commerce, store and payment

- [x] **COM-001 — DONE — Shop namespace reserved as noindex foundation.**
- [x] **COM-002 — FROZEN — One commerce identity for books, eBooks, workbooks, tests, reports, consultations, courses and toolkits.**
- [x] **COM-003 — FROZEN — Product/Offer schema only when a genuine purchasable product with verified price and availability exists.**
- [x] **COM-004 — DONE — Bilingual book-storefront/category architecture is implemented under /fa/shop/ and /en/shop/; current public storefronts are indexable, while cart, checkout and payment routes remain private/noindex/no-store. Monetary checkout remains fail-closed.**
- [ ] **COM-005 — IN PROGRESS — Provider-neutral product/price/order/payment/entitlement schema is implemented; storefront/admin workflows and real offers remain pending.**
- [ ] **COM-006 — IN PROGRESS — Bilingual browser cart shell is implemented as convenience state; production order creation and all pricing remain server-authoritative.**
- [ ] **COM-007 — IN PROGRESS — Bilingual checkout shells and book-only PHP/MySQL order capture are implemented. Recorded transactional dry-run validated server-priced INSERT followed by rollback without starting payment; public monetary checkout remains fail-closed.**
- [ ] **COM-008 — IN PROGRESS — Order and invoice records.**
- [ ] **COM-009 — IN PROGRESS — BitPay is the selected domestic gateway; existing policy records its sandbox baseline. Public monetary checkout remains disabled pending trusted TLS, private Bertina credential/configuration review and separate controlled activation. International provider activation remains deferred.**
- [ ] **COM-010 — IN PROGRESS — Bertina PHP server-side callback/status and receipt contracts are implemented; controlled production callback, receipt, reconciliation and settlement certification remain pending.**
- [ ] **COM-011 — IN PROGRESS — Refund/cancellation policy.**
- [ ] **COM-012 — IN PROGRESS — Coupons/discount rules only if commercially useful.**
- [ ] **COM-013 — IN PROGRESS — Digital delivery and entitlement management.**
- [ ] **COM-014 — IN PROGRESS — Book inventory, shipping-address, shipment and digital-delivery persistence plus fulfilment rules are implemented; real stock, carrier/shipping coverage and storage assets remain pending.**
- [ ] **COM-015 — IN PROGRESS — Consultation payment connected to booking.**
- [ ] **COM-016 — IN PROGRESS — School/institution invoice workflow.**
- [ ] **COM-017 — FROZEN — Card/banking credentials are never stored by the site.**

---

# 12. CRM, booking and communication

- [ ] **CRM-001 — IN PROGRESS — Public AI assistant retains the bilingual local guidance fallback. Consent-based lead capture and live AI are disabled until a Bertina-hosted server-side persistence/runtime is implemented and verified.**
- [ ] **CRM-002 — IN PROGRESS — Consultation pipeline, state model, noindex intake gateway and API contract are defined; production workflow awaits backend, booking and payment services.**
- [ ] **CRM-003 — IN PROGRESS — Bertina SMTP transport and account/order message source are implemented; recorded release health reports configuration readiness. Controlled verification/recovery delivery, monitored reply handling and final transactional templates remain pending.**
- [ ] **CRM-004 — IN PROGRESS — Appointment reminders and rescheduling.**
- [ ] **CRM-005 — IN PROGRESS — Secure client messaging distinct from general support.**
- [ ] **CRM-006 — IN PROGRESS — Notification preferences.**
- [ ] **CRM-007 — IN PROGRESS — Consent-aware newsletter only after explicit opt-in.**
- [ ] **CRM-008 — IN PROGRESS — Reviewer/editorial recruitment pipeline for JHELA kept separate from consulting CRM roles.**

---

# 13. CMS and administration

- [ ] **ADMIN-001 — IN PROGRESS — Private bilingual admin-console information architecture and visual operations console now cover content/SEO, assessment, commerce, consultation, assistant leads, identity/consent and security activation gates without exposing real data; provider-backed CMS editing/persistence remains pending.**
- [ ] **ADMIN-002 — IN PROGRESS — Draft/review/publish workflow.**
- [ ] **ADMIN-003 — IN PROGRESS — SEO fields: title, description, slug, canonical, hreflang, index state, OG, schema, dates, author/reviewer.**
- [ ] **ADMIN-004 — IN PROGRESS — Bertina Apache `.htaccess` provides the version-controlled registry for confirmed legacy migrations, and CI validates required permanent redirects; a future CMS/admin UI for redirect creation and review remains pending.**
- [ ] **ADMIN-005 — IN PROGRESS — User/role management.**
- [ ] **ADMIN-006 — IN PROGRESS — Bilingual private assessment-management architecture now covers instrument version lifecycle, item-bank governance, declared scoring/interpretation rules, multi-source evidence provenance and human-approved report supersession. Live editing and persistence remain pending authenticated backend.**
- [ ] **ADMIN-007 — IN PROGRESS — Order/payment/reconciliation administration is represented in the private admin console and commerce contracts; live operations await backend and gateway.**
- [ ] **ADMIN-008 — IN PROGRESS — Consultation/triage/appointment administration is represented in the private admin console and domain contracts; live operations await backend/calendar activation.**
- [ ] **ADMIN-009 — IN PROGRESS — Audit log for sensitive administrative changes.**
- [ ] **ADMIN-010 — IN PROGRESS — Content revision history.**

---

# 14. Research-ready data foundation

- [x] **DATA-001 — DONE — Research-Ready Data Contract v1.**
- [x] **DATA-002 — FROZEN — Operational data is not automatically a research dataset.**
- [x] **DATA-003 — FROZEN — Raw responses immutable; corrections append events.**
- [x] **DATA-004 — FROZEN — Identity separated from pseudonymous research identifiers.**
- [x] **DATA-005 — FROZEN — Service/privacy/research/publication consents are distinct.**
- [x] **DATA-006 — FROZEN — Instrument/scoring/interpretation/report versions retained.**
- [ ] **DATA-007 — IN PROGRESS — Research study registry, study versions and pseudonymous case IDs are defined in the production schema; application/admin workflows remain pending.**
- [ ] **DATA-008 — IN PROGRESS — De-identification runs, transformation logging and separated identity-link tables are defined; executable transformation pipeline remains pending.**
- [ ] **DATA-009 — IN PROGRESS — Dataset freeze, codebook version and export entities are defined; materialised research mart generation remains pending.**
- [ ] **DATA-010 — IN PROGRESS — SPSS-ready export + codebook.**
- [ ] **DATA-011 — IN PROGRESS — R/Python/CSV/XLSX exports.**
- [ ] **DATA-012 — IN PROGRESS — MAXQDA/NVivo-ready qualitative export package.**
- [ ] **DATA-013 — IN PROGRESS — Research-data access approvals and audit trail.**
- [ ] **DATA-014 — IN PROGRESS — Retention/deletion rules that distinguish operational from research obligations.**

---

# 15. Rezazadeh Foundation Press

- [x] **PRESS-001 — FROZEN — Publisher identity: Rezazadeh Foundation Press.**
- [x] **PRESS-002 — DONE — Public publisher page.**
- [x] **PRESS-003 — FROZEN — Independent publisher; no university or society ownership is claimed without a formal agreement.**
- [x] **PRESS-004 — FROZEN — “Foundation” is a brand/publishing identity only unless legal foundation status is actually established.**
- [ ] **PRESS-005 — WAITING — Real publishable postal address.**
- [ ] **PRESS-006 — WAITING — Permanent main domain.**
- [ ] **PRESS-007 — PLANNED — Dedicated publisher-domain email.**
- [ ] **PRESS-008 — IN PROGRESS — Publisher imprint/copyright/licensing policy.**
- [ ] **PRESS-009 — IN PROGRESS — Book metadata/ISBN workflow where applicable.**
- [ ] **PRESS-010 — IN PROGRESS — Long-term preservation policy for publisher content.**
- [ ] **PRESS-011 — IN PROGRESS — Rights, permissions and takedown policy.**

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
- [ ] **JRN-025 — IN PROGRESS — DOI landing-page and metadata workflow for every published article.**
- [ ] **JRN-026 — IN PROGRESS — Preservation: PKP PN/Internet Archive and/or another appropriate long-term archive.**
- [ ] **JRN-027 — IN PROGRESS — JATS XML or equivalently robust machine-readable article metadata.**
- [ ] **JRN-028 — IN PROGRESS — ORCID integration where technically available.**
- [ ] **JRN-029 — IN PROGRESS — Plagiarism/similarity workflow where lawfully and financially available.**

## 16.4 Editorial board and review
- [ ] **JRN-030 — IN PROGRESS — Recruit a genuinely international editorial board.**
- [ ] **JRN-031 — IN PROGRESS — Recruit reviewer pool by subject and method.**
- [ ] **JRN-032 — FROZEN — No person is publicly listed without explicit acceptance.**
- [ ] **JRN-033 — PLANNED — At least five appropriately qualified editors before DOAJ application; avoid one-institution concentration.**
- [ ] **JRN-034 — FROZEN — Research articles ordinarily receive at least two independent reviewers.**
- [ ] **JRN-035 — FROZEN — Editor/board conflicts require independent handling editor.**
- [ ] **JRN-036 — IN PROGRESS — Reviewer performance/turnaround/quality monitoring.**

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
- [ ] **JRN-049 — IN PROGRESS — Annual journal audit: endogeny, author geography, board diversity, review times, corrections, metadata, preservation and accessibility.**

---

# 17. Security, privacy and governance

- [x] **SEC-001 — FROZEN — Private data is never placed in public static assets.**
- [x] **SEC-002 — FROZEN — OWASP ASVS Level 2 is the production target.**
- [x] **SEC-003 — FROZEN — Least privilege and role-based access.**
- [ ] **SEC-004 — IN PROGRESS — Admin MFA.**
- [ ] **SEC-005 — IN PROGRESS — Bertina PHP password hashing, pepper requirement, hashed sessions and recovery revocation are implemented. Recorded auth-health readiness does not certify public authentication or actual password hashing/delivery end to end.**
- [ ] **SEC-006 — IN PROGRESS — Encrypted transport and secure secrets management.**
- [ ] **SEC-007 — IN PROGRESS — File malware/type/size validation and private storage.**
- [ ] **SEC-008 — IN PROGRESS — Audit logs for administrative and sensitive-user actions.**
- [ ] **SEC-009 — IN PROGRESS — Bilingual NOINDEX privacy/data-use notices, consultation policy, consent model, RBAC matrix and parent-child relationship rules are in place; jurisdiction-specific legal review remains pending.**
- [ ] **SEC-010 — IN PROGRESS — Data retention, deletion and export processes.**
- [ ] **SEC-011 — IN PROGRESS — Backup/restore tests and disaster-recovery plan.**
- [ ] **SEC-012 — IN PROGRESS — Incident response and vulnerability reporting.**

---

# 18. Analytics, observability and quality

- [ ] **OBS-001 — WAITING — Analytics on permanent domain with privacy-aware configuration.**
- [ ] **OBS-002 — WAITING — Search Console and sitemap monitoring.**
- [ ] **OBS-003 — IN PROGRESS — Error logging and uptime monitoring.**
- [ ] **OBS-004 — IN PROGRESS — Performance monitoring and Core Web Vitals.**
- [ ] **OBS-005 — IN PROGRESS — Conversion events: consultation request, booking, checkout, assessment start/complete, report purchase.**
- [ ] **OBS-006 — IN PROGRESS — Content-metric architecture now covers impressions, CTR, organic landing pages, assisted conversion and content-decay review in the private admin console; provider-backed collection remains pending.**
- [ ] **OBS-007 — IN PROGRESS — Journal operational metrics without vanity or fake impact claims.**
- [ ] **OBS-008 — IN PROGRESS — Monthly technical QA, 90–180 day content review and quarterly strategic review cadences are represented in the bilingual admin console; automated scheduling and evidence capture remain pending production observability.**

---

# 19. Monetisation architecture

The revenue model is diversified so no single product has to carry the ecosystem.

- [ ] **REV-001 — IN PROGRESS — One-to-one consultation now has bilingual public discovery, minimal safe intake, triage/booking contracts and account appointment workspaces; live calendar, authenticated persistence and provider-backed payment remain pending.**
- [ ] **REV-002 — PLANNED — Field-selection packages.**
- [ ] **REV-003 — PLANNED — Entrance-exam planning/follow-up packages.**
- [ ] **REV-004 — PLANNED — Paid assessments and reports.**
- [ ] **REV-005 — PLANNED — Integrated Golden Talent Profile.**
- [ ] **REV-006 — PLANNED — Human-reviewed Golden Path report.**
- [ ] **REV-007 — PLANNED — Print books.**
- [ ] **REV-008 — PLANNED — eBooks/workbooks/toolkits.**
- [ ] **REV-009 — PLANNED — Courses/webinars where substantive value exists.**
- [ ] **REV-010 — IN PROGRESS — Institutional consulting is now represented in the public audience architecture, bilingual service routing, institutional-consulting policy and invitation/contact pathways; live contracting, billing and institution-role runtime remain pending.**
- [ ] **REV-011 — PLANNED — Teacher resources/observation tools.**
- [ ] **REV-012 — PLANNED — Journal APC only if later adopted transparently; never linked to acceptance and never charged at submission in the founding model.**
- [x] **REV-013 — FROZEN — No manipulative scarcity, false guarantees or pay-for-acceptance logic.**
- [ ] **REV-014 — IN PROGRESS — Academic and researcher services now have bilingual public service architecture covering academic English editing, manuscript diagnostic review, research/publication consultation, reviewer-response support and academic career/interview consultation. Scope is agreed before confidential material transfer; pricing/payment remain pending verified operations.**
- [ ] **REV-015 — IN PROGRESS — Recurring coaching foundation now includes programme/enrolment/review persistence, adaptive planning governance and human-review rules for monthly coaching, quarterly review, annual development and premium long-term support. Real programme definitions, fulfilment capacity, pricing and runtime remain pending.**
- [ ] **REV-016 — IN PROGRESS — Speaking, workshop, teacher-training and invitation conversion pathways are implemented publicly with explicit scope-first enquiry and no premature contractual/payment claims.**

---

# 19.1 Master Website Evolution alignment

- [x] **ARCH-001 — FROZEN — Master Website Evolution north star: Authority + Education + Intelligence + Revenue Ecosystem.**
- [x] **ARCH-002 — FROZEN — Three moat model: Brand, Product & Data, Discovery.**
- [x] **ARCH-003 — FROZEN — Golden Talent positioning: Educational Development & Decision Intelligence Platform; country-agnostic core with jurisdiction adapters.**
- [x] **ARCH-004 — FROZEN — AI principle: AI-assisted + evidence-based + human-supervised; no decorative AI feature justified by marketing alone.**
- [x] **ARCH-005 — FROZEN — Product filter: authority, revenue/conversion, accumulated user value, long-term moat, material UX and professional/scientific fit.**
- [ ] **ARCH-006 — IN PROGRESS — Master vision gap analysis and priority matrix are documented in foundation/MASTER-WEBSITE-EVOLUTION-ALIGNMENT-v1.md and machine-readable platform/master-vision-architecture.json. The first P0 execution tranche is active: four-audience gates, academic/researcher services, broader secure intake, invitation/institution pathways and longitudinal dashboard/data foundations were added without rebuilding healthy foundations.**

---

# 20. Phased delivery roadmap

## Foundation state-reconciliation rule

The prose roadmap and `foundation/ROADMAP-STATUS.json` describe the same programme at different levels. When an executable schema, policy, domain engine, migration, regression guard or API contract exists but provider-backed production execution is still pending, the roadmap status is **IN PROGRESS**, not **PLANNED** and not **DONE**. Production readiness remains governed by the release definition of done below. This rule prevents architecture work from being lost while also preventing prototypes/contracts from being misrepresented as live services.



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

- [ ] Verify Bertina permanent-domain TLS and redirects.
- [ ] Preserve completed canonical/schema/sitemap migration and certify production behavior.
- [ ] Configure Search Console/Bing.
- [ ] Finish global design-system consistency and mobile QA.
- [ ] Self-host fonts.
- [ ] Build books hub.
- [ ] Expand high-intent Persian service/knowledge clusters.
- [ ] Add safe consultation intake and booking architecture.
- [ ] Certify existing Bertina domain-email verification/recovery delivery.

## Phase 2 — Revenue MVP and account platform
**Exit condition:** user can register securely, book/pay lawfully, receive a service/product and see a private record.

- [ ] Certify existing Bertina auth/MySQL and implement remaining private operational bindings.
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
