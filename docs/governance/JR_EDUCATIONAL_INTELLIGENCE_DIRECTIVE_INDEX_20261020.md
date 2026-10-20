# JR Educational Intelligence — Directive Index and V2.2 Implementation Priorities

**Date:** 2026-10-20  
**Branch:** `migration/bertina-linux6`  
**Scope:** Planning and source inspection only. **No production deployment or database migration.**

## Authoritative, additive directive chain

1. [V2.0 — Educational Intelligence Master Directive](JR_EDUCATIONAL_INTELLIGENCE_MASTER_DIRECTIVE_V2_20261020.md)
2. [V2.1 — Future-Ready Pathways and Longitudinal Development](JR_EDUCATIONAL_INTELLIGENCE_MASTER_ADDENDUM_V2_1_20261020.md)
3. [V2.2 — JR Konkur Admission Simulator](JR_KONKUR_ADMISSION_SIMULATOR_MASTER_DIRECTIVE_V2_2_20261020.md)

V2.2 extends V2.0 and V2.1; it does not replace their scientific, privacy or architectural requirements. The [existing scientific/Choice Studio integration review](INTEGRATED_GOLDEN_TALENT_RCAS_BAHAR_CHOICE_V110_RELEASE_REVIEW_20261019.md) and [mother database master plan](MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md) remain authoritative constraints.

## Official 1405 source-of-truth policy — owner confirmation (20 October 2026)

**Primary regulatory authority:** سازمان سنجش آموزش کشور (`sanjesh.org`). The six 1405 guidebooks in the owner's connected Drive folder are treated as official source documents; no non-official source can override their regulations.

**Machine extraction is separately auditable:** Official publisher identity does not verify text/table extraction, source-page matching, programme codes, capacities or transcription. Store document version, original page, verification status and page-level traceability. Do not mark programme rows as verified without checking them against the official PDF.

**Amendment precedence:** Subsequent official notices, corrections and superseding documents from the same competent official authority may change applicable rules. Maintain effective dates and source versions. Missing foreign-languages guide and applicable amendments remain explicit coverage gaps until verified.

**Release boundary:** No fabricated programme records, hard-coded choice limits or admission probabilities; source-reviewed facts only in authoritative eligibility outputs.

## Source-level non-duplication matrix — initial audit

| V2.2 requirement | Existing verified repository component | Current status | Gap and next action |
| --- | --- | --- | --- |
| Decision-support interface | `assets/js/jr-choice-studio-v1.js`, `assets/js/jr-choice-feedback-v1.js` | Existing five-factor comparison, in-memory preferences, sensitivity/reflection, printable feedback | Extend the existing mount with programme exploration; preserve original comparison and free use |
| Scientific evidence and boundaries | `platform/golden-talent-engine.mjs`, `platform/golden-path-synthesis.mjs`, RCAS/BAHAR modules | Source implementation at research/prevalidation level; not production-validated admission eligibility | Reuse provenance and reviewer concepts, but never infer admissions outcomes from talent evidence |
| Unified identity and educational data | `database/unified/003a_education_longitudinal.sql`, `003c_assessment_scoring.sql`, `003d_golden_talent_bahar.sql`, existing PHP API | Schema files and API present; live Bertina migration state not independently authenticated in this audit | Inspect live information_schema, existing records, consent, permissions and backup/restore before proposing any additive DDL |
| Official 1405 corpus | Owner-provided Google Drive folder named in V2.0/V2.2 | Six reference PDFs identified by owner; individual contents, provenance and corrections not yet fully verified in this audit | Build official-source inventory, page-anchored extraction and double-check corrections before authoritative eligibility |
| Annual programme-location catalogue | Not confirmed in inspected core Studio/educational schema files | No production-ready verified catalogue established | Extend shared educational knowledge layer minimally after verified official source and duplicate audit |
| Deterministic admission eligibility | Existing scientific routers are not admission rules | Not implemented as verified official admission rules | Add separately versioned rule contracts within Studio's shared decision-support architecture, default to insufficient/verification-required |
| Candidate scorecard and private drafts | Existing accounts, educational records, student dashboard | Existing general infrastructure; candidate-specific authorization and retention not verified | Define minimal fields per cycle, record-level access, minors' consent; manual entry first, uploads later |
| Ordered selection list | Existing Choice Studio supports preference comparison and reordering | Not an official programme-code selection list | Extend UI to preserve exact user order; official limit only from verified annual regulations |
| Reports and professional review | Existing Choice feedback, consultation and review concepts | Partial; official Konkur report and exact-version adviser approval not verified | Extend printable report; link to authorized review only after identity/ownership/version audit |
| Statistical admission probabilities | No validated admission-outcome model established | Blocked by evidence requirements | Keep disabled; never fabricate percentages or extrapolate from programme capacities |

## Execution sequence and release gates

**P0 — Now, mandatory:** Verify six 1405 PDF documents and missing foreign-languages/corrections; identify publisher, edition, page numbers, legal status, checksum and amendment precedence. Inventory existing APIs, routes, database and UI to prevent duplicates. Specify Evidence Passport and cycle/version contracts. No fabricated official codes.

**P1 — First independently useful release:** Extend existing Choice Studio with manual candidate context, official programme search/filter, four-state eligibility, preference-ordered selection list, duplicate/code warnings and printable source-cited report. Start with **only verified** programme groups and rules. All uncertain cases remain visibly unresolved.

**P2 — Subsequent release:** Source-aware what-if comparisons; authorized private draft persistence and student dashboard linkage after permission, CSRF, consent, retention and restore tests; optional verified adviser review of exact report version.

**P3 — Expansion:** Historical annual comparisons, career crosswalks and exploration activities only with appropriate official provenance and human review.

**P4 — Research-gated:** Statistical admission outlook, calibration and subgroup analysis only with sufficiently representative datasets and independently validated methods. Disabled by default.

## Required acceptance evidence

- Data: exact 1405 source pages, correction precedence, source fingerprints, programme code uniqueness and year isolation.
- Engine: deterministic four-state eligibility, missing input, contradictory amendments, special conditions and invalid codes.
- UI: keyboard/touch reorder, screen readers, RTL mobile/tablet/desktop, printable order and provenance.
- Security: per-account ownership, minors/guardian consent, CSRF, noindex/no-store, retention and audit.
- Regression: Choice Studio five criteria, Golden Talent, RCAS, BAHAR, consultations, commerce, SEO and release controls.
- Production: authenticated live verification is distinct from passing source/CI tests; owner-controlled deployment only.

**Next action:** complete P0 evidence/source and duplication audit before implementing authoritative 1405 eligibility. No production-readiness claim is made by this index.
