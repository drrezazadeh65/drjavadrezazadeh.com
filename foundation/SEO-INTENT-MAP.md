# SEO INTENT & CANONICAL MAP — v1.0

**Project:** Dr. Javad Rezazadeh Yazdeli Digital Education & Research Ecosystem  
**Date:** 2026-10-05  
**Rule:** SEO before build → SEO during build → SEO release gate.  
**Important:** This document maps intent and canonical ownership. It does **not** claim search volume, ranking difficulty or traffic that has not been measured.

---

## 1. Canonical ownership rules

1. One primary search intent belongs to one canonical public page.
2. A page may support secondary semantic terms, but it must not compete with another page for the same central intent.
3. English lives at root; Persian lives under `/fa/`.
4. Hreflang is used only for genuine equivalents.
5. Services, editorial articles, scholarly identity, products and private app routes are separate content types.
6. Transactional pages do not masquerade as informational articles; articles should link users to relevant services without becoming doorway pages.
7. Product/Offer schema is prohibited until a real purchasable offer exists with verified price/availability.
8. Private/auth/account/order/report pages remain noindex and are not SEO landing pages.
9. Journal submission/issue infrastructure remains noindex until JHELA is launch-ready.
10. Confidential pre-publication research projects have no public SEO ownership until explicit release.

---

# 2. English identity & authority cluster

| Canonical URL | Primary intent | Secondary semantic territory | Page role | Index state |
|---|---|---|---|---|
| `/` | Dr. Javad Rezazadeh Yazdeli | educator, researcher, author, consultant, Applied Linguistics | Entity/home | INDEX |
| `/about/` | Javad Rezazadeh Yazdeli biography / academic profile | education, professional background, academic identity | Authority | INDEX |
| `/teaching/` | Javad Rezazadeh Yazdeli university teaching | Applied Linguistics teaching, ELT, assessment, ESP/EAP | Authority | INDEX |
| `/research/` | Javad Rezazadeh Yazdeli research | Applied Linguistics, language education, materials, assessment | Authority | INDEX |
| `/publications/` | Javad Rezazadeh Yazdeli publications | DOI, papers, scholarly record | Authority | INDEX |
| `/books/` | Javad Rezazadeh Yazdeli books | educational books, poetry, Golden Talent | Authority/bibliographic | INDEX |
| `/academic-engagements/` | Javad Rezazadeh Yazdeli conferences and academic engagements | presentations, reviewer, conference service, professional development | Authority | INDEX |
| `/educational-philosophy/` | educational philosophy of Javad Rezazadeh Yazdeli | human development, learning, talent, counselling | Thought leadership | INDEX |

### Cannibalisation rule
The homepage owns the **person/entity** query. About owns **biographical/profile** intent. Teaching, Research, Publications, Books and Academic Engagements own their respective evidence domains. They should link to one another but not repeat full sections.

---

# 3. Persian identity & authority cluster

| Canonical URL | Primary intent | Secondary semantic territory | Page role | Index state |
|---|---|---|---|---|
| `/fa/` | دکتر جواد رضازاده یزدلی | مدرس دانشگاه، پژوهشگر، مشاور آموزشی | Entity/home | INDEX |
| `/fa/darbare-man/` | درباره دکتر جواد رضازاده | رزومه، سوابق علمی و حرفه‌ای | Authority | INDEX |
| `/fa/tadris/` | تدریس دانشگاهی دکتر رضازاده | زبان‌شناسی کاربردی، آموزش زبان، سنجش، ESP | Authority | INDEX |
| `/fa/ketab-ha/` | کتاب‌های دکتر جواد رضازاده | شعر، کشف مسیر طلایی استعداد، آثار در دست انتشار | Authority/bibliographic | INDEX |
| `/fa/faaliat-haye-elmi/` | فعالیت‌های علمی دکتر رضازاده | همایش، ارائه، داوری، توسعه حرفه‌ای | Authority | INDEX |
| `/fa/falsafe-amoozeshi/` | فلسفه آموزشی دکتر رضازاده | تربیت، یادگیری، استعداد، تصمیم | Thought leadership | INDEX |

---

# 4. Persian commercial/service cluster

