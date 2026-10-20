# JR EDUCATIONAL INTELLIGENCE ECOSYSTEM
## MASTER DEVELOPMENT DIRECTIVE — VERSION 2.0
### Evidence-Based Admission Intelligence, Educational Pathway Guidance, Career Knowledge, Golden Talent, RCAS, BAHAR and Choice Studio

**Project:** drjavadrezazadeh.com  
**Repository:** `drrezazadeh65/drjavadrezazadeh.com`  
**Development branch:** `migration/bertina-linux6`  
**Hosting:** Bertina Linux, PHP 8.3, MySQL/MariaDB  
**Reference year:** Iranian National Admission Cycle 1405  
**Priority:** Critical — educational intelligence infrastructure  
**Development principle:** Forward-only, non-destructive, evidence-first, scientifically responsible, mobile-first.

---

# PART I — EXECUTIVE DIRECTIVE

## 1. Mission

Transform the website's existing educational, counselling, assessment and study-pathway infrastructure into a coherent, evidence-based, operational educational intelligence ecosystem.

The objective is not to build a new website, create another standalone assessment engine, or replace functioning components.

The objective is to mature and connect what already exists.

The system must progressively integrate:

1. Official Iranian university admission regulations and programme-location information.
2. Verified university, discipline and educational pathway information.
3. International occupational and skills knowledge.
4. Scientifically governed assessment and formative evidence.
5. Personalized educational decision support.
6. Human professional review.
7. Longitudinal student development and follow-up.
8. Privacy, provenance, accessibility and operational governance.

The final architecture must allow Studio, Golden Talent, RCAS, BAHAR, Golden Path, counselling services and student dashboards to benefit from a shared, versioned knowledge infrastructure while preserving their distinct scientific purposes.

**Do not mistake large quantities of information for scientific validity or production readiness.**

---

# PART II — VERIFIED EXISTING BASELINE

## 2. Repository and architecture

Before implementing anything, inspect the existing source and verify its current status.

The research review identified the following relevant components:

### Existing scientific and decision engines

- `platform/golden-talent-engine.mjs`
- `platform/golden-talent-engine-policy.json`
- `platform/golden-talent-evidence-analytics.mjs`
- `platform/golden-talent-review.mjs`
- `platform/golden-path-synthesis.mjs`
- `platform/rcas-evidence-bridge.mjs`
- `platform/rcas-observer-evidence-bridge.mjs`
- `platform/bahar-engine.mjs`
- `platform/assessment-engine.mjs`

### Existing frontend functionality

- `assets/js/jr-choice-studio-v1.js`
- `assets/js/jr-choice-feedback-v1.js`
- `assets/js/golden-talent-evidence-studio-v1.js`
- `assets/js/bahar-formative-workspace-v1.js`
- `assets/js/rcas-o1.js`
- `assets/js/student-dashboard.js`

### Existing production-oriented backend

- `api/golden-talent.php`
- `api/index.php`
- Existing authentication, student services, consultation and dashboard routes.

### Existing unified database migrations

- `database/unified/003a_education_longitudinal.sql`
- `database/unified/003c_assessment_scoring.sql`
- `database/unified/003d_golden_talent_bahar.sql`
- `database/unified/004c_research_governance.sql`

### Mandatory governance references

- `docs/governance/INTEGRATED_GOLDEN_TALENT_RCAS_BAHAR_CHOICE_V110_RELEASE_REVIEW_20261019.md`
- `docs/governance/MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md`
- `docs/governance/FINAL_INTEGRATION_SUPER_MASTER_PLAN_20261016.md`
- Existing SEO, design-system, privacy, deployment and release-governance documents.

These paths identify existing source assets, not automatically certified production capabilities.

The October 19 integration review explicitly distinguishes source integration from production certification.

Preserve this distinction.

## 3. Existing scientific constraints

Golden Talent currently contains a research-stage evidence-routing architecture, including six D1–D6 dimensions and explicit controls for provenance, contradictory evidence and professional review.

The existing Node engine is not equivalent to a fully verified production PHP assessment workflow.

