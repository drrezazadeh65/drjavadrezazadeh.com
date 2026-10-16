# Scientific Evidence and Independent Validation Master Protocol
## Golden Talent · RCAS · BAHAR — bilingual, internationally auditable

**Protocol revision:** 2026-10-16.1  
**Owner:** Dr. Javad Rezazadeh Yazdeli (framework author; not an independent evaluator of his own instrument)  
**Status:** PROTOCOL DESIGNED; NOT PRE-REGISTERED; NO NEW HUMAN-SUBJECT DATA COLLECTED; NO EMPIRICAL VALIDITY FINDING  
**Release architecture:** existing secure Bertina account/consent/guardian controls + common luxury design tokens; privacy-safe public educational experience is distinct from protected research/diagnostic claims.  
**Scientific default:** PREVALIDATION. **No marketing or published interface may infer clinical diagnosis, normative talent percentile, certified competence, selection/placement decision, treatment, or guaranteed outcome.**

## A. Standards, construct boundaries and non-equivalence

The current authoritative educational/psychological framework is the jointly produced **AERA, APA and NCME (2014) Standards for Educational and Psychological Testing**, publicly accessible through [NCME](https://ncme.org/resources/books/testing-standards/). Validity is an argument for particular *interpretations and uses of scores*, not a single certificate possessed permanently by an instrument.  
For Persian/English interpretation and adapted prompts, the [International Test Commission (2017) Guidelines for Translating and Adapting Tests, 2nd edition](https://www.intestcom.org/page/14) requires a defensible adaptation process and relevant comparability evidence.  
The [COSMIN initiative](https://www.cosmin.nl/) supplies useful methodological distinctions concerning *content validity*, reliability, measurement error, responsiveness and certainty of evidence. COSMIN was developed primarily in healthcare outcomes; it is **a methodological comparator only**, not the governing standard or certification for these educational instruments.

Separate three ontological entities:

1. **Golden Talent** is, at present, a **multi-source developmental interpretative framework**. It combines self-report, observed learning behaviour, performance samples, contextual conditions and longitudinal activity while preserving source, contradiction, missingness and uncertainty. It is NOT automatically a psychometric talent scale. Its validation target is the *reasonableness, reproducibility, usefulness, fairness and consequences of the specified interpretation and decision workflow*.
2. **RCAS Start** is a **28-prompt browser-based reflection activity**, currently Persian and English translation pilot, with no normed scoring. If a particular version is later proposed as a latent-construct *quantitative scale*, **that specific scored version** first requires a published construct map, item bank freeze, qualitative evidence about response processes, appropriate statistical model and target-population studies; do not infer a factor structure from 28 prompts alone.
3. **BAHAR** is a **formative action and evidence portfolio**: a goal, weekly action, self-selected observation, review and revision. It is NOT a diagnostic score. First evaluate workflow comprehension, implementation fidelity, feasibility, privacy, inter-rater consistency of *human categorical coding if coding is adopted*, and outcome-specific change using an ethical comparison study. Cronbach alpha or CFA are not automatically meaningful for an open narrative diary.

## B. Immutable unit of scientific approval

There is **no universal 'validated Golden Talent' claim**. Each claim is a tuple:

`(instrument_id, item_or_workflow_content_sha256, semantic_version, scoring_version_if_any, language, target_population, jurisdiction_and_context, administration_mode, purpose, interpretation, decision_consequence, evidence_bundle_sha256, independent_review_record, review_valid_until)`.

- A changed prompt, translator/adaptor decision, rubric, threshold, language, purpose, target population or model output requires **re-examination of affected evidence**. A CSS/layout change alone does not manufacture validity, although accessible form changes should be checked for response effects.
- Each consent notice, item bank, translation, pre-registration, analytic code and review decision is versioned with checksums, registered evidence location, effective date and independent reviewer identity/authority; no participant-level evidence, identity document or personal notes in public Git.
- Financial sponsorship, employment relationship or institutional conflict with the instrument developer must be declared. The original author may contribute, but cannot be recorded as the sole **independent** signatory.

## C. Twelve acceptance gates

| Gate | Scientific acceptance evidence (not an assertion) | Disposition now |
|---|---|---|
| G01 Claim & intended-use map | Frozen definitions, intended users, interpretations, decisions and expressly disallowed claims, by locale/population | **PROTOCOL DESIGNED / EVIDENCE PENDING** |
| G02 Literature and rival concepts | Search log, inclusion/exclusion, theory of change, comparison with competing instruments and rival explanations | EVIDENCE PENDING |
| G03 Independent expert content review | Reviewer independence declaration, construct-to-item/rubric relevance and comprehensiveness assessments, revision record | EVIDENCE PENDING |
| G04 Language and cultural adaptation | Persian authoritative edition; independent translators/adaptors, reconciliation, cognitive interviews and divergence review for English | EVIDENCE PENDING |
| G05 Research ethics and safeguarding | Approved protocol, age/guardian policy, learner assent and refusal, special populations, withdrawal, retention, distress protocol | **NO HUMAN-SUBJECT DATA INTAKE** |
| G06 Transparent research plan | Registered hypotheses/questions, eligibility, recruitment, sample-size precision/power justification, intended models, missing-data plan | NOT PRE-REGISTERED |
| G07 Response process and usability | Accessible FA/EN cognitive interview evidence, task completion, misunderstanding taxonomy, item revisions and adverse-event log | EVIDENCE PENDING |
| G08 Technical/data provenance | Immutable item hashes, scoring replay if scoring exists, provenance, deduplication, secure consent, version and traceable exclusions | Isolated CI only; LIVE EVIDENCE PENDING |
| G09 Measurement characteristics where relevant | Content and construct validity; reliability, uncertainty and fairness by group; factor models **only if a scale is claimed** | NO NORMS/SCORING |
| G10 Consequential/formative usefulness | Human-review agreement and traceability for Golden Talent; prospective feasibility and ethically evaluated learning outcomes for BAHAR | EVIDENCE PENDING |
| G11 Replication and independent challenge | Independent analysis, archived codebook and results, sensitivity analyses, rival-sufficiency/negative-case testing | EVIDENCE PENDING |
| G12 Scoped release, expiry and surveillance | Independent signed approval for precise claim tuple, report limitations, safety/revocation and periodic re-review | **RELEASE BLOCKED** |

**No numerical completion percentage** is defensible where essential empirical gates remain unperformed. Software CI success only establishes limited implementation correctness.

## D. Three separate preregistration and study plans

### D1 Golden Talent: development and multi-source interpretative validity

**Research questions:** Can qualified educators reliably distinguish observation from interpretation, identify incompatible or insufficient evidence, avoid single-source labeling and agree on plausible, revisable action hypotheses? Does the framework improve the *quality of documented decisions* over ordinary unstructured advice without producing adverse stereotyping or inequitable exclusion?

- **Qualitative foundations:** transparent review of six evidence families (self-report S, performance P, records R, observations O, context C, behavioural traces T); stakeholder interviews; adversarial cases; sources of disagreement and contradictory evidence; parent/teacher/learner voice and disability-related access.
- **Vignette study:** de-identified fictional case bundles stratified for concordance, contradiction, missing data, language/background and ambiguous outcomes; independent raters blinded to the framework authors' preferred answer; counterbalanced comparison to unstructured review. Predefine rubric dimensions for claim calibration, provenance fidelity, stated uncertainty, reversibility and safeguarding.
- **Live prospective study only following ethics approval:** specify recruitment and low-stakes decisions; test interpretative accuracy against independently adjudicated case evidence, reviewer disagreement, transparency and foreseeable harm. Qualitative discrepancies are analysed, not suppressed.
- **Quantitative analysis if justified:** ordinal/nominal inter-rater agreement with confidence intervals and prevalence sensitivity; calibration/decision consistency and subgroup fairness. Do not compute an undifferentiated "talent index".

### D2 RCAS Start: response-process and possible future measurement validation

**Current product claim:** 28-prompt reflection with optional seven-day action; no scoring, diagnosis, percentile or validated translation equivalence.

- Freeze and hash each language edition independently. Create an item-level construct-intent table and trace 28 prompts to formative functions.
- Convene an independent panel for relevance, interpretability, redundancy, ambiguity, accessibility and potential distress; review content comprehensiveness, not merely item agreement percentages.
- Conduct cognitive interviews across the actual learner age, gender, educational and linguistic groups intended for deployment. Iterate until major misunderstandings and unacceptable harms are addressed; separately document translation compromises.
- **Only after deciding to claim scale scores**, preregister candidate dimensionality/score semantics, estimation and cross-validation, independent sampling, ordinal response modelling, local dependence, residuals, measurement invariance/DIF, test-retest interval and missingness. Sample-size targets require **model-based simulation/precision justification**, not a universal arbitrary N.
- For the English translation, demonstrate language comparability in *response meaning and any subsequently claimed score* before pooling or benchmarking. No untested percentile or cross-language ranking.

### D3 BAHAR: feasibility, fidelity and formative consequential evidence

**Current product claim:** usable adult-oriented, in-browser action worksheet for goal, weekly action, observation and reflective revision, without storage/upload or score.

- **Usability feasibility:** independent adult users attempt goal specification, weekly action, entry of observable evidence, descriptive review and correction; compare comprehension, task failure, accessibility, burden and risks in FA/EN. No account, payment or human research recording without consent.
- **Inter-rater evidence conditional on coding:** if researchers define a formal *rubric* for goal clarity, evidence quality or reflection levels, freeze the rubric and assess agreement with dual blinded raters. This would validate *rubric use under specified conditions*, not personality/talent.
- **Prospective improvement claim conditional on ethics:** register outcome(s) external to BAHAR, appropriate comparison or design, observation period, adherence and loss to follow-up; retain alternatives to causal effects, baseline balance and unintended burden. Report plausible rival explanations.
- **Never fabricate longitudinal results** from synthetic test records or count finished checkboxes as educational effectiveness.

## E. Privacy, humanity and child safeguarding

- Public adult **in-memory worksheet** is not enrolment in a human-subject study, not a server-side consent event and not proof of safeguarding.
- For minors, require an approved process determining age classification, verified guardian authority, age-appropriate voluntary learner assent or reviewed exceptions and objection/withdrawal rights. Avoid collecting ID/DOB documents in public repositories; minimize necessary proof retention.
- Secure private processing only after tested account/subject isolation, MFA for staff access, append-only consent/revocation history, explicit purpose codes (assessment, guardian visibility, research, communications), non-retaliatory withdrawal and audit redaction.
- Separate educational formative information from diagnosis, therapy, selection and high-impact decisions. Human review must not be claimed to exist where no qualified reviewer actually reviewed a case.

## F. Research data and statistical analysis plan (pending study-specific preregistration)

Before any recruitment: dictionary of variables and qualitative codes, pre/post hypotheses, target population and exclusions, denominators, recruitment feasibility, model/power/precision justification, missingness patterns, planned subgroup analyses, uncertainty estimates and analytic software versions. Version control only de-identified, consent-appropriate analysis metadata, never raw pupil cases. Review attrition, DIF/fairness, accessibility and participant burdens. Public reports must include **limitations and all non-confirmatory outcomes**, with a documented protocol-deviation log and independent statistical check.

Evidence-quality hierarchy:
- **Level 0:** narrative prototype / code green / product page (no empirical scientific claims).
- **Level 1:** transparent construct/content/rubric mapping and expert feedback (qualitative development evidence only).
- **Level 2:** ethics-approved pilot response-process/feasibility work, explicit uncertainty and negative cases (narrow formative claims).
- **Level 3:** independent, population/use-specific fit-for-purpose empirical evidence plus reproducible analysis, fairness/safety review (scoped claims, not unrestricted validation).
- **Level 4:** independent replication in new contexts and monitored consequences; changes in versions or context require renewed review.

These levels are an **internal tracking rubric** and are not certification categories awarded by AERA/APA/NCME, ITC or COSMIN. Approval must also clear all 12 applicable gates; no numeric level automatically permits protected data processing.

## G. Review board, signatures, outputs and launch pathway

Minimum roles, subject to governance agreement: a psychometric/methodological reviewer without conflict (RCAS if scored), a bilingual language-adaptation reviewer, an educational practitioner with case judgement expertise, a child safeguarding/ethics adviser for under-18 work, accessibility/data protection reviewer, and independent statistician for any quantitative effectiveness or score claim. Record documented acceptance, recusals, competence and conditional approvals; **do not invent identities**.

Required output per claim: `CLAIM-SCOPE.md`, versioned construct and item/rubric map, approved ethics/consent pack, preregistration reference, study dataset handling/de-identification plan, analytic report, fairness review, limitations and negative case log, immutable evidence bundle digest, independent board decision, expiry and continuous monitoring/withdrawal plan.

**Operational green state today:** existing low-risk public explanatory content, browser-only RCAS reflection, and adult-oriented BAHAR action worksheet can remain available with clear limitation notices.  
**Operational red state today:** private under-age learner submissions, diagnostic/normative interpretation, persistent private reports, professional validation badges, any claim of proven efficacy, and gated paid psychometric interpretation.

## H. Integration with one luxury design standard

All bilingual consent, research invitation, participant information, forms, dashboard summaries, reports, certificates and eventual journal articles must inherit the **canonical Persian golden mother-symbol**, identity/brand-governance and frozen `foundation/DESIGN-SYSTEM.md` tokens: royal obsidian / calibrated gold / warm ivory; typography legible in RTL Persian and LTR English; WCAG-oriented keyboard, semantic/contrast and reduced-motion behaviour. Appearance cannot outrank explicit scientific uncertainty. No faux university seals, award marks, DOI/ISSN or "internationally validated" badges. Source language and translation revision visible on relevant outputs.

## I. Exact stop/go matrix for the site

| Capability | Current evidence | Allowed |
|---|---|---|
| Public Golden Talent method and research-status disclosure | Public, nonindividual educational content | YES |
| Adult RCAS 28-prompt browser reflection with no upload or scores | Existing client-side educational interaction and code tests | YES, explanatory |
| Adult BAHAR browser formative plan/evidence/review, no upload | Independent browser and package CI | YES, explanatory |
| Persistent minor assessment/guardian records and reports | Live schema/provenance/ethics unresolved | **NO** |
| Claims of psychometric validity/reliability/invariance | No user-supplied independent empirical dossier | **NO** |
| Future professional interpretation and paid research-backed reports | Requires identified reviewer, approved evidence and access authority | **NO** |

**Authorisation record:** methodology and acceptance criteria are specified in this document. **Actual studies and independent validation decisions have not been conducted.** Do not mark `VALIDATED_FOR_SPECIFIED_USE` on the basis of this protocol or software testing.

### Primary standards and methodological references

1. AERA, APA & NCME (2014). *Standards for Educational and Psychological Testing*. https://ncme.org/resources/books/testing-standards/
2. International Test Commission (2017). *Guidelines for Translating and Adapting Tests*, 2nd ed. https://www.intestcom.org/page/14
3. COSMIN initiative. *Measurement properties / content validity and study design resources*. https://www.cosmin.nl/
4. Prinsen et al. (2018) and updated systematic review guidance (2024): https://pubmed.ncbi.nlm.nih.gov/39198348/

---
**Review state: DOCUMENTED PROTOCOL / EVIDENCE-NOT-COLLECTED.** All thresholds, recruitment and sample sizes must be finalized prospectively by the actual independent research team and competent review board before beginning studies.
