# JR KONKUR ADMISSION SIMULATOR

## MASTER DEVELOPER DIRECTIVE — V2.2

### Intelligent Iranian University Admission and Programme Selection Simulator

**Website:** [https://drjavadrezazadeh.com/](https://drjavadrezazadeh.com/)\
**Repository:** \`drrezazadeh65/drjavadrezazadeh.com\`\
**Active branch:** \`migration/bertina-linux6\`\
**Parent directives:** JR Educational Intelligence Ecosystem V2.0 + V2.1\
**Priority:** High — Core Educational Service\
**Execution policy:** Forward-only, non-destructive, reuse-first, scientifically responsible.

---

# 1. MISSION

Develop a comprehensive, intelligent and evidence-based **Iranian Konkur University Admission and Programme Selection Simulator** within the existing website ecosystem.

The simulator must help candidates who have received their national university entrance examination results to:

1. Understand their official academic eligibility.
2. Explore relevant universities and programmes.
3. Compare programme-location options.
4. Build and refine their ordered selection list.
5. Identify invalid or risky choices.
6. Understand the uncertainty associated with admission outcomes.
7. Prepare a carefully reviewed final selection report.
8. Transfer their verified selection list into the official admission process themselves.

The simulator must **not** claim to be an official admissions authority, guarantee admission or submit applications to government systems without a separately authorized and verified integration.

The intended product is:

**JR Konkur Admission Simulator — شبیه‌ساز انتخاب رشته و دانشگاه**

It must be integrated into the existing Choice Studio infrastructure rather than built as an unrelated application.

---

# 2. MANDATORY REPOSITORY PRESERVATION

Before making changes, inspect the existing repository, especially:

- \`assets/js/jr-choice-studio-v1.js\`
- Existing Choice Studio frontend and feedback components.
- Existing educational records and student dashboards.
- Existing authentication and user-role system.
- Existing PHP API routes.
- Existing database schema and migrations.
- Existing reporting and PDF export capabilities.
- Existing bilingual SEO and design standards.
- Existing security, privacy and consent policies.
- Existing deployment and release governance.

Review Master Directives V2.0 and V2.1 and their existing implementation status.

Do not recreate functionality that already exists.

Do not create a second student account system, database, payment architecture or assessment engine.

Use the existing Bertina PHP/MySQL–MariaDB environment and established GitHub release workflow.

---

# 3. STORE THIS DIRECTIVE IN THE REPOSITORY

Before implementation, save this directive as a version-controlled Markdown document at:

\`docs/governance/JR_KONKUR_ADMISSION_SIMULATOR_MASTER_DIRECTIVE_V2_2_20261020.md\`

Requirements:

- Preserve the full directive without omitting substantive requirements.
- Link it to V2.0 and V2.1 in the relevant project documentation.
- Record the commit SHA and document path.
- If the target file already exists, compare its contents and update it without deleting newer approved requirements.
- Do not create duplicate versions of the same directive unnecessarily.
- Commit only to \`migration/bertina-linux6\`.
- Do not trigger a production deployment merely to store documentation.

The repository must remain the authoritative development record.

---

# 4. OFFICIAL ADMISSION DATA

Use the existing 1405 reference folder:

[https://drive.google.com/drive/folders/16icqSNpj7rQWh0FayhDp20EyNX4f1TUu](https://drive.google.com/drive/folders/16icqSNpj7rQWh0FayhDp20EyNX4f1TUu)

The current reference collection contains:

- Humanities admission guide.
- Experimental sciences admission guide.
- Mathematics and engineering admission guide.
- Arts admission guide.
- Official appendices and university-specific conditions.
- Admission based solely on academic records.

Also investigate and obtain, when officially available:

- Foreign-languages admission guide.
- Applicable official corrections.
- Current national admission regulations.
- Teacher-training and special-admission supplements.
- Relevant admission-cycle announcements.

The official National Organization of Educational Testing and other authorized Iranian institutions must remain the primary authority for admission rules.

Every published programme-location record must preserve:

- Admission year.
- Examination group.
- University.
- Campus or location.
- Programme.
- Programme-location code.
- Degree level.
- Admission method.
- Capacity.
- Applicable quotas.
- Regional or local conditions.
- Special requirements.
- Source document.
- Source page.
- Amendment/version status.
- Verification status.

No fabricated programme codes, capacities or regulations.

---

# 5. CANDIDATE PROFILE AND SCORECARD

Develop a secure, user-friendly candidate profile for the relevant admission cycle.

Collect only information necessary for the requested functionality.

Potential fields, subject to the official rules of that year:

- Examination year.
- Examination group.
- Applicable scorecard indicators.
- Rank in quota.
- Other relevant official rank indicators.
- Final score or total score, where applicable.
- Quota category.
- Relevant regional eligibility.
- Diploma and academic-record information.
- Authorized programme-selection status.
- Location preferences.
- Tuition constraints.
- Preferred educational pathways.
- Other officially required conditions.

Do not assume that the same scorecard fields or admission rules apply to all examination groups, admission routes or years.

The candidate must be able to review and correct entered information.

### Scorecard upload

Support an optional scorecard-upload workflow only after privacy and security controls are verified.

Requirements:

- Secure upload.
- File-type and size validation.
- Malware-aware handling.
- Access control.
- Limited retention.
- User confirmation of extracted fields.
- No automatic reliance on OCR output.
- Clear deletion and consent controls.

Manual entry must remain available.

Do not require users to upload sensitive documents when manual entry is sufficient.

---

# 6. ELIGIBILITY RULE ENGINE

Build a deterministic, versioned eligibility engine based on official admission rules.

The engine must evaluate only conditions supported by verified data.

Possible rule categories include:

- Examination group compatibility.
- Admission-method eligibility.
- Programme-specific restrictions.
- Regional eligibility.
- Quota applicability.
- Degree and academic-record conditions.
- Special university requirements.
- Applicable service commitments.
- Other legally relevant conditions.

Each rule must include:

- Unique identifier.
- Admission year.
- Source.
- Version.
- Effective period.
- Required input.
- Evaluation logic.
- Explanation.
- Review status.

Return one of four outcomes:

1. **Eligible under verified conditions.**
2. **Ineligible under an explicit official condition.**
3. **Insufficient information.**
4. **Requires official or professional verification.**

Do not silently classify uncertain candidates as eligible.

---

# 7. UNIVERSITY AND PROGRAMME EXPLORER

Extend the existing Choice Studio with advanced filtering.

Support:

- University name.
- Province.
- City.
- Academic programme.
- Programme-location code.
- Examination group.
- Degree level.
- Admission method.
- Capacity.
- University type.
- Tuition status.
- Verified institutional conditions.
- Relevant service commitments.
- Candidate eligibility.

Each result must display the official admission year and source provenance.

Use responsive mobile-first interfaces.

Do not overwhelm users with unstructured tables containing thousands of entries.

---

# 8. ORDERED SELECTION LIST BUILDER

Create a candidate-controlled selection list.

The system should support:

- Adding programme-location choices.
- Removing choices.
- Reordering by touch, keyboard and accessible controls.
- Searching within saved choices.
- Detecting duplicate programme codes.
- Checking eligibility warnings.
- Showing special conditions.
- Tracking the maximum permitted number of choices for the applicable admission cycle.
- Saving drafts.
- Exporting the ordered list.
- Reviewing the final list before submission to the official system.

The list must preserve the user's actual preference order.

Do not automatically replace user preferences with model-generated rankings.

Warn users that the order of selections may have important consequences under the official allocation process.

The official number of permitted choices must be derived from the applicable year's regulations, not hard-coded from historical assumptions.

---

# 9. ADMISSION SIMULATION MODES

Implement clearly separated modes.

## Mode A — Official eligibility simulator

Based on verified regulations and candidate information.

This mode can operate without historical admission-result data.

It must not predict admission probability.

## Mode B — Historical comparison

Display verified historical admission observations where reliable data are available.

Include:

- Admission year.
- Examination group.
- Quota.
- Programme.
- Data source.
- Sample coverage.
- Known limitations.

Do not compare incompatible ranks or quota categories.

## Mode C — Statistical admission outlook

Activate only after suitable historical datasets and a validated statistical methodology are available.

If implemented, require:

- Documented model assumptions.
- Data provenance.
- Out-of-sample evaluation.
- Calibration assessment.
- Appropriate uncertainty estimates.
- Subgroup performance review.
- Drift monitoring.
- Versioned predictions.

Avoid unsupported percentages such as “85% chance of admission.”

Where evidence is insufficient, return:

**Insufficient validated data for an admission probability estimate.**

## Mode D — Preference and scenario simulation

Allow candidates to compare alternative lists under different preferences and constraints.

This mode is a decision-support tool, not an official allocation result.

---

# 10. OFFICIAL ALLOCATION LOGIC

Investigate and document the officially applicable programme-selection and allocation rules.

If the rules are sufficiently documented and legally usable, implement a deterministic simulation of the documented ordering logic.

However, distinguish:

- Simulating how an ordered list is evaluated under known rules.
- Predicting whether a candidate will actually obtain a seat.

Actual outcomes may depend on other candidates' choices, quotas, capacities, official processing and information unavailable to the simulator.

Do not imply that reproducing partial allocation logic guarantees the final admission result.

---

# 11. INTELLIGENT WARNINGS

Provide contextual warnings for:

- Invalid programme-location codes.
- Duplicate choices.
- Missing eligibility information.
- Unverified institutional conditions.
- Incompatible examination groups.
- Applicable tuition obligations.
- Service commitments.
- Special interviews or additional assessments.
- Regional restrictions.
- Expired or superseded admission data.
- Unresolved official amendments.
- Choices requiring direct confirmation.

Each warning must identify whether it is:

- A verified rule violation.
- A caution based on official information.
- A data-quality warning.
- A preference-related suggestion.

Do not use alarming language for non-critical uncertainty.

---

# 12. DECISION-SUPPORT FEATURES

Integrate the V2.1 scenario engine.

Allow candidates to explore questions such as:

- What if I prioritize my preferred academic programme over location?
- What if I cannot relocate?
- What if I cannot pay tuition?
- What if I prefer a public institution?
- What if I want to keep vocational alternatives open?
- What if a programme requires an interview or service commitment?

Present trade-offs transparently.

Keep official eligibility separate from subjective preference scoring.

---

# 13. SCIENTIFIC AND ETHICAL INTEGRATION

The simulator may optionally link to existing Golden Talent, RCAS and BAHAR services.

Such integration must remain scientifically conservative.

Golden Talent or RCAS results must not automatically determine a candidate's university choices.

BAHAR may support planning and follow-up after an educational decision.

No unvalidated talent score, diagnostic label or deterministic career prescription may be used.

A candidate must be able to use the simulator without completing any talent assessment.

---

# 14. PROFESSIONAL REVIEW

Integrate with existing consultation services.

Offer an optional authorized adviser review for:

- Complex eligibility questions.
- Special admission conditions.
- Conflicting regulations.
- Final ordered lists.
- Major educational trade-offs.

Advisers must review the exact saved version of a candidate's list.

Record:

- Adviser identity.
- Review timestamp.
- Reviewed version.
- Observations.
- Recommended changes.
- Approval status.

Do not display professional approval before actual authorized review.

---

# 15. REPORTS AND EXPORTS

Provide an accessible, printable report containing:

- Candidate profile summary.
- Admission cycle.
- Examination group.
- Ordered programme-location choices.
- University and programme details.
- Eligibility outcomes.
- Warnings.
- Official source references.
- Uncertainty disclosures.
- Optional adviser review.
- Generation timestamp.
- Report version.

Support Persian RTL typography and reliable printing.

Do not claim that the generated report is an official registration confirmation.

The user remains responsible for checking and submitting choices through the official admission system.

---

# 16. MOBILE APPLICATION-LIKE UX

The simulator must work effectively on smartphones, tablets and desktop devices.

Prioritize:

- Clear step-by-step navigation.
- Autosaved drafts where authorized.
- Easy list reordering.
- Searchable filters.
- Large touch targets.
- Accessible error messages.
- RTL layout.
- Readable Persian typography.
- Low-bandwidth performance.
- Clear progress indicators.
- Re-entry into saved work.
- Accessible report export.

Preserve the existing luxury brand system.

Do not create an unrelated design.

---

# 17. SECURITY AND PRIVACY

Candidate scorecards and educational profiles are private personal information.

Use existing account identity, authentication and authorization.

Require:

- Record-level access control.
- Secure file handling.
- Consent where necessary.
- Purpose limitation.
- Data minimization.
- Retention and deletion rules.
- Protection against unauthorized exports.
- Audit logging.
- CSRF protection.
- Parameterized database access.
- Noindex and no-store controls for private pages.
- Appropriate safeguards for minors.

Do not expose personal scorecards through public URLs.

---

# 18. DATABASE REQUIREMENTS

Use the existing unified mother database.

Before designing migrations:

1. Inspect the actual schema.
2. Identify reusable educational and assessment tables.
3. Inspect existing admission-related data structures.
4. Identify missing entities.
5. Propose the minimum additive changes.
6. Review indexes and referential integrity.
7. Verify migration safety.
8. Preserve existing user records and services.

Do not create a separate simulator database.

Do not introduce a new login system.

Do not run destructive migrations.

---

# 19. DATA MAINTENANCE AND ANNUAL UPDATES

The simulator must support future admission cycles without rewriting its core architecture.

Implement versioned support for:

- Annual official guides.
- Official amendments.
- Updated programme offerings.
- Capacity changes.
- Modified quotas.
- Changed scorecard structures.
- Revised eligibility rules.
- Historical comparisons.

The system must not silently reuse outdated rules for a new admission year.

If a new cycle's data are incomplete, display that limitation and disable unsupported authoritative conclusions.

---

# 20. SEO AND PUBLIC DISCOVERY

Create an appropriate public introduction to the simulator within the existing bilingual website architecture.

The public page may explain:

- What the simulator does.
- What information candidates need.
- How the simulator uses official sources.
- Its limitations.
- Privacy protections.
- Available professional consultation.

Do not publish personal reports.

Avoid unsupported marketing claims such as guaranteed admission or scientifically certain university selection.

Preserve canonical URLs, hreflang, internal linking and the existing SEO standard.

---

# 21. IMPLEMENTATION PHASES

## Phase 0 — Audit and directive preservation

- Save this directive in the repository.
- Inspect existing Choice Studio functionality.
- Map V2.0/V2.1 overlap.
- Identify missing requirements.
- Produce a non-duplication matrix.

## Phase 1 — Official data foundation

- Validate the six available PDFs.
- Locate missing official sources.
- Extract and verify programme-location records.
- Build source and amendment provenance.
- Establish annual data versioning.

## Phase 2 — Candidate and eligibility workflow

- Candidate profile.
- Manual scorecard entry.
- Deterministic eligibility screening.
- Programme search and filtering.
- Secure draft storage.

## Phase 3 — Ordered selection builder

- Add, remove and reorder choices.
- Validate codes and duplicates.
- Enforce verified cycle-specific constraints.
- Produce preliminary reports.

## Phase 4 — Decision support

- Scenario comparison.
- Transparent warnings.
- Evidence Passport.
- Optional adviser review.

## Phase 5 — Advanced historical intelligence

- Historical admission datasets.
- Comparable rank and quota analysis.
- Statistical modelling only after validation.
- Uncertainty and calibration reporting.

## Phase 6 — Integration and release preparation

- Student dashboard integration.
- Mobile and accessibility testing.
- Security and privacy tests.
- Regression testing.
- Release-readiness evidence.

Prepare verified, independently useful increments.

Do not delay the basic eligibility and selection-list experience while waiting for a statistically validated admission prediction model.

---

# 22. TESTING AND ACCEPTANCE

Required test categories:

### Official data

- Source completeness.
- Programme code integrity.
- Capacity verification.
- Amendment precedence.
- Admission-cycle separation.

### Eligibility

- Positive and negative cases.
- Missing information.
- Conflicting conditions.
- Special admissions.
- Quota and regional rule handling.

### Selection list

- Correct ordering.
- Duplicate detection.
- Maximum-choice validation.
- Save and restore.
- Accessible reordering.
- Export accuracy.

### Privacy

- Unauthorized access rejection.
- Guardian and minor safeguards.
- Private document protection.
- Session security.
- Data retention and deletion.

### UX

- Mobile.
- Tablet.
- Desktop.
- Keyboard.
- Screen readers.
- Persian RTL.
- Print/PDF output.

### Regression

- Existing Choice Studio.
- Golden Talent.
- RCAS.
- BAHAR.
- Student dashboard.
- Consultation services.
- Commerce and unrelated website functionality.

Do not claim completion without actual test evidence.

---

# 23. REQUIRED DELIVERABLES

Developer must provide:

1. Repository audit and overlap matrix.
2. Saved V2.2 directive and commit SHA.
3. Verified official-source inventory.
4. Admission data model and provenance specification.
5. Candidate profile workflow.
6. Eligibility rules engine.
7. Programme search and filtering.
8. Ordered selection-list builder.
9. Contextual warnings.
10. Scenario comparison.
11. Printable reports.
12. Optional adviser review integration.
13. Historical data readiness assessment.
14. Statistical-model validation plan, if applicable.
15. Security and privacy test results.
16. Mobile/accessibility verification.
17. Regression test evidence.
18. Release-candidate assessment.
19. Known limitations.
20. Owner-facing operational status report.

Clearly distinguish implemented functionality from proposed or blocked functionality.

---

# 24. FINAL OWNER DIRECTIVE

The JR Konkur Admission Simulator is a major educational service, but it must not become a parallel technology stack.

It must mature the existing Choice Studio, use the existing official admissions knowledge base and integrate with the website's established identity, database, dashboard, consultation and scientific governance systems.

The initial operational release should prioritize:

**Official data → Candidate profile → Eligibility screening → University/programme search → Ordered selection list → Warnings → Printable report.**

Advanced admission probability estimates must remain disabled until suitable historical data and independently evaluated models are available.

Preserve all existing functionality.

Prevent duplicate development.

Maintain scientific honesty.

Use the established owner-controlled deployment workflow.

**First save this directive in the repository. Then audit, extend, test and prepare release candidates.**

**END OF MASTER DEVELOPER DIRECTIVE — V2.2**