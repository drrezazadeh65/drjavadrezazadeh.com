# JR Konkur — Mock scorecards, 1405/1406 rules and one-week pilot

**Evidence cut-off:** 2026-10-20  
**Architecture:** reuse `drjavad1_store` + existing authenticated learner and consent identities, Choice Studio, 003e source-reviewed admission catalogue.  
**Status:** source research and proposed schema, **not** a live statistical admission prediction service. No scraped student scorecards or actual student identifiers retained.

## 1. Product distinction — two contexts (do not merge)

**A. Official admission-cycle workspace:** Candidate enters the **actual Sanjesh application scorecard**, with cycle, group, quota and region, eligibility status, official group-specific composite or normalized scores, rank in quota and country, and official programme choices. Only verified current-cycle conditions may be called official eligibility. Submission remains on the Sanjesh portal, never simulated as a completed registration.

**B. Academic-year mock-exam laboratory:** For 1405–1406 students preparing for future admission, enter per-event provider name, exam date, grade, group, mock scores, rank, percentages and subject performance. Present longitudinal, source-labelled descriptive trends *within identical provider, group and scale only*. This is not a national admission outcome or a conversion to official percentile/rank.

2026-10-20 is after the main 1405 election/registration window reported for 13–16 Mehr (and reported extensions). A late-October launch must be labelled **practice, preparation and planning for prospective 1406**, not active 1405 official admission registration. Official 1405 source catalogue may support **historical exploration** but must not be promoted to 1406 requirements until 1406 guides are available.

## 2. Current official rules: effective date and category matter

- The 1405-06-10 (10 Shahrivar 1405) *amending* resolution describes **11th-grade school final record with positive effect, 12th-grade with definite effect**, and **60% educational-history contribution for high-demand programmes**. This supersedes contradictory older announcement language. Source [Tasnim report reproducing the new resolution](https://www.tasnimnews.ir/fa/news/1405/06/10/3685807/).
- Registration guidance for 1405 separately distinguishes **main groups** (Math, Experimental, Humanities) from **Arts / Foreign Languages**, and describes 40% exam vs 60% school history for the first three and 70% exam vs 30% history for Arts/Languages. **Do not infer that a headline saying 60% applies unchanged to every group/track.** These figures must be reconciled with the latest signed official guidance and any later amendments before enabling a rule. [1405 Sanjesh registration-guide excerpt](https://www.scribd.com/document/1067455589/NOTESar1405-v1); [historical initial guidance, potentially superseded](https://www.tasnimnews.ir/fa/news/1404/10/25/3494529/).
- The standardized national history score is not a raw arithmetic mean: raw final-course grades are normalized/weighted under separate educational regulations. Official `overall_score`, `specialized_test_standard_score`, `educational_record_standard_score`, `rank_in_quota`, and `national_rank` are distinct source-labelled values. Do not substitute a provider TAZ or derive Sanjesh outcome from a mock-exam TAZ.
- A 1405 notice for **records-only selection** specifies **150 available choices** for that scope and dates 13–16 Mehr 1405. This must never be carried into 1406 or other admission tracks by default. [Quoted Sanjesh notice](https://snn.ir/fa/news/1465699/) (also [indexed proxy](https://2.zoppoz.workers.dev/https/snn.ir/fa/news/1465699/)).

### Critical resolution strategy
`eco_exam_component_policies` stores each **cycle + group + track + component + revision + effect kind + proportion + official page** as a DRAFT unless source-reviewed. When a new resolution is published, create a new dated revision, not an UPDATE of the prior published policy. Positively affected grade 11 must not be simplistically aggregated via `0.6*GPA`.

## 3. Scorecard providers and observed field families

| Source | Observed/reported scorecard types and fields | What is NOT verified |
|---|---|---|
| Sanjesh 1405 and previous published official registration/selection guides | National: overall normalized score, specialized-exam score, educational-record score, rank-in-quota, national rank, group, quota/region, selection eligibility, academic records and route | Current official 1406 formula and active programme-location inventory; individual allocation logic from unpublished applicant preferences |
| Kanoon / Ghalamchi mock examinations | Per subject `percent`, `taz`, `rank`, general `mean_taz`, "چند از ۱۰", trends and early/project performance reports; sometimes provider results are incomplete immediately after an exam | Exchange rate from Kanoon TAZ to Sanjesh normalized score, representative national ranking or admissions probability |
| GAJ / Gajlive mock examinations | National and cumulative scorecards, per-subject percent/TAZ, rank by country/city/school/class, longitudinal trend, detailed question-level/essay report variants | Proprietary normalization, representativeness or verified equivalent-conversion model |
| Other mock providers (e.g. Gozineh 2) | **Provider/plugin slot exists**, but fields remain `UNVERIFIED_PROVIDER_SCHEMA` until a real redacted card is inspected with authorized usage | Any asserted metric layout or ability to compare between providers |

References for descriptive **template design only**: [Kanoon app/account features](https://www.kanoon.ir/Article/338572) and [Kanoon field descriptions](https://t.me/s/kanoonsalas/4234); [Gajlive official channel report-type breakdown](https://t.me/s/gaj_ir?before=14314). The [public, unofficial Kanoon example screenshot](https://moshaver.org/level-7000-ghalamchi/) demonstrates percent, TAZ, rank and trend columns; never import the pictured person's result into our database. For official scorecard field families cross-check Sanjesh original guide files and [2025 Sanjesh information bulletin](https://blog.taraz.org/wp-content/uploads/2025/08/vijeh-nameh-1404-01.pdf).

No automated account login or scraping of Kanoon/Gaj sites is authorized. Use **voluntary manual entry** first; a scorecard image-upload flow requires explicit owner and privacy approval after safe malware scanning, permission checks, minimization and deletion.

## 4. Shared database, versioning and privacy

1. Continue the **eight proposed** `003e` public source/catalogue tables and existing authenticated `eco_subjects`, `eco_consent_records`, `eco_advisor_assignments`, `eco_grade_records`, `eco_pathway_options`, `eco_education_decisions`. Do not fork the student-profile database.
2. Extend with proposed `003f` (nine tables): provider identities; provider-/cycle-specific scorecard schema versions; typed metric definitions with scale and comparison population; scheduled test events; private learner attempts; private per-metric observations; private versioned ordered candidate list; list choices; effective-dated official weighting policies.
3. `003f` has **no seeded student information**. Every private attempt/list must reference **existing subject, account and relevant consent**; the service must check the relation and active consent/guardian authorization *at each read, write and export*. A foreign key alone does **not** prove authorization.
4. Raw images and PDF uploads are **disabled in the pilot**. If implemented later, use `eco_object_refs` outside public directories with malware status, encryption, access controls, limited retention and review before derived fields can be trusted.
5. All private records need retention/deletion workflow, subject access requests, and auditable privacy settings; identifiers such as national ID, phone, birth date, full name, school and raw screenshot are not necessary in a basic mock-exam record.
6. A paid educational tool **is not consent for sale of a learner's data**. Separate optional analytical research consent from service access and commerce receipts. Collect no more than necessary; for minors obtain appropriate guardian authorization and make withdrawal/deletion understandable. No selling identified student data, no public benchmarking of small cohorts, no cross-provider ranking without validation.
7. Research cohorts and historical admission-result observation must be separate by sampling frame, group, quota, exam route, year and release of public statistical reports; prohibit training on raw child scorecards without an independent purpose/ethics review.

## 5. Launch plan for next week: truthful, valuable MVP

| Gate | Launch action | Minimum evidence |
|---|---|---|
| 0: this week | Existing Choice Studio 5-factor worksheet and source-gated 1405 catalogue remain preserved | Existing source tests, true published code; keep 1406 programmes "NOT_VERIFIED" |
| 1: practical trial | Add **in-memory manual mock scorecard entry**, per-event source/scale label, trend *within same provider only* and clear explanatory print report | Browser + keyboard/RTL and no-storage/no-network tests; no sensitive uploads |
| 2: account save | Implement authenticated + opt-in + guardian-aware storage using `003f`; run live preflight and owner-approved safe migration after tested backup | No student access leakage, CSRF, ownership, withdrawal and retention E2E |
| 3: payment | Wire a low-cost **existing commerce service** only after product/receipt delivery and cancellation/refund policy validation | Real payment authorization and activation receipt tests; do not gate free official admission information behind untested checkout |
| 4: verified 1405 data | Register all available 1405 source PDFs and amendments in `003e`; page-check every programme before offering eligibility | Human-reviewed page, OCR QA, source SHA-256 and rules, CI |
| 5: conditional 1406 intelligence | Publish official 1406 choices only after 1406 official guides/regulations are independently reviewed | Versioned eligibility, exact source page, amendment precedence |
| 6: future outlook | Longitudinal studies, statistical validation/calibration and appropriate ethically consented cohorts | Never output numerical admission probability without verified validation |

**Commercial positioning:** charge for useful saved-work features, personalized follow-up or authorized professional review if technically ready; **do not monetize student personal data itself**. Price should be set using costs, consent and revenue outcomes rather than presuming large volume alone.

## 6. Owner gates not yet completed

- 003e/003f actual Bertina migration not installed/verified; source commits and disposable MariaDB tests do not constitute host installation.
- Official 1406 guidebook/annual rules and statistical allocation data not confirmed.
- No authenticated read/write, secure guardian consent, retention/deletion E2E for 003f yet; **do not enable permanent private storage** until these pass.
- No provider source contract for proprietary scoring models; template-only field support.
- No official application submission, no verified admission-probability model and no actual Sanjesh-equivalent processing.

**Next developer actions:** test 003f on isolated MariaDB, build nonpersisting mock-input/trend interface and browser tests; then build the consent-gated private API only after real permission and database acceptance.
