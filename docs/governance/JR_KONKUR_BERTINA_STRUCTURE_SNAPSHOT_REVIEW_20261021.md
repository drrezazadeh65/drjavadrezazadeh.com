# JR Konkur — Bertina Schema Snapshot Review (2026-10-21)

**Evidence:** Owner-supplied phpMyAdmin SQL export of `drjavad1_store`, stored privately in the owner's Google Drive (in the official-guide folder). **This document is a metadata-only inventory; it contains no exported SQL data, account identifiers, session tokens, password hashes, orders, or credentials.**

## Verified from the exported file, not from a live DB connection

- SQL dump: phpMyAdmin 5.2.3; MariaDB 10.11.19 (per the dump header).
- File size: **2,153,098 bytes**; SHA-256: `368b5b651a74360d968e8aa5b28abbd0ab654dda3b36e79febb8c2bb06af7d5c`. This fingerprint identifies this historical snapshot, **not** the current live database.
- **270 distinct `CREATE TABLE` statements**.
- **35 `INSERT INTO` statements**; therefore this is **not** a structure-only export. Data statements include authentication, account, commerce and operations tables. **Never push the original dump, a clone, or extracted row values to GitHub or a web directory.** Restrict access to the private original and use metadata-only derivatives for source control.
- All **eight** table names proposed by `database/unified/003e_admission_knowledge_catalog_PROPOSED.sql` are present in this export. Their **column-name sets** were compared with the version-controlled proposal and match exactly. This is not yet an exhaustive column-type/index/foreign-key/default-value drift audit.
- **No `INSERT INTO` statements for any of these eight catalogue tables** occur in the exported dump. This establishes only the exported SQL contents; it does not independently establish live row counts.
- Four other pre-existing admission tables also appear: `eco_admission_predictions`, `eco_admission_preferences`, `eco_admission_simulations`, `eco_admission_simulation_events`. Their continued use requires separate contract review.
- The four proposed `003f` provider-neutral tables `eco_exam_score_providers`, `eco_exam_score_events`, `eco_exam_scorecards`, and `eco_exam_scorecard_measures` are **absent** from this export. Earlier `eco_exam_providers`, `eco_exam_series`, and `eco_exam_results` tables **do exist** and must be reconciled before any `003f` migration or scoring integration.

## Catalogue table and column mapping (snapshot)

| Existing table | Columns in export | Assessment |
|---|---:|---|
| `eco_admission_cycles` | 8 | 003e column names match |
| `eco_admission_documents` | 18 | 003e column names match |
| `eco_admission_document_pages` | 10 | 003e column names match |
| `eco_admission_import_batches` | 8 | 003e column names match |
| `eco_admission_import_rows` | 14 | 003e column names match |
| `eco_admission_programme_offerings` | 26 | 003e column names match |
| `eco_admission_offering_conditions` | 10 | 003e column names match |
| `eco_admission_rule_versions` | 16 | 003e column names match |

## Mandatory next steps (forward-only, non-destructive)

1. **Do not reapply `003e` blindly.** First use read-only `information_schema` preflight/postflight and compare full column types, indexes, foreign keys, charset/collation and migration ledger against the export and proposed DDL.
2. Confirm live counts for the eight catalogue tables using **read-only aggregate `COUNT(*)`**, not exported account records. Check whether the six official source PDF document rows have already been staged.
3. Verify a restorable encrypted backup and reconcile any drift before creating a migration. Do not run `003f` merely because its proposed script exists.
4. Stage six original 1405 Sanjesh source documents using versioned, fingerprinted metadata; no programme-code, capacity or condition record may be called verified without source-page review and applicable amendment checking.
5. Only after source approval and record-level QA, expose those catalogue rows through the existing read-only API. Do not infer admission probability or official eligibility from unchecked PDFs.
6. Maintain the complete SQL export **only in access-restricted backup storage**; source control should retain this redacted schema audit and migrations, never a dump containing real authentication/session/payment information.

**Boundary:** No SQL, migration, import, deletion or publication was performed on Bertina as part of this review. Earlier 2026-10-21 screenshot-only preflight observations are superseded **for this snapshot's table existence** by the owner-provided export, but the export does not attest to subsequent live changes.