## 4.1 Core service hubs

| Canonical URL | Primary search intent | Secondary intents | Funnel | Schema | State |
|---|---|---|---|---|---|
| `/fa/moshavere-tahsili/` | مشاوره تحصیلی | تحلیل کارنامه، مشاوره والدین، تصمیم آموزشی | Commercial / service | Service + FAQ | INDEX |
| `/fa/entekhab-reshteh/` | مشاوره انتخاب رشته | انتخاب رشته دانشگاه، تصمیم رشته، تحلیل گزینه‌ها | Commercial / service | Service | INDEX |
| `/fa/moshavere-konkur/` | مشاوره کنکور | برنامه‌ریزی کنکور، پایش عملکرد، مدیریت فشار | Commercial / service | Service | INDEX |
| `/fa/estedaadyabi/` | استعدادیابی تحصیلی | کشف استعداد، شناخت توانمندی، مسیر رشد | Commercial / service | Service | INDEX |

### Service cannibalisation rules
- `/fa/moshavere-tahsili/` owns the broad **مشاوره تحصیلی** intent.
- `/fa/entekhab-reshteh/` owns **انتخاب رشته**. It should not try to rank as the main broad counselling page.
- `/fa/moshavere-konkur/` owns **مشاوره کنکور / برنامه‌ریزی کنکور**.
- `/fa/estedaadyabi/` owns **استعدادیابی**.
- “هدایت تحصیلی” can become a separate page only after SERP/intent review proves it is sufficiently distinct from counselling/field selection.
- City-location pages are prohibited unless there is genuinely localised service content and real local intent; no doorway pages.

## 4.2 Planned commercial extensions

| Proposed URL | Intent owner | State | Release condition |
|---|---|---|---|
| `/fa/moshavere-valedin/` | مشاوره والدین | PLANNED | enough unique substantive content + real service workflow |
| `/fa/moshavere-madares/` | مشاوره مدارس / institutions | PLANNED | institutional offer defined |
| `/fa/tahlil-karnameh/` | تحلیل کارنامه | PLANNED | only if intent is proven distinct from broad counselling |
| `/fa/rezerv-moshavere/` | رزرو مشاوره | PRIVATE/TRANSACTIONAL | backend + booking ready; NOINDEX |

---

# 5. Golden Talent topical cluster

| URL | Primary intent | Role | State |
|---|---|---|---|
| `/fa/golden-talent/` | Golden Talent / مسیر طلایی استعداد | Public framework hub | INDEX |
| `/fa/estedaadyabi/` | استعدادیابی علمی | Public service entry | INDEX |
| `/fa/falsafe-amoozeshi/` | فلسفه آموزشی | Thought-leadership foundation | INDEX |
| future `/fa/golden-talent/for-parents/` | استعدادیابی برای والدین | Educational resource | PLANNED |
| future `/fa/golden-talent/for-teachers/` | مشاهده و شناخت استعداد برای معلمان | Educational resource | PLANNED |
| future `/fa/golden-talent/free-screening/` | غربالگری رایگان استعداد | Acquisition / assessment | PLANNED |
| future `/app/assessments/` | private assessment session | Product/app | PRIVATE / NOINDEX |
| future `/app/reports/` | private reports | Product/app | PRIVATE / NOINDEX |

### Golden Talent rule
Informational resources explain limitations and development. Assessment/private-report pages never become search landing pages containing personal results.

---

# 6. Editorial / knowledge cluster

| Canonical URL | Primary intent | Relationship to service | State |
|---|---|---|---|
| `/fa/akhbar/` | اخبار و یادداشت‌های آموزشی دکتر رضازاده | Collection | INDEX |
| `/fa/akhbar/moshavere-tahsili-baraye-tasmim/` | مشاوره تحصیلی برای تصمیم‌گیری | Educational/article intent | INDEX |
| `/fa/akhbar/entekhab-reshteh-1405/` | انتخاب رشته ۱۴۰۵ | Year-sensitive guide | INDEX |
| `/fa/akhbar/farakhvan-jhela/` | فراخوان همکاری علمی JHELA | Journal recruitment | INDEX |

