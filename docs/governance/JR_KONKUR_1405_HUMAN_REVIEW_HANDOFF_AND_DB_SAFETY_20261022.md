# JR Admission Intelligence — 1405 source-review handoff and DB safety ledger
**Recorded:** 2026-10-22 | **Scope:** source control and offline human review preparation.

## Evidence and remaining official-data gate
The repository's 1405 source manifest inventories six owner-supplied Sanjesh
PDF fingerprints and **2,412 PDF pages**. Fingerprints/page counts were
reported as checked previously. The full tables, row geometry, programme codes,
capacity figures, effective amendments and official-rule coverage have **not**
received independent human page-by-page approval. Existing source text and
five-digit tokens do not constitute verified programme-location records.

The deterministic metadata-only reviewer queue is:
`node scripts/konkur-1405-review-queue.mjs --check`.
For an offline, human-editable CSV packet on an authorised workstation:
`node scripts/konkur-1405-review-queue.mjs --csv > 1405-review-queue.csv`.
It includes original PDF SHA-256, guide category and page ordinal, with blank
human-review fields; all 2,412 rows begin `UNREVIEWED`. It intentionally
excludes the private Drive file IDs, PDF text, student data and any signed
approval. Editing the CSV is **not** sufficient to publish; a separate
authenticated human source comparison, signed and independently checked
acceptance, and server-side rule/edition/amendment verification are required.

## Observed Bertina schema nuance
The owner-provided phpMyAdmin SQL export reviewed in
`JR_KONKUR_BERTINA_STRUCTURE_SNAPSHOT_REVIEW_20261021.md` contained
**all eight 003e catalogue table names**, with column-name sets matching
the proposed source DDL; it also contained four existing admission simulation
tables and existing `eco_exam_providers`, `eco_exam_series`, and
`eco_exam_results`. This **snapshot** supersedes earlier limited screenshot
checks for the objects it contains. It is not a current authenticated
schema/type/FK/index/data-content audit.

**Do not recreate the eight 003e tables or apply either competing 003f
migration from source assumptions.** Reuse-first: run owner-controlled
read-only `information_schema` checks and existing migration-ledger
reconciliation, confirm restore-tested backup, resolve semantic overlaps and
only then consider any genuinely missing entity or column. No source change
here creates, alters, inserts, deletes or approves records in Bertina.

## Completion criteria before official release
- Human visual comparison of original 1405 PDF tables and amendments.
- Fingerprinted edition, reliable printed/PDF page mapping, human dual review
  for ambiguous row/condition/capacity and an audit trail.
- Live source-approved rows, rule completeness, account/guardian consent
  gates for any private records, deletion and retention controls.
- Admission probability **remains disabled** without consented outcomes,
  out-of-sample calibration, subgroup review and drift monitoring.
- Preserve the existing bilingual, no-storage research calculators, practice
  notebook, local CSV export and preliminary selection draft. Their operation
  requires no additional database tables.

**Status:** metadata-only preparation, not production import, no published
source-approved programme records certified by this work, no deployment.

## Release-candidate acceptance classification

`scripts/konkur-product-readiness.mjs` is a **nondeploying, source-only**
gate. It verifies that the bilingual public worksheets and independent local
utilities exist, remain wired in both languages, that the research lab is
explicitly not official/predictive and that neither candidate-score database
proposal has been authorized. It classifies the no-storage research UX as
`SOURCE_CONTRACTS_READY_PENDING_CI_AND_OWNER_RELEASE` **only** when these
code-level checks pass. That classification does **not** certify live security,
network reachability, SQL state, vendor PDFs, admission-rule completeness,
statistical admission probability or scientific psychometric validity.

The separate outcome
`BLOCKED_PENDING_INDEPENDENT_HUMAN_AND_LIVE_DATA_ACCEPTANCE`
is mandatory for full official admission service. No CI test or synthetic
MariaDB fixture may change it to ready without independent scientific
and operational acceptance. A safeguarded, owner-operated research-experience
release may be assessed separately using the existing GitHub/Bertina pathway.
