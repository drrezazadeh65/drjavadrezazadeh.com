# JR Konkur — Existing Bertina Mother Database: Modular Expansion Design
**Version:** 1.0 (source-ready / not applied)  
**Date:** 2026-10-20  
**Canonical database:** `drjavad1_store` · **Branch:** `migration/bertina-linux6`  
**Directives:** [V2.0](JR_EDUCATIONAL_INTELLIGENCE_MASTER_DIRECTIVE_V2_20261020.md) · [V2.1](JR_EDUCATIONAL_INTELLIGENCE_MASTER_ADDENDUM_V2_1_20261020.md) · [V2.2](JR_KONKUR_ADMISSION_SIMULATOR_MASTER_DIRECTIVE_V2_2_20261020.md)  
**Status:** **PROPOSED, SOURCE LEVEL ONLY. NO DATABASE MIGRATION OR PRODUCTION DEPLOYMENT EXECUTED.**

## 1. Decision

Extend the **existing 253-table modular mother database** with one strictly bounded `003e` *official-admissions knowledge module*. The reported 253-base-table count is an October 17 owner-observed snapshot, **not fresh authenticated evidence** that all tables still match the repository definitions. No new database, second student login, replicated guardian system, duplicate institution master, separate CMS, or migration of personal scorecards is authorized.

This extension is designed for **six current Sanjesh 1405 guides plus any future guides, corrections, translations, special-admission supplements and subsequent admission cycles**. Document IDs, groups, page counts, revision numbers, source version and cycle are data, not columns or hard-coded limits. Ten more documents require additional document records, **not ten tables or schema redesigns**.

## 2. Verified repository reuse and non-duplication

| Existing canonical object | Reuse | New boundary required |
|---|---|---|
| `customer_accounts` | Approved reviewer / import operator account references only | No candidate accounts or new authentication here |
| `eco_schema_migrations` | Existing migration journal after an authorized, fully verified run | Do not write a success row before operator acceptance and schema-drift checks |
| `eco_institutions` | Link reviewed institution identity by `institution_id` | Keep source-exact institution name as an immutable annual snapshot until reliable crosswalk |
| `eco_object_refs`, `eco_object_versions` | Optional storage provenance for already approved and secured original PDF objects | Never place private Drive copies or full copyrighted PDF content in a public web directory |
| `eco_pathway_options`, `eco_education_decisions`, `eco_decision_explanations` | Later consent-scoped candidate decision work | No unaudited candidate storage or an unrelated selection-list identity table |
| `eco_subjects`, `eco_consent_records`, `eco_advisor_assignments` | Later student/guardian/adviser authorization | Private scorecards are outside the **public knowledge** module |
| `eco_talent_evidence`, `eco_bahar_portfolios` | Existing research and longitudinal workflows unchanged | Do not use Konkur capacities as talent evidence |
| `assets/js/jr-choice-studio-v1.js` and `jr-konkur-*-v1.js` | Existing free preference comparison and preliminary ordered list | Connect only verified catalogue records in a separately authorized read-only API |

The [scientific acceptance ledger](INTEGRATED_GOLDEN_TALENT_RCAS_BAHAR_CHOICE_V110_RELEASE_REVIEW_20261019.md) and [mother database governance](MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md) remain binding. Earlier PostgreSQL prototype migrations under `platform/db/migrations/` are **not** MariaDB production instructions.

## 3. Eight additive admission-only tables

| Table | Function | Default safety |
|---|---|---|
| `eco_admission_cycles` | National admission year/scope and activation metadata | `DRAFT` |
| `eco_admission_documents` | One source version per guide, correction or notice; fingerprint, effective date and supersedes link | `DRAFT` |
| `eco_admission_document_pages` | PDF-vs-printed page, checksum and human table check | `UNREVIEWED` |
| `eco_admission_import_batches` | Reproducible extraction batches and import provenance | `STAGED` |
| `eco_admission_import_rows` | Ambiguous text/OCR candidates, not catalogue entries | `UNREVIEWED` |
| `eco_admission_programme_offerings` | Annual programme-location revisions, capacity and university/campus snapshot | `DRAFT` |
| `eco_admission_offering_conditions` | Explicit source-page-backed quota, tuition, geographic, interview and service conditions | `DRAFT` |
| `eco_admission_rule_versions` | Versioned deterministic candidate-condition predicates after separate human QA | `DRAFT` |

