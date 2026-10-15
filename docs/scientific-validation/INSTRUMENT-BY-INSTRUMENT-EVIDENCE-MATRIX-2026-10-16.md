# Instrument-by-Instrument Evidence Matrix and Validation Programme
**Date:** 2026-10-16  
**Status:** Research protocol candidate — no empirical participant data, no ethical approval claimed, no instrument scientifically certified  
**Governed by:** foundation/MASTER-ECOSYSTEM-ROADMAP.md; foundation/DESIGN-SYSTEM.md; docs/scientific-validation/P1-RELEASE-GATES-2026-10-16.md; frozen bilingual master SEO standard.

## 1. Verified references and applicable scientific standards

The 2014 AERA/APA/NCME *Standards for Educational and Psychological Testing* address defensible interpretations and uses of tests, including fairness, accessibility and digital delivery. The International Test Commission's *Guidelines for Translating and Adapting Tests*, second edition (2017), require treating translation/adaptation as a systematic evidence process rather than a lexical copy. The ITC/ATP *Guidelines for Technology-Based Assessment*, updated July 2025, address technology-based validity, fairness, accessibility, security and privacy.

Primary URLs:
- NCME/AERA/APA testing standards: https://ncme.org/resources/books/testing-standards/ and https://www.testingstandards.net/open-access-files.html
- ITC adaptation second edition: https://www.intestcom.org/page/14 and https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf
- ITC/ATP technology-based assessment updated July 2025: https://www.intestcom.org/page/16

**Application rule:** These are standards and guidance, **not external validations of Golden Talent, RCAS or BAHAR**. The scientific investigation must establish evidence for each specific version, target population, language, purpose and intended inference.

## 2. Exact repository state inspected

`platform/golden-talent-instrument-registry.v1.json`: registry_version 2026-10-14.1, global scientific status PREVALIDATION, no normative talent scores, no total talent score, no automatic career prescription, and no verified scoring release. RCAS-CORE is a 28-item browser-only student self-reflection preview. RCAS-O1 is a separate parent/teacher observation preview. D1–D6 bank counts in registry: 24, 24, 24, 22, 28, 20, totalling 142 proposed book items; **question texts/version hashes not yet verified for web publication**. `platform/bahar-engine.mjs` is PREVALIDATION and explicitly non-diagnostic.

`api/golden-talent.php` declares private assessment submission, professional release, and longitudinal BAHAR writes inactive. Therefore no prospective user sample or psychometric observation can be inferred from code presence, unit tests or web traffic.

## 3. Claims and evidence requirements per instrument

| Component | Present purpose (non-diagnostic) | Allowed now | Scientific evidence to gather before expanded claim |
| --- | --- | --- | --- |
| Golden Talent overview | Integrate contextual and multisource development evidence | Educational orientation; human-led next-step suggestions with limitations | Construct map; expert source review; triangulation rules; response-process interviews; bias/adverse consequences; reliability of human judgments if judgments are scored; reproducible revision records |
| RCAS-CORE (28 items; A–G) | Structured student self-reflection and contextual inquiry | Learner-selected priorities and next inquiry; no norm, rank, cutoff or automated route aptitude | Item-by-construct mapping; relevance/comprehensibility review; cognitive interviews; response scale/missingness; digital/linguistic accessibility; dimensionality **only if a score-based latent structure is claimed**; test information/precision and invariance when justified |
| RCAS-O1 | Parent/teacher observational evidence | Unscored observation prompts, with distinct purpose and respondent role | Role-specific expert review, inter-rater agreement **if numerical judgments are used**, observation conditions, bias analysis and triangulation; guardian/teacher access and consent |
| D1–D6 deep bank (142 proposed items) | Contextual deep-domain exploration, not validated psychometric instruments | Editorial scaffolding only; NOT live published/scored versions | Verify full text against book source; freeze item/wording/language/version checksum; expert content review and pilot; response-process evidence; missingness and precision; independent validation for any scored use |
| BAHAR 30-day starter/weekly cycle/eight-week compass | Formative learning planning, observation, feedback and revision | Educational templates and human-reviewed qualitative development record when protected | Usability/accessibility; fidelity of completion and review; observation quality; feasibility/acceptability; attrition/missing data; repeated-measure interpretation, confounders and harms; outcome evidence **only for specific efficacy claims** |
| Golden Path outputs | Human-supported pathway recommendations from evidence | Provisional possibilities and reversible decisions after qualified human review | Decision-trace audit, correctness/reasonableness of interpretation, fairness of recommendations, prospective consequences, confidence/limitations and reviewer calibration |