### Planned evergreen clusters
**Counselling:** how to choose a counsellor; when counselling helps; evidence needed for a decision; parent role; reading report cards.  
**Field selection:** comparing fields; possible vs suitable; official information; family influence; uncertainty.  
**Entrance exam:** realistic planning; revision; study evidence; managing overload; post-exam decision.  
**Talent:** talent vs interest vs skill; multi-source evidence; limitations of tests; growth and opportunity; parent/teacher observation.  
**Teacher/parent education:** educational judgement, feedback, observation, communication.

No page is created solely to target a keyword variant if the underlying intent is already satisfied elsewhere.

---

# 7. Commerce and product SEO

## Current
- `/shop/` and `/fa/shop/` are foundation routes and remain **NOINDEX**.

## Future indexable product taxonomy
Only real products become public:
- books
- eBooks
- workbooks
- assessment packages
- reports
- consultation packages
- courses / webinars
- digital toolkits

### Product SEO rules
1. Unique product value proposition and substantive description.
2. Verified price, currency, availability and refund/delivery rules.
3. Product/Offer schema only when transaction is actually possible.
4. Digital products have explicit licence/access terms.
5. Book pages distinguish bibliographic identity from shop offer.
6. Cart, checkout, account, orders and payment callbacks are NOINDEX.
7. No “fake shop” page should be indexed before real inventory exists.

---

# 8. Journal & publisher SEO map

| URL | Search intent | State |
|---|---|---|
| `/publisher/` | Rezazadeh Foundation Press | INDEX |
| `/journal/` | JHELA journal | NOINDEX until production launch |
| `/journal/call-for-reviewers/` | JHELA reviewer call | INDEX |
| `/journal/founding-collaborators/` | JHELA editorial collaboration | INDEX |
| `/fa/akhbar/farakhvan-jhela/` | Persian JHELA collaboration call | INDEX |
| future permanent `journal.drjavadrezazadeh.com` | JHELA entity + articles | WAITING |

### Journal launch rule
When production JHELA launches on the permanent subdomain, temporary journal routes must be migrated with a deliberate canonical/redirect plan. Article landing pages must be stable and DOI-compatible. No indexing/indexing-status claim is published before it is true.

---

# 9. Private/platform namespaces — never SEO landing pages

The following are private or transactional and remain NOINDEX:
- `/app/`
- `/login/`
- `/register/`
- `/student/`
- `/parent/`
- `/teacher/`
- `/assessments/`
- `/research-lab/`
- future cart / checkout / account / orders / reports / messages / settings

**Security rule:** noindex is not security. Production privacy requires real authentication/authorization.

---

# 10. Internal linking rules

1. Every service page links to its relevant educational article and vice versa.
2. Every talent-related page links to the educational philosophy and Golden Talent hub when public.
3. Every authority page links back to About and at least one adjacent evidence domain.
4. Publications/Research/Teaching/Academic Engagements form one academic-authority mesh.
5. Books links to Publisher only as an imprint/publishing identity, not as a false product offer.
6. JHELA recruitment pages link to publisher transparency and journal policy pages.
7. Homepage links only to high-level hubs; it should not become a directory of every deep route.
8. Anchor text describes destination meaning; avoid repeated exact-match keyword stuffing.

---

# 11. SEO release checklist per URL

Before INDEX:
- [ ] intent owner confirmed
- [ ] no canonical conflict
- [ ] language and hreflang correct
- [ ] unique title and meta description
- [ ] one H1
- [ ] substantive body copy
- [ ] internal links in/out
- [ ] appropriate schema
- [ ] OG/social image
- [ ] image dimensions/alt
- [ ] mobile usability
- [ ] accessibility basics
- [ ] performance budget
- [ ] robots index state
- [ ] sitemap inclusion
- [ ] factual verification
- [ ] no confidential project leakage

---

# 12. Measurement — after permanent-domain launch

Do not invent search volume. Measure:
- Search Console impressions
- clicks
- CTR
- average position as directional data
- indexed canonical URLs
- query/page overlap to detect cannibalisation
- conversion events by organic landing page
- consultation starts/completions
- product views/purchases
- assessment starts/completions
- content decay and update needs

The first optimisation loop begins only after reliable first-party performance data exists.