**Not needed now:** new scorecard/identity/consent/finance tables. The mother database already contains reusable identity, academic and decision records. A later secure draft workflow may require minimal additional *columns or association objects*, but only following an authenticated, exact-schema comparison and access-control design.

## 4. Parent→child relations and integrity

`cycle → documents → pages`; `document → import batches → unverified import rows`; `cycle + page + optional eco_institutions → versioned programme offerings → source-linked offering conditions`; `cycle + page + optional offering → reviewed eligibility rule versions`.

Never collapse guide **publication authority** into parser accuracy, or `SOURCE_MATCHED` staging into a public verified record. Cross-cycle consistency, amendment precedence and duplicate grouping must be checked by the importer and verified query layer; relational FKs alone cannot establish a coherent year/source.

Source page is mandatory for an offering; the full original PDF SHA-256 and official version must be retained in its document record. An amendment must insert a **new revision** with a supersedes link, rather than overwrite a published row. The same five-digit token may appear in a phone number, example or another admission track; neither regex nor source-file name proves it is a programme-location code.

**Public catalogue activation predicate (all required):** approved cycle and offering with verified approved reviewer/time, matching admission cycle across parent document and page, approved source document not superseded by effective amendment, independently reviewed source page, approved relevant conditions and exact row fingerprint, and explicit rule/version acceptance. If any prerequisite is absent or incompatible, API response must be **insufficient information / official review required**, never confirmed eligibility. No view/route automatically exposes the newly created tables.

## 5. Owner-operated SQL order (do not run blindly)

1. On the Bertina control panel, confirm target `drjavad1_store` and take a **restorable, independently tested full backup**. Preserve existing commerce, 253-table historical schema, consent/audit and publishing tables.
2. In phpMyAdmin SQL, run the **read-only inventory**: [20261020_konkur_catalog_readonly_preflight.sql](../migrations/20261020_konkur_catalog_readonly_preflight.sql). It queries only `information_schema`; never sends customer/order/scorecard data. Verify engine, schema context, existing proposed table names, FK column types, UTF-8 behaviour and existing legacy collation. The expected result may differ from the October 17 snapshot.
3. STOP if a proposed table name already exists or if dependencies are missing/drifted. `CREATE TABLE IF NOT EXISTS` can silently hide incompatible old schema; compare `SHOW CREATE TABLE` with the proposed file first. Resolve any conflict by a new approved forward migration, **not** drop/recreate.
4. Only after full review and owner authorization, use the **single proposed additive DDL**: [003e_admission_knowledge_catalog_PROPOSED.sql](../../database/unified/003e_admission_knowledge_catalog_PROPOSED.sql). It creates **only eight new tables** in the existing mother DB, with explicit `utf8mb4_unicode_ci`. No `ALTER`, `DROP`, `INSERT`, `UPDATE` or `DELETE` is included.
5. Verify eight tables, indexes, foreign keys, row schemas and collation using [read-only postflight SQL](../migrations/20261020_konkur_catalog_readonly_postflight.sql); execute a controlled backup/restore verification and record the signed migration identifier/checksum in the existing `eco_schema_migrations` ledger **only after acceptance**.
6. In a *separate* audited data-import phase, register the existing six PDFs with their original SHA-256/page count from `platform/konkur-1405-sources.json`. Their original PDF fingerprints are checked, but programme tables remain `NOT_COMPLETED`; no publication should occur yet.
6a. **Optional source-only seed**, after schema checks and separate owner approval: [six original-PDF draft entries](../migrations/20261020_konkur_1405_sources_DRAFT_seed_PROPOSED.sql) use their verified PDF SHA-256/page count from the existing manifest. They are inserted as `OWNER_CONFIRMED` document records, **not** `QA_APPROVED`. Subsequent ten or more booklets use this same table and new document codes. Do not run this seed before its own authorization.
7. Reconcile real programme tables visually page-by-page and enter provisional rows into staging. Perform two independent checks for ambiguous numbers, code uniqueness, grouping, capacities, special conditions and amendments. Approve only matching rows and the rule source evidence. Only then expose narrowly scoped public read-only catalogue results to Choice Studio.