## 4. Staged research protocol — execute in evidence order

**R0 — Claim register and population definition.** Record exactly what each item and report purports to mean, what decisions it must *not* drive, age/educational segment, locale, modality, target use and potential harms. Define the unit of analysis: learner, observer, episode, weekly cycle, or human judgment. No universal talent measure is assumed.

**R1 — Source provenance and content validation.** Reconcile each item text against approved book/research sources; create immutable content hashes, construct-mapping tables and rationale. Use independent subject experts and target-user language/accessibility review. Record disagreements rather than replacing them with unreported consensus.

**R2 — Response-process and digital pilot.** Use cognitive interviewing and usability/accessibility studies with appropriate age groups, Persian/English participants and informed guardian permission/child assent when applicable. Examine interpretation of items, ambiguity, distress risk, response options, device behavior and missingness. Pilot outputs remain labelled RESEARCH or PILOT.

**R3 — Empirical design and precision plan.** Pre-register primary hypotheses, sample recruitment, inclusion/exclusion, independent comparison methods, statistical analysis and missing-data strategy. Determine sample sizes from the intended estimation precision and feasible analysis, not from arbitrary 'minimum N' promises. Retest/stability methods apply only to constructs expected to remain stable; do not mechanically apply Cronbach's alpha to a formative log or human-action cycle.

**R4 — Psychometric evidence when a measure is actually claimed.** For proposed scored subscales, investigate response distributions, item functioning, intended dimensionality, justified reliability/precision, standard error/uncertainty, fairness or differential item functioning and language adaptation, where design supports them. Avoid spurious aggregate talent composites across unrelated constructs.

**R5 — Formative-process evaluation.** For BAHAR and developmental interventions, examine implementation fidelity, support exposure, participant burden, retention, observed progress criteria and alternative explanations. Do not imply causal programme effectiveness from before/after self-report alone.

**R6 — Independent interpretation and adverse-impact review.** Review sample reports for overclaiming, stigma, accessibility, gender/socioeconomic/language bias, child safeguarding, user comprehension, and honest negative/unknown findings. Publish limitations. A reviewed descriptive report is not automatically a validated score.

**R7 — Narrow, auditable release.** Freeze instrument content, scoring logic if applicable, consent notice, scientific report template and scientific dossier reference; define valid population/use, expiry and re-review triggers. First allow only defensible specified claims in server-enforced conditions. Tests of the software remain a separate release dimension.

## 5. Hard constraints for outputs and dashboards

1. Never show 'scientifically validated', norm, percentile, IQ-like score, definitive talent or career designation without independent purpose-specific empirical evidence.
2. Distinguish `PREVALIDATION` research tools from `PILOT` and `VALIDATED_FOR_SPECIFIED_USE` **for exact population/use/language**, not an entire site.
3. Missing, not applicable, inaccessible or refused response is not zero and must not be framed as learner weakness.
4. Preserve provenance and temporal context: reports describe *what was observed, when, by whom and under what conditions*, not intrinsic fixed traits.
5. Protected reports must be version-pinned, subject-scoped, separately reviewed and revocable; researcher exports require another purpose-specific consent and privacy boundary.
6. Offer accessible Persian RTL and English LTR templates with equivalent construct meaning. Human review is required for translated interpretive labels, not just copied interface text.
7. Research participation is voluntary; marketing upgrades must not present paid review as a necessity induced by low or fabricated scores.

## 6. Explicit scientific release checklist (not yet passed)

- [ ] Full source material and legal/research ownership trace verified
- [ ] Complete item banks and version/content SHA-256 snapshots verified
- [ ] Construct definitions and intended uses approved independently
- [ ] Ethics and safeguarding protocol plus guardian/assent design reviewed
- [ ] Accessibility and language/translation studies completed
- [ ] Cognitive interviews and pilot results documented
- [ ] Appropriate empirical study / programme evaluation preregistered
- [ ] Relevant reliability/precision and interpretation evidence reported with uncertainty, if applicable
- [ ] Fairness, bias and negative consequence review documented
- [ ] Independent scientific reviewer signs the specific use dossier
- [ ] Prototype-to-production security/API/dashboard gates separately passed

**Scientific decision today:** PREVALIDATION remains correct. A successful PHP/JS/MySQL test certifies no psychometric property, no participant outcome and no research ethics approval. No new claims are authorised.