RCAS and BAHAR include evidence collection and developmental review concepts but are not automatically validated aptitude, diagnostic or intervention-effect measurement systems.

Choice Studio currently supports structured comparison of two educational pathways using five criteria and user-supplied judgments.

It is not yet a comprehensive official admissions search engine.

**Preserve all existing constructs, routes, historical data, scoring boundaries and review requirements.**

Do not create a new total talent score, unsupported giftedness classification, clinical diagnosis, automatic career prescription or guaranteed admission prediction.

---

# PART III — OFFICIAL IRANIAN SOURCE CORPUS

## 4. Google Drive reference repository

**Folder:**
https://drive.google.com/drive/folders/16icqSNpj7rQWh0FayhDp20EyNX4f1TUu

**Folder name:**
`JR-Official-Admission-References-1405`

The research review directly accessed the extracted contents of the following six PDFs.

| Source | Google Drive file ID | Purpose |
|---|---|---|
| `رونوشت ensani_v1.pdf` | `1zN9cfFW8tDuYCy8qZAJUikq8NKw5hTjb` | Humanities admissions |
| `Tajrobi_v3.pdf` | `16Q_b-WE59-pWEteApAJxx0FxT5uLinR7` | Experimental sciences admissions |
| `Riazi_v1.pdf` | `1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2` | Mathematics and engineering admissions |
| `honar_v1.pdf` | `1z2u4VKDSNBCjw403o9tqty6ztt5jetFZ` | Arts admissions |
| `Peyvast_v1.pdf` | `1AZkqD801KS0wp3pmT0Kcu-MC_Sr0FHJZ` | Institutional conditions and appendices |
| `NoExamCsSar1405_v2.pdf` | `1a1kdO6WWaOt3GrKFKmxjgeWqsQCddMlC` | Admission based solely on academic records |

Directly accessible individual files follow this pattern:

`https://drive.google.com/file/d/FILE_ID/view`

### 4.1 Confirmed document scope

The four principal guides contain page numbering extending to:

- Humanities: page 580.
- Experimental sciences: page 662.
- Mathematics: page 476.
- Arts: page 322.

These represent approximately 2,040 numbered pages across the four main guides, excluding the appendices and the separate academic-record-based admissions guide.

These numbers must not be misrepresented as independently verified PDF page counts.

### 4.2 Information categories observed

The guides and appendices include:

- Admission rules and definitions.
- Examination groups.
- Programme-location tables.
- University and institutional listings.
- Admission capacity information.
- Selection and quota regulations.
- Regional and local admission conditions.
- Teacher-training pathways.
- Admission through academic records.
- Institution-specific restrictions.
- Certain scholarship and service-commitment arrangements.
- Some medical, emergency-care and special institutional conditions.
- Accommodation and welfare information, where stated.
- Specific institutional appendices and admission requirements.

The appendices contain particularly important rules for special admissions and university-specific requirements.

The academic-record-based admissions guide includes its own eligibility rules and programme tables.

### 4.3 Missing or unverified documents

The independent foreign-languages admission guide was not confirmed in the inspected folder.

Check whether additional official materials are needed, including:

- Foreign-languages admission guide.
- Relevant correction notices and amendments.
- Current official teacher-training supplements.
- Relevant programme-specific examination requirements.
- Any later official changes affecting capacities or conditions.

Do not assume missing documents have been published or are accessible.

Identify them precisely and report the gap.

---

# PART IV — DOCUMENT INGESTION AND DATA QUALITY

## 5. Build a verified ingestion pipeline

Process the entire authorized source corpus, not merely selected passages or introductory pages.

For every document, record:

- Source authority.
- Official title.
- Academic/admission year.
- Publication date, when established.
- Document version.
- Original filename.
- SHA-256 checksum.
- Page count.
- Extraction method.
- Extraction status.
- Human review status.
- Superseding amendments.
- Licensing and redistribution status.

For every extracted official fact, preserve document and page provenance.

### 5.1 Persian extraction requirements

Support:

