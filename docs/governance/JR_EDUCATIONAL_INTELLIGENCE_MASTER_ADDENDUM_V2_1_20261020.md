# JR EDUCATIONAL INTELLIGENCE ECOSYSTEM

## MASTER DEVELOPER ADDENDUM V2.1

### Future-Ready Educational Pathways, Decision Intelligence, Career Atlas and Longitudinal Development

**Website:** [https://drjavadrezazadeh.com/](https://drjavadrezazadeh.com/)\
**Repository:** `drrezazadeh65/drjavadrezazadeh.com`
**Active branch:** `migration/bertina-linux6`\
**Hosting:** Bertina Linux — PHP 8.3 / MySQL–MariaDB\
**Parent directive:** JR Educational Intelligence Ecosystem — Master Development Directive V2.0\
**Execution policy:** Forward-only, non-destructive, evidence-based, reuse-first, privacy-first.

---

# 1. PRIMARY DIRECTIVE

This document is an **extension of Master Directive V2.0**, not a replacement.

The objective is to mature the existing website into a comprehensive, future-ready educational intelligence ecosystem by extending the capabilities already present in:

- Choice Studio
- Golden Talent
- RCAS
- BAHAR
- Golden Path
- Student and adviser dashboards
- Existing consultation services
- Existing unified customer and educational database
- Existing research and evidence-governance infrastructure

**Do not rebuild anything that already works.**

Before writing code, inspect the actual implementation and determine what already exists, what is partially implemented, what is only a research prototype, and what is genuinely missing.

Reuse existing modules, tables, APIs, authentication, design tokens, routes, data contracts, reports and tests.

Do not create a second Studio, another talent engine, parallel database, duplicate student profile or independent user-management system.

All changes must extend the established architecture.

---

# 2. MANDATORY NON-DUPLICATION AUDIT

Before implementing any requirement in this addendum, inspect:

- `platform/golden-talent-engine.mjs`
- `platform/golden-talent-evidence-analytics.mjs`
- `platform/golden-path-synthesis.mjs`
- `platform/rcas-evidence-bridge.mjs`
- `platform/rcas-observer-evidence-bridge.mjs`
- `platform/bahar-engine.mjs`
- `assets/js/jr-choice-studio-v1.js`
- `assets/js/jr-choice-feedback-v1.js`
- `assets/js/golden-talent-evidence-studio-v1.js`
- `assets/js/bahar-formative-workspace-v1.js`
- `assets/js/student-dashboard.js`
- `api/golden-talent.php`
- `database/unified/003a_education_longitudinal.sql`
- `database/unified/003c_assessment_scoring.sql`
- `database/unified/003d_golden_talent_bahar.sql`
- Existing authentication, consultation and administration services.

Also read:

- `docs/governance/INTEGRATED_GOLDEN_TALENT_RCAS_BAHAR_CHOICE_V110_RELEASE_REVIEW_20261019.md`
- `docs/governance/MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md`
- The existing final integration master plan.
- The frozen bilingual SEO standard.
- The existing design system and deployment rules.

Produce an internal requirements-to-implementation matrix:

| Requirement             | Existing component  | Current verified status | Gap         | Action               |
| ----------------------- | ------------------- | ----------------------- | ----------- | -------------------- |
| Existing and sufficient | Reuse               | Verified                | None        | Preserve             |
| Existing but incomplete | Extend              | Partial                 | Specific    | Improve              |
| Research prototype      | Integrate carefully | Prevalidation           | Operational | Validate and connect |
| Missing                 | Add minimally       | Absent                  | Defined     | Implement            |

**Do not duplicate a feature merely because its current implementation is difficult to locate.**

---

# 3. STRATEGIC PRODUCT MODEL

Organize the user experience around one coherent educational journey:

**Understand → Explore → Gather Evidence → Compare → Decide → Act → Review**

The four scientific and decision-support systems must retain their distinct functions while participating in this unified journey.

- **Studio:** educational opportunities, official admission information and decision support.
- **Golden Talent:** structured, research-governed evidence exploration.
- **RCAS:** contextual evidence collection within its established construct boundaries.
- **BAHAR:** formative planning, longitudinal observations and developmental review.
- **Golden Path:** professionally reviewed synthesis and actionable educational planning.

Do not merge the engines into one unsupported score.

Do not create a single algorithm that claims to identify a person's definitive academic or professional destiny.

---

# 4. PRIORITY ONE — JR EDUCATIONAL PATHWAY NAVIGATOR

Extend the existing Choice Studio into an integrated educational pathway navigator.

The navigator should allow users to explore educational opportunities according to their verified circumstances and voluntarily provided preferences.

Support, where reliable data exist:

- Current educational level.
- Academic interests.
- Examination group.
- Relevant admission conditions.
- Academic programme.
- University and campus.
- Location preferences.
- Financial constraints.
- Educational modality.
- Special admission requirements.
- Alternative academic or vocational pathways.

Use the official 1405 admission corpus and subsequent verified corrections.

Every official eligibility result must cite the applicable source and version.

Distinguish clearly between:

1. Verified eligibility.
2. Verified ineligibility.
3. Insufficient information.
4. Conditions requiring official or professional confirmation.

Do not infer missing user characteristics.

Do not represent eligibility as a guarantee of admission.

### Acceptance criteria

- Uses the existing Studio architecture.
- Preserves the original five-criterion comparison worksheet.
- Provides source-grounded pathway exploration.
- Supports accessible mobile-first navigation.
- Does not introduce unsupported admission probabilities.

---

# 5. PRIORITY TWO — EDUCATIONAL SCENARIO ENGINE

Create a transparent, rule-aware scenario comparison capability within the existing decision-support architecture.

Examples:

- What if the student cannot relocate?
- What if tuition is unaffordable?
- What if a programme is unavailable in the student's region?
- What if the student prefers a vocational route?
- What if admission conditions change?
- What alternative pathways remain available?

The scenario engine must distinguish:

- Official constraints.
- User preferences.
- Assumptions.
- Verified alternatives.
- Unknown or uncertain outcomes.

A scenario must never silently alter the official source facts.

Support comparison, sensitivity analysis and printable explanations.

Avoid opaque recommendation rankings.

### Acceptance criteria

Each scenario report identifies the changed assumptions, affected options, source evidence and limitations.

---

# 6. PRIORITY THREE — EVIDENCE PASSPORT

Introduce an **Evidence Passport** as a shared provenance and explanation layer, not as a new assessment engine.

Every significant recommendation or educational decision-support output should identify:

- Source of information.
- Source date and version.
- Type of evidence.
- Applicable context.
- Verified facts.
- User-entered preferences.
- Professional interpretations.
- Uncertainties.
- Conflicting evidence.
- Human review status.
- Recommended next verification step.

Use three clearly distinguishable evidence categories:

**OFFICIAL FACT:** information traceable to an authoritative document.

**USER PREFERENCE / SELF-REPORT:** information supplied or estimated by the user.

**RESEARCH OR PROFESSIONAL INTERPRETATION:** conclusions requiring explicit limitations and, where applicable, qualified review.

Never visually present a research hypothesis as an official fact.

Preserve existing Golden Talent evidence provenance and reviewer authority.

### Acceptance criteria

Every important output can explain why it was generated, which information was used, and what remains uncertain.

---

# 7. PRIORITY FOUR — HISTORICAL ADMISSIONS INTELLIGENCE

Extend the official admission knowledge infrastructure to support multiple years.

Begin with the existing 1405 corpus and identify reliable prior-year official guides.

Store annual versions of:

- Programmes.
- Programme-location codes.
- Universities.
- Capacities.
- Admission modes.
- Applicable quotas.
- Special requirements.
- Amendments.

Support comparisons such as:

- Capacity changes.
- Newly introduced programmes.
- Discontinued programme offerings.
- Changed admission methods.
- Changed eligibility requirements.
- Institutional changes.

Preserve historical provenance.

Do not infer individual admission probability from capacity changes alone.

Historical cut-off data, if obtained, must be separately verified, contextualized and statistically evaluated.

### Acceptance criteria

Historical comparisons are reproducible and never mix incompatible admission cycles without warning.

---

# 8. PRIORITY FIVE — IRANIAN ACADEMIC–CAREER ATLAS

Extend the shared educational knowledge layer to connect:

**Academic programmes → Fields of study → Skills → Occupational families → Career exploration pathways**

Use the approved sources identified in Master Directive V2.0:

- Official Iranian educational sources.
- UNESCO ISCED-F.
- O*NET.
- ESCO.
- Verified Iranian occupational and labour-market information.

Do not assume that US or European labour-market statistics describe Iranian employment conditions.

Create human-reviewable crosswalks between Iranian degree titles and international classifications.

Support stable identifiers, versioning, mapping confidence and source attribution.

For each sufficiently documented programme, progressively provide:

- Programme description.
- Educational content.
- Skills commonly associated with the field.
- Potential occupational families.
- Further-study pathways.
- Professional qualifications where relevant.
- Limitations of available labour-market information.

Do not promise employment or earnings.

### Acceptance criteria

Career relationships are traceable, versioned and clearly distinguished from guaranteed outcomes.

---

# 9. PRIORITY SIX — EDUCATIONAL EXPLORATION LAB

Create a low-risk educational exploration capability connected to the existing formative and evidence systems.

Before making a major academic choice, users should be able to try short, meaningful experiences.

Examples include:

- Reading introductory disciplinary material.
- Completing a short learning project.
- Observing a class.
- Interviewing a university student or professional.
- Exploring a skill through a guided activity.
- Reflecting on interests and difficulties.

Each activity should specify:

- Purpose.
- Expected time.
- Required resources.
- Accessibility considerations.
- Observation prompts.
- Reflection questions.
- Limitations.
- Suggested follow-up.

These activities must not be treated as validated diagnostic tests.

With appropriate consent, reviewed observations may inform existing Golden Talent, RCAS or BAHAR workflows, but only through their established evidence and authorization rules.

### Acceptance criteria

Activities produce descriptive, revisable observations rather than fixed ability labels.

---

# 10. PRIORITY SEVEN — LONGITUDINAL DEVELOPMENT PORTFOLIO

Extend the existing educational records, BAHAR and student dashboard infrastructure.

Support an appropriately authorized longitudinal portfolio containing:

- Educational goals.
- Planned activities.
- Evidence of participation.
- Contextual observations.
- Student reflections.
- Reviewed progress notes.
- Revised goals.
- Professional feedback.
- Follow-up dates.

Do not create a parallel student record system.

Use the existing unified identity and educational tables wherever possible.

Protect minors through age-appropriate consent, guardian authorization, access restrictions and data minimization.

Do not interpret change over time as evidence of a causal intervention effect.

### Acceptance criteria

Users and authorized professionals can understand what changed, what was observed, and which conclusions remain provisional.

---

# 11. PRIORITY EIGHT — PROFESSIONAL REVIEW NETWORK

Extend existing adviser and consultation infrastructure.

Provide professional review capabilities for:

- Complex educational decisions.
- Ambiguous eligibility.
- Conflicting sources.
- High-impact recommendations.
- Scientific evidence interpretation.
- Individualized action plans.

Require:

- Verified adviser identity.
- Explicit authorization.
- Case ownership checks.
- Documented review.
- Report version identification.
- Review history.
- Appropriate professional scope.

Never fabricate professional approval.

A report must not show a verified-review status until the corresponding authorized review has actually occurred.

### Acceptance criteria

All review decisions are attributable, auditable and tied to the exact version reviewed.

---

# 12. PRIORITY NINE — EDUCATIONAL OPPORTUNITY EQUITY

Extend the existing student-support and sponsorship ecosystem.

Identify verifiable opportunities such as:

- Scholarships.
- Financial support.
- Low-cost educational pathways.
- Public educational resources.
- Regional opportunities.
- Accessible learning programmes.
- Verified institutional support.

Integrate with existing support services without exposing sensitive financial or personal circumstances.

Avoid automated exclusion or stigmatizing labels.

Keep eligibility for financial assistance separate from academic ability assessments.

### Acceptance criteria

Support opportunities are verifiable, privacy-preserving and appropriately reviewed.

---

# 13. PRIORITY TEN — REAL-WORLD OUTCOME EVALUATION

Design a consent-based evaluation framework for assessing whether the ecosystem actually helps users.

Potential indicators include:

- Improved understanding of available pathways.
- Better awareness of admission conditions.
- Decision confidence.
- User-reported clarity.
- Completion of exploration activities.
- Follow-up engagement.
- Subsequent educational choices.
- Reported satisfaction and perceived usefulness.

Where feasible, use appropriate longitudinal or comparative research designs.

Distinguish:

- User satisfaction.
- Predictive accuracy.
- Psychometric validity.
- Intervention effectiveness.
- Educational outcomes.

These are different constructs and must not be conflated.

Protect participants through research governance, minimization, appropriate consent and retention controls.

Do not use unverified outcome claims in marketing.

### Acceptance criteria

Evaluation findings are reproducible, ethically collected and accompanied by limitations.

---

# 14. UNIFIED EXPERIENCE DESIGN

The website must feel like one coherent educational platform rather than a collection of disconnected tools.

Use existing navigation, dashboards, brand identity and account systems.

Suggested journey:

**Stage 1 — Discover:** identify the user's educational question and relevant constraints.

**Stage 2 — Explore:** search official programmes, pathways and career information.

**Stage 3 — Reflect:** collect appropriate preferences and contextual evidence.

**Stage 4 — Compare:** examine alternatives and uncertainty.

**Stage 5 — Review:** obtain professional guidance when appropriate.

**Stage 6 — Act:** create a realistic educational plan.

**Stage 7 — Revisit:** review progress and adjust the plan.

Each stage must remain independently useful.

Do not force users to complete Golden Talent, RCAS or BAHAR before accessing public official admission information.

Preserve free introductory functionality.

---

# 15. SCIENTIFIC GOVERNANCE

All extensions must preserve the existing scientific safeguards.

Mandatory restrictions:

1. No fabricated talent scores.
2. No unsupported psychometric norms.
3. No automatic giftedness labels.
4. No unsupported causal claims.
5. No guaranteed admission outcomes.
6. No unsupported career suitability claims.
7. No automatic professional approval.
8. No conversion of missing evidence into negative evidence.
9. No use of unvalidated instruments as definitive assessments.
10. No mixing of official facts, subjective judgments and research interpretations.

Scientific validity must be demonstrated through appropriate independent research, not asserted because software tests pass.

---

# 16. DATABASE AND INTEGRATION RULES

Use the existing Bertina MySQL/MariaDB mother database.

Reuse:

- Existing customer identity.
- Existing educational records.
- Existing assessment instruments and sessions.
- Existing Golden Talent evidence.
- Existing RCAS records.
- Existing BAHAR portfolios.
- Existing consultation services.
- Existing reporting and review structures.
- Existing audit and consent mechanisms.

Any new schema element requires a documented gap analysis.

Before proposing database changes, verify the current schema and migration state.

Do not rerun historical migrations blindly.

Do not create a second database, duplicate login or independent dashboard architecture.

All changes must be additive, reviewed and backward-compatible.

---

# 17. UX, ACCESSIBILITY AND BRAND CONTINUITY

Preserve the existing luxury black/gold/ivory visual system, Persian brand identity and bilingual architecture.

Apply:

- Mobile-first design.
- Tablet and desktop support.
- RTL/LTR correctness.
- Accessible typography.
- Keyboard navigation.
- Screen-reader compatibility.
- WCAG 2.2 AA-oriented verification.
- Clear source citations.
- Transparent uncertainty indicators.
- Accessible comparison views.
- Print-ready reports.
- Privacy-aware dashboards.

Avoid long, confusing forms and excessive scrolling.

The user must always understand whether they are viewing official information, a personal reflection or a reviewed professional conclusion.

---

# 18. SEO AND KNOWLEDGE DISCOVERY

Follow the existing frozen bilingual SEO standard.

Improve the discoverability of genuinely useful, verified educational content.

Potential content categories:

- University profiles.
- Academic programme guides.
- Admission requirements.
- Educational pathways.
- Skills and occupations.
- Student guidance resources.
- Evidence-based decision-making.

Avoid automatically generating thousands of thin or duplicated pages.

Respect source licensing and copyright.

Maintain stable public URLs, canonical links, hreflang, structured data where appropriate, and private-page noindex/no-store controls.

---

# 19. IMPLEMENTATION PRIORITY

Execute in the following order, subject to the actual audit findings.

**P0 — Foundational readiness**

- Verify existing capabilities.
- Identify duplicate or incomplete work.
- Confirm official source quality.
- Complete the shared provenance model.
- Preserve privacy and scientific boundaries.

**P1 — High-value operational improvements**

- Educational Pathway Navigator.
- Official programme exploration.
- Eligibility screening.
- Evidence Passport.
- Scenario comparison.

**P2 — Knowledge expansion**

- Historical admissions intelligence.
- Iranian academic–career atlas.
- Skills and occupational mapping.
- Educational Exploration Lab.

**P3 — Longitudinal and professional services**

- Development portfolio.
- Adviser review integration.
- Educational opportunity support.
- Outcome evaluation.

Release independently useful, verified increments.

Do not wait for the entire multi-year ecosystem to be complete before preparing a safe, valuable release candidate.

---

# 20. MANDATORY ACCEPTANCE GATES

Before declaring any capability complete, verify:

- No duplicate implementation.
- No broken existing functionality.
- No unauthorized schema modification.
- No privacy regression.
- No fabricated scientific claim.
- No unsupported official fact.
- No untraceable critical recommendation.
- No unverified professional approval.
- No mobile or accessibility regression.
- No disruption to commerce or unrelated services.

All tests must distinguish source-level checks from authenticated production behavior.

---

# 21. REQUIRED DEVELOPER REPORT

For each requirement, report:

| Field                 | Required information                        |
| --------------------- | ------------------------------------------- |
| Existing baseline     | What was already implemented                |
| Work performed        | What was extended or added                  |
| Reused components     | Which existing assets were preserved        |
| Data sources          | Exact source and version                    |
| Scientific status     | Validated, research-stage or not applicable |
| Tests                 | Actual test names and results               |
| Remaining limitations | Specific unresolved gaps                    |
| Release status        | Ready, blocked or awaiting owner approval   |

Do not provide unsupported percentages of completion.

Do not describe a prototype as an operational production service.

Do not claim deployment without verifiable production evidence.

---

# 22. FINAL EXECUTION INSTRUCTION

This addendum must be implemented **together with Master Directive V2.0**, using the existing project as the authoritative baseline.

The goal is not to increase the number of features indiscriminately.

The goal is to make the existing ecosystem more coherent, scientifically defensible, useful, maintainable and capable of supporting future growth.

**Inspect first. Reuse second. Extend third. Validate fourth. Prepare controlled release fifth.**

Preserve the existing architecture, protect user data, maintain scientific integrity and avoid all unnecessary duplication.

The final outcome should be an integrated educational intelligence experience that supports users from initial exploration through informed decision-making, developmental action and subsequent review.

**END — MASTER DEVELOPER ADDENDUM V2.1**