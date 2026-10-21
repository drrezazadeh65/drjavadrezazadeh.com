-- JR Konkur 1405 | Page-anchor staging for six ALREADY inventoried official PDFs
-- 2026-10-21 | SOURCE-ONLY PROPOSED DATA STEP. NOT EXECUTED AGAINST BERTINA.
-- Reuses existing 20261020_konkur_1405_sources_DRAFT_seed_PROPOSED.sql and the
-- platform/konkur-1405-sources.json verified PDF fingerprints/page counts.
-- Do not rerun PDF text extraction for this step.
-- Only creates blank, UNREVIEWED page anchors. NO extracted words, programme rows,
-- admission probabilities, approvals, changes to any existing rows, or publication.
-- Execution is conditional on owner-authorized live backup/preflight and source-match.
-- Safe to run more than once: unique (document_id,pdf_page_number) + NOT EXISTS.
-- Any absent/conflicting source is SKIPPED, never silently treated as verified.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
USE drjavad1_store;

INSERT INTO eco_admission_document_pages
  (id,document_id,pdf_page_number,page_review_state)
SELECT UUID(), d.id, digits.page_no, 'UNREVIEWED'
FROM (
SELECT 'SANJESH_1405_HUMANITIES' AS document_code, '1zN9cfFW8tDuYCy8qZAJUikq8NKw5hTjb' AS source_external_id,
  'dc53d8c1f61bfd2f9fcb6d8d1cf97ea134c46aa140e0ed7129c3a9f50b5b2d06' AS source_sha256, 582 AS verified_pdf_pages
UNION ALL SELECT 'SANJESH_1405_EXPERIMENTAL' AS document_code, '16Q_b-WE59-pWEteApAJxx0FxT5uLinR7' AS source_external_id,
  '4f273944c5770a137f12f32793ec7561c8410901a25ec68f6059535fe92d10a6' AS source_sha256, 664 AS verified_pdf_pages
UNION ALL SELECT 'SANJESH_1405_MATHEMATICS' AS document_code, '1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2' AS source_external_id,
  '515003f7dc758a9c90807c0a2174604604dca93e85985f5831ef35ebc5e1e389' AS source_sha256, 478 AS verified_pdf_pages
UNION ALL SELECT 'SANJESH_1405_ARTS' AS document_code, '1z2u4VKDSNBCjw403o9tqty6ztt5jetFZ' AS source_external_id,
  'f5f5c86ab32f94e65088643ccac1d0088e55a42ef643d143de93764c59446bf8' AS source_sha256, 324 AS verified_pdf_pages
UNION ALL SELECT 'SANJESH_1405_APPENDICES' AS document_code, '1AZkqD801KS0wp3pmT0Kcu-MC_Sr0FHJZ' AS source_external_id,
  'e50c2ff0cbd715567f8a3be87d375eedc98b57759b467370c0cd9aa2ee974e55' AS source_sha256, 86 AS verified_pdf_pages
UNION ALL SELECT 'SANJESH_1405_RECORDS_BASED' AS document_code, '1a1kdO6WWaOt3GrKFKmxjgeWqsQCddMlC' AS source_external_id,
  '26642d4ab27b07d8a69819f8efc5f5f4c31a6c13fa5f807005df9a001b39c1c0' AS source_sha256, 278 AS verified_pdf_pages
) AS expected
INNER JOIN eco_admission_cycles AS c
  ON c.admission_year = 1405 AND c.scope_code = 'NATIONAL' AND c.authority_code = 'SANJESH'
INNER JOIN eco_admission_documents AS d
  ON d.cycle_id = c.id AND d.document_code = expected.document_code AND d.revision_no = 1
  AND d.source_external_id = expected.source_external_id
  AND d.original_pdf_sha256 = expected.source_sha256
  AND d.pdf_page_count = expected.verified_pdf_pages
  AND d.document_review_state IN ('OWNER_CONFIRMED','SOURCE_VERIFIED','QA_APPROVED')
CROSS JOIN (
 SELECT ones.n + 10*tens.n + 100*hundreds.n + 1 AS page_no
 FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
 CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
 CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds
) AS digits
WHERE digits.page_no <= expected.verified_pdf_pages
  AND NOT EXISTS (
    SELECT 1 FROM eco_admission_document_pages AS existing
    WHERE existing.document_id = d.id AND existing.pdf_page_number = digits.page_no
  );

-- Required read-only postflight: count by each fingerprint/doc, check 2412 total,
-- zero newly approved/auto-reviewed rows and no duplicates before any next data step.
-- See the accompanying ephemeral CI exercise. No auto-promotion of page states.