- RTL and bidirectional text.
- Persian and Arabic numeral normalization.
- Arabic/Persian character normalization without changing legal meaning.
- Multi-column layouts.
- Complex tables.
- Footnotes and continuation rows.
- Repeated table headings.
- Programme codes with preserved leading zeros.
- University name normalization.
- Distinction between missing values and zero.
- OCR fallback for pages that cannot be reliably parsed.

A text-extraction result is not automatically a validated structured record.

### 5.2 Extraction audit

Create an auditable extraction inventory showing:

- Total pages per PDF.
- Successfully parsed pages.
- Pages requiring manual review.
- Extracted tables.
- Candidate programme records.
- Accepted programme records.
- Rejected or ambiguous records.
- Duplicate records.
- Conflicting records.
- Missing source references.

Apply independent quality checks to programme codes, capacities, universities, admission modes and eligibility restrictions.

Critical admission fields must not be published without verification.

### 5.3 Amendment precedence

Official corrections must be handled as versioned changes.

Never silently overwrite historical information.

Each correction must identify:

- Original source.
- Correcting source.
- Affected field or record.
- Effective admission cycle.
- Previous value.
- Corrected value.
- Reviewer.
- Approval timestamp.

When a conflict cannot be resolved, mark the record as disputed or temporarily unavailable for automated guidance.

---

# PART V — SHARED EDUCATIONAL KNOWLEDGE ARCHITECTURE

## 6. Create the JR Educational Intelligence Core

Build this as a modular extension of the existing mother database and PHP application.

Do not introduce a second operational database, independent authentication system, external mandatory runtime or duplicated customer identity.

### 6.1 Official admissions domain

Represent:

- Admission cycles.
- Official source documents.
- Examination groups.
- Universities and campuses.
- Academic programmes.
- Programme-location offerings.
- Admission methods.
- Capacities.
- Quotas.
- Regional and local eligibility.
- Special conditions.
- Tuition and service commitments where verified.
- Institutional appendices.
- Amendment history.
- Evidence provenance.

### 6.2 Career and skills domain

Represent:

- Occupations.
- Occupational classification identifiers.
- Skills and competencies.
- Knowledge domains.
- Work activities.
- Educational requirements.
- Career pathways.
- International-to-Iranian terminology mappings.
- Mapping confidence and human approval.
- Source version and licensing.

### 6.3 Scientific assessment domain

Reuse existing assessment, evidence, profile, review and longitudinal tables.

Do not duplicate Golden Talent, RCAS or BAHAR records in a new intelligence database.

Create only necessary, reviewed relationships between educational opportunities and existing scientific evidence structures.

### 6.4 Cross-domain mappings

Support relationships such as:

`Iranian academic programme → ISCED-F field → relevant knowledge/skills → occupational family → career pathway`

Relationships must be typed:

- Exact match.
- Close match.
- Broad match.
- Narrow match.
- Related concept.
- Unverified candidate mapping.

Do not equate similarly named degrees and occupations without expert review.

Use W3C SKOS principles where appropriate.

### 6.5 Data governance

Every new entity must have:

- Stable identifier.
- Data owner.
- Source.
- Version.
- Validity period.
- Verification status.
- Change history.
- Access policy.
- Retention policy.
- Appropriate indexes and foreign keys.

Reuse existing tables whenever their semantics are compatible.

Avoid unnecessary schema proliferation.

---

# PART VI — INTERNATIONAL DATA SOURCES

## 7. O*NET occupational knowledge

Official resources:

- https://www.onetcenter.org/database.html
- https://services.onetcenter.org/
- https://www.onetcenter.org/license_db.html

Evaluate O*NET 31.0 and the current official version available at implementation time.

Relevant domains include:

- Occupations.
- Skills.
- Knowledge.
- Abilities.
- Interests.
- Work activities.
- Work context.
- Education and training.
- Occupational relationships.

Prefer versioned, locally controlled imports for the required data rather than mandatory live API calls for every user request.

Respect attribution and licensing requirements.

The licensing status of assessment instruments must be assessed separately from the main occupational database.