**Operator instruction:** Do not paste the proposed DDL into phpMyAdmin until the preflight output and a tested backup are available; no execution permission follows simply from this source commit.

## 6. Expansion to 10+ additional guides and subsequent years

New PDFs: insert new `eco_admission_documents` versions plus page/batch/row and (when verified) offering records. A **foreign-languages guide**, special teacher-training announcement, records-only additional guide, correction or institutional appendix uses the *same tables*. `document_kind`, `examination_group_code`, and `scope_code` are extensible vocabularies rather than one column per guide. Per-year programme codes are kept as strings (leading zeros preserved) and keyed by cycle+group+track+code+revision. No historic year shares eligibility rules with the next year by default. Historical comparisons require compatible group/quota/track definitions and separate source citation.

**No automatic admission-probability feature:** Only after independently validated representative data, calibration and subgroup/out-of-sample review.

## 6b. Separate `003f` scorecards/drafts proposal — not a dependency for official programme search

A later additive design exists at [003f_candidate_exam_data_PROPOSED.sql](../../database/unified/003f_candidate_exam_data_PROPOSED.sql). It proposes **nine** provider/version-aware exam and private candidate-draft tables, reusing `customer_accounts`, `eco_subjects`, `eco_consent_records` and the `003e` official admission cycle/offering tables. It **must not** be installed merely because `003e` has passed public metadata verification.

`003f` is a **separate, higher-risk P2 capability**: it concerns identifiable candidate self-reports, potential minors, scorecards, consent and adviser access. The original free, browser-memory selection worksheet and public official-programme catalogue do **not** depend on its installation. The owner-operated [003f read-only preflight](../migrations/20261020_konkur_scorecards_readonly_preflight.sql) must first confirm the real Bertina schema, along with a tested restore, specific privacy notice, guardian/subject permissions, deletion and expiry procedures, and an authorized PHP record-level API. None of these operational gates is certified by the presence of SQL source alone.

Official national-exam scores, provider mock-exam TAZ, school grades and ranks must be stored with provider, year, comparable population and metric-definition provenance; they are **not** interchangeable by a default mathematical formula. Their database rows must never be used to infer admission probability without independent calibration evidence.

`003f` can be syntax/FK-tested on **disposable MariaDB 10.11 with synthetic data only**, alongside `003e`; it remains blocked from Bertina production unless a separate, explicit owner approval follows the privacy and account-isolation acceptance review. No private candidate records have been created or imported during this source-only work.

## 7. Acceptance gates

- **Source:** six official PDF fingerprints and page counts already recorded, **programme code/capacity source-page QA still incomplete**; future supplements/corrections require their own versions.
- **SQL:** read-only preflight; migration drift audit; InnoDB/utf8mb4 FK validation; rollback via tested restore; no private tables touched.
- **Importer:** staging never equals verified; impossible cycle/page relationships rejected; duplicate/changed rows recognized as amendments.
- **API:** only human-approved, current-year official rows; no abandoned revision, expired rule, unknown-source code or wrong-cycle eligibility.
- **UX:** original five Choice Studio criteria preserved; no fabricated rank, odds, ability score or admission promise.
- **Production:** GitHub source commit and CI checks are distinct from running SQL, inserting 1405 records or deploying the website. **All these production steps remain pending.**