Do not assume that an O*NET occupational interest instrument is scientifically validated for Iranian students or suitable for every age group.

## 8. ESCO occupational and skills classification

Official resources:

- https://esco.ec.europa.eu/en
- https://esco.ec.europa.eu/en/use-esco/download
- https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api

Review the available ESCO 1.2.1 dataset and confirm the latest applicable version before ingestion.

Import only relevant, licensed and appropriately versioned data.

Use stable identifiers and explicit mapping rules.

Do not require a separate graph database when the existing MariaDB environment can meet the actual workload.

## 9. UNESCO ISCED-F

Use ISCED-F 2013 to organize educational fields and support international comparability.

Official reference:

https://uis.unesco.org/en/files/isced-fields-education-and-training-2013-en-pdf

Do not presume a direct one-to-one relationship between every Iranian programme title and an international classification.

Maintain a human-reviewable crosswalk.

## 10. OECD Career Readiness

Use OECD research to inform:

- Career exploration.
- Educational decision-making.
- Work-related learning experiences.
- Opportunity awareness.
- Equity and accessibility.
- Longitudinal evaluation.

Official project:

https://www.oecd.org/en/about/projects/career-readiness.html

Do not convert group-level associations into unsupported individual causal predictions.

## 11. Additional official Iranian sources

Investigate, validate and integrate where authorized:

- National Organization of Educational Testing.
- Ministry of Science, Research and Technology.
- Ministry of Health and Medical Education.
- Ministry of Education.
- Technical and Vocational Training Organization.
- Official university websites.
- Official programme curricula and approved educational fields.
- Reliable historical admissions information.
- Verified Iranian employment and labour-market data.

For each source, record access method, legal status, update frequency, coverage, limitations and expected maintenance burden.

No unauthorized scraping, circumvention or unlicensed redistribution.

---

# PART VII — CHOICE STUDIO DEVELOPMENT

## 12. Transform the existing Choice Studio into a real admissions decision-support environment

Preserve the existing five-criterion, two-path comparison worksheet and its privacy boundaries.

Extend it progressively with separate modules.

### Module A — Official programme explorer

Users should be able to search and filter by:

- Examination group.
- University.
- Province and city.
- Programme title.
- Programme-location code.
- Degree level.
- Admission method.
- Institution type.
- Capacity.
- Verified eligibility requirements.
- Special conditions.

All published facts must link to the source document and relevant page.

### Module B — Eligibility screening

Implement deterministic rules for verifiable eligibility conditions.

Distinguish:

- Eligible based on available verified information.
- Ineligible under an explicit rule.
- Insufficient information.
- Requires official or professional confirmation.

Never infer eligibility from absent user information.

### Module C — Comparative decision support

Allow comparison of multiple programme choices using:

- Personal interests.
- Academic preferences.
- Location.
- Financial constraints.
- Study mode.
- Family circumstances, if voluntarily provided.
- Verified admission conditions.
- User-defined priorities.

Preserve the original Choice Studio worksheet as a valid introductory mode.

Do not relabel subjective preference indices as scientific aptitude scores.

### Module D — Admission likelihood

Do not introduce numerical admission probabilities unless historical data, statistical assumptions, validation samples and uncertainty reporting support them.

When insufficient evidence exists, provide descriptive guidance and explicitly identify the missing evidence.

### Module E — Reports

Provide printable, accessible, Persian-first reports containing:

- User-selected options.
- Verified programme information.
- Source citations.
- Eligibility findings.
- Preference comparison.
- Uncertainties.
- Recommended verification steps.
- Optional professional-review status.

Do not display a professional approval unless a verified authorized reviewer has approved that exact report version.

---

# PART VIII — GOLDEN TALENT INTEGRATION

## 13. Preserve scientific independence

Golden Talent must remain a distinct research-governed evidence framework.

The admission knowledge base may supply:

- Relevant educational opportunities.
- Examples of disciplines.
- Potential learning experiences.
- Skills associated with selected fields.
- Questions for further exploration.
- Alternative educational pathways.

It must not automatically supply:

- A total talent score.
- A giftedness classification.
- A clinical conclusion.
- A guaranteed suitable career.
- An admission prediction.
- Proof of psychometric validity.

Preserve D1–D6, existing evidence provenance rules, discrepancy handling, professional review and historical engine-version metadata.

Integrate through approved interfaces rather than rewriting the evidence engine.

---

# PART IX — RCAS INTEGRATION

## 14. Evidence-aware educational guidance

Use RCAS only within its established construct definitions and evidence-handling rules.

Potential integrations include:

- Contextual learning observations.
- Learner-reported interests.
- Parent and teacher observations.
- Educational exploration activities.
- Reviewed links to programme families.
- Identification of evidence gaps.

Ensure that unknown, missing and not-applicable responses remain distinct from negative observations.

Verify relationship authorization and consent on the server.

Do not interpret the presence of occupational data as proof of an individual's aptitude.

---

# PART X — BAHAR INTEGRATION

## 15. Longitudinal developmental planning

Use the shared knowledge infrastructure to support:

- Educational goals.
- Short-term exploration activities.
- Weekly developmental plans.
- Observation of progress.
- Review of barriers and opportunities.
- Revised pathway exploration.
- Human-reviewed educational recommendations.

Preserve the existing formative, non-diagnostic orientation.

Do not treat repeated observations as independent evidence or automatically infer intervention effectiveness.

Any future effectiveness claim requires an appropriate research design.

---

# PART XI — STUDENT, PARENT AND ADVISER DASHBOARDS

## 16. Role-aware integration

Use existing account identity, roles, guardian relationships and consent structures.

Develop appropriate experiences for:

### Students

- Programme exploration.
- Saved comparisons.
- Educational preferences.
- Reviewed reports.
- Developmental action plans.
- Relevant official updates.

### Parents and guardians

- Authorized access.
- Appropriate progress summaries.
- Consent management.
- Limited visibility consistent with the student's age and rights.

### Advisers

- Case review.
- Evidence quality inspection.
- Eligibility review.
- Decision explanation.
- Report approval.
- Follow-up planning.

### Administrators

- Source ingestion.
- Quality-control queues.
- Amendment review.
- Mapping approval.
- Audit history.
- Coverage and accuracy dashboards.

Private educational records must never be indexed by search engines or exposed through public APIs.

---

# PART XII — PERSONALIZATION AND RESPONSIBLE AI

## 17. Hybrid decision architecture

Use the appropriate method for each task.

### Deterministic rules

For:

- Admission eligibility.
- Official programme codes.
- Quotas.
- Published capacities.
- Document amendment precedence.
- User permissions.

### Evidence retrieval

For:

- Explaining official regulations.
- Summarizing university requirements.
- Answering source-grounded questions.
- Presenting page-specific citations.

### Transparent multi-criteria comparison

For:

- Comparing user-selected options.
- Sensitivity analysis.
- Preference-based ordering.

### Human professional review

For:

- Ambiguous eligibility.
- High-impact decisions.
- Conflicting sources.
- Scientific interpretations.
- Complex personal circumstances.

Large language models must not be the sole authority for eligibility, admission probabilities, assessment scoring or sensitive decisions.

### 17.1 Model evaluation

Test:

- Factual accuracy.
- Source fidelity.
- Hallucination resistance.
- Contradictory-source handling.
- Appropriate uncertainty.
- Bias and fairness.
- Privacy leakage.
- Prompt-injection resistance.
- Persian language quality.

Adopt appropriate controls from NIST AI RMF.

---

# PART XIII — DESIGN, ACCESSIBILITY AND UX

## 18. Preserve the existing brand system

Maintain the established black, gold, ivory and charcoal visual identity, approved Persian logo and bilingual design standards.

Do not create an unrelated visual identity.

### 18.1 Mobile-first requirements

Prioritize:

- Small mobile screens.
- Tablet layouts.
- Touch-friendly filters.
- Accessible comparison views.
- Readable Persian typography.
- RTL/LTR correctness.
- Progressive disclosure of complex regulations.
- Keyboard accessibility.
- Screen-reader semantics.
- WCAG 2.2 AA-oriented testing.
- Printable reports.
- Reduced-motion support.

Avoid presenting hundreds of programme records in a single unmanageable mobile table.

---

# PART XIV — SEO, GEO AND EDUCATIONAL CONTENT

## 19. Structured educational publishing

Follow the existing frozen bilingual SEO standard.

Develop high-quality, verified educational content for:

- Academic disciplines.
- Universities.
- Educational pathways.
- Admission methods.
- Official eligibility conditions.
- Skill development.
- Career exploration.
- Evidence-based counselling.

Do not mass-publish low-value pages created by automatically paraphrasing PDF tables.

Each public page must identify the applicable admission year and the provenance of factual claims.

Maintain canonical URLs, hreflang, structured data where appropriate, internal links and existing URL stability.

Do not expose private reports, student records or administrative source-review screens to search indexing.

---

# PART XV — OPERATIONAL GOVERNANCE

## 20. Preserve the production architecture

Use the existing Bertina PHP/MySQL/MariaDB mother database.

Do not create:

- A parallel student database.
- A new authentication provider without authorization.
- A separate assessment account system.
- A mandatory external graph database.
- A replacement payment architecture.
- A new deployment workflow.
- Duplicate tables for existing entities.

Inspect the live schema through authorized read-only mechanisms before proposing migrations.

The historical mother-database governance document records a previously observed 253-table schema, but this is not a substitute for a fresh verified schema inspection.

Do not rerun migrations merely because they exist in the repository.

### 20.1 Security

Require:

- Role-based access.
- Record ownership verification.
- Guardian authorization.
- Purpose-specific consent.
- CSRF protection.
- Parameterized database access.
- Secure storage.
- Audit trails.
- Data minimization.
- Withdrawal and retention controls.
- Separation of public and private assets.

Use age-appropriate safeguards for minors.

### 20.2 Source maintenance

Establish a documented update process for:

- New annual admission guides.
- Official corrections.
- University programme changes.
- International classification updates.
- Revised scientific instruments.
- Updated occupational data.

Automated ingestion may propose changes, but critical official records must pass verification before activation.

---

# PART XVI — PHASED EXECUTION

## 21. Phase 0 — Existing-system audit

Inspect the actual repository, active services, database and relevant interfaces.

Deliver a component inventory containing:

- Existing capability.
- Source path.
- Operational status.
- Known limitations.
- Reusable infrastructure.
- Required integration.
- Scientific status.
- Regression risk.

Do not begin with a wholesale redesign.

## 22. Phase 1 — Official admissions corpus

Verify all six PDFs.

Complete source inventory, extraction, normalization, programme record validation and amendment handling.

Identify missing foreign-languages and correction sources.

Deliver a source-coverage report.

## 23. Phase 2 — Unified knowledge layer

Extend the existing database minimally and safely.

Create verified admissions entities and provenance relationships.

Implement searchable data services with stable contracts.

Deliver schema documentation, migration review and data-quality evidence.

## 24. Phase 3 — Operational Choice Studio

Integrate official programme discovery, filters, eligibility screening, comparison and reports into the existing Studio.

Preserve the original five-criterion worksheet.

Deliver an operational, source-grounded admission guidance experience.

## 25. Phase 4 — International skills and career knowledge

Ingest approved O*NET and ESCO data.

Build reviewed mappings through ISCED-F.

Introduce educational field, skill and career exploration.

Deliver mapping-quality reports and versioned occupational references.

## 26. Phase 5 — Scientific ecosystem integration

Connect the shared knowledge infrastructure to Golden Talent, RCAS and BAHAR through reviewed interfaces.

Do not modify scientific constructs without independent scientific justification.

Deliver evidence-boundary tests and professional-review workflows.

## 27. Phase 6 — User dashboards and longitudinal services

Integrate saved comparisons, authorized student records, adviser reviews and follow-up activities.

Deliver privacy and permission tests.

## 28. Phase 7 — Quality, accessibility and publication readiness

Run full automated and manual testing.

Validate mobile and desktop interfaces.

Confirm source integrity, scientific safeguards, regression safety and deployment compatibility.

Prepare release candidates for the existing owner-controlled deployment workflow.

Do not automatically publish without the established release authorization.

---

# PART XVII — ACCEPTANCE CRITERIA

## 29. Official data integrity

Required:

- Every source document inventoried.
- Every page accounted for.
- All published critical programme fields verified.
- Every official fact traceable to a document and page.
- All applicable amendments represented.
- No fabricated codes, capacities or rules.
- Unresolved conflicts excluded from authoritative guidance.

## 30. Functional acceptance

Required:

- Search and filtering work correctly.
- Eligibility logic is independently testable.
- Persian and English interfaces remain coherent.
- Reports accurately reproduce verified data.
- Account permissions are enforced.
- Existing Golden Talent, RCAS, BAHAR and Choice Studio functions do not regress.
- Existing commerce and website infrastructure remain unaffected.

## 31. Scientific acceptance

Required:

- No unsupported psychometric claims.
- No unsupported acceptance probabilities.
- No automatic professional approval.
- No causal claims from descriptive longitudinal observations.
- Clear distinction between official facts, subjective preferences and research-stage interpretations.
- Documented limitations and appropriate uncertainty.

## 32. Operational acceptance

Required:

- Existing MariaDB compatibility.
- Safe and reviewed migrations.
- Verified backup and restoration process before production database changes.
- Passing automated tests.
- Real-device mobile checks.
- Accessibility checks.
- Appropriate security and privacy tests.
- Successful release-candidate validation.

Source-code completion must never be presented as production certification.

---

# PART XVIII — DELIVERABLES

## 33. Mandatory deliverable package

Provide:

1. Existing-system audit.
2. Source-document inventory.
3. PDF extraction and quality-control report.
4. Missing-source register.
5. Unified knowledge model.
6. Database compatibility assessment.
7. Admissions data services.
8. Operational Choice Studio enhancements.
9. Career and skills knowledge integration.
10. Golden Talent integration review.
11. RCAS integration review.
12. BAHAR integration review.
13. Student and adviser dashboard integration.
14. Security and privacy verification.
15. Scientific limitations and validation roadmap.
16. SEO/GEO and accessibility verification.
17. Automated and manual test evidence.
18. Deployment-readiness assessment.
19. Outstanding external dependencies.
20. A clear owner-facing completion report.

For every deliverable, state one of:

- Verified complete.
- Implemented but not independently verified.
- Partially complete.
- Blocked by a specific dependency.
- Not started.

Do not use arbitrary completion percentages or unsupported claims of 100% readiness.

---

# PART XIX — FINAL OWNER DIRECTIVE

The website already possesses meaningful educational, assessment, dashboard, database and publishing infrastructure.

The newly collected 1405 admission guidebooks provide a substantial official information base, including approximately 2,040 numbered pages in the four principal guides, plus the appendices and academic-record-based admissions guide.

This information can materially improve the operational usefulness of Choice Studio and the educational knowledge available to the other engines.

However, the PDFs alone cannot validate talent assessments, predict individual admissions outcomes or establish career suitability.

The correct strategy is therefore:

**Preserve the existing engines. Complete the official knowledge base. Add internationally recognized occupational and educational classifications. Integrate through the unified database. Validate all critical decisions. Release only tested, traceable improvements.**

Begin with the actual existing implementation and the six supplied official documents.

Proceed systematically through the defined phases.

Reuse existing work wherever possible.

Do not create parallel infrastructure.

Do not remove functioning features.

Do not fabricate scientific validation or production status.

Do not stop at a conceptual plan: implement, test, document and prepare verifiable release candidates through the established workflow.

The intended result is a coherent, trustworthy, scientifically responsible and commercially usable educational intelligence ecosystem capable of sustained expansion across future admission cycles.

**END OF MASTER DIRECTIVE — VERSION 2.0**