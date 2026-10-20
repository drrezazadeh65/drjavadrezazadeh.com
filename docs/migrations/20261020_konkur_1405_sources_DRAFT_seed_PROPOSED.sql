-- 2026-10-20 | SOURCE-ONLY OPTIONAL DRAFT REGISTER OF SIX VERIFIED-FINGERPRINT 1405 SANJESH PDFs.
-- DO NOT RUN until 003e installation, live schema acceptance, tested backup/restore and owner approval.
-- This imports no programme records, capacities, eligibility conditions, candidate profiles or scores.
-- PAGE/PDF SHA256 is from the owner's original PDF inventory; official issuer is owner-confirmed.
-- REVIEW STATUS REMAINS OWNER_CONFIRMED (NOT QA_APPROVED). Do not enable catalogue routes.
-- Idempotence checks document_code + revision, but human review must resolve any existing conflicting source.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
USE drjavad1_store;

INSERT INTO eco_admission_cycles (id,admission_year,scope_code,authority_code,record_status)
SELECT UUID(),1405,'NATIONAL','SANJESH','DRAFT'
WHERE NOT EXISTS (
 SELECT 1 FROM eco_admission_cycles WHERE admission_year=1405 AND scope_code='NATIONAL'
);

-- humanities: original PDF "رونوشت ensani_v1.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_HUMANITIES',1,'GUIDE','HUMANITIES',
       'SANJESH','1zN9cfFW8tDuYCy8qZAJUikq8NKw5hTjb','dc53d8c1f61bfd2f9fcb6d8d1cf97ea134c46aa140e0ed7129c3a9f50b5b2d06',582,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_HUMANITIES' AND d.revision_no=1
 );

-- experimental: original PDF "Tajrobi_v3.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_EXPERIMENTAL',1,'GUIDE','EXPERIMENTAL_SCIENCES',
       'SANJESH','16Q_b-WE59-pWEteApAJxx0FxT5uLinR7','4f273944c5770a137f12f32793ec7561c8410901a25ec68f6059535fe92d10a6',664,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_EXPERIMENTAL' AND d.revision_no=1
 );

-- mathematics: original PDF "Riazi_v1.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_MATHEMATICS',1,'GUIDE','MATHEMATICS',
       'SANJESH','1EtfLzh7YnsjnWqQYTGamLBIAmjkQ8VG2','515003f7dc758a9c90807c0a2174604604dca93e85985f5831ef35ebc5e1e389',478,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_MATHEMATICS' AND d.revision_no=1
 );

-- arts: original PDF "honar_v1.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_ARTS',1,'GUIDE','ARTS',
       'SANJESH','1z2u4VKDSNBCjw403o9tqty6ztt5jetFZ','f5f5c86ab32f94e65088643ccac1d0088e55a42ef643d143de93764c59446bf8',324,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_ARTS' AND d.revision_no=1
 );

-- appendices: original PDF "Peyvast_v1.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_APPENDICES',1,'APPENDIX',NULL,
       'SANJESH','1AZkqD801KS0wp3pmT0Kcu-MC_Sr0FHJZ','e50c2ff0cbd715567f8a3be87d375eedc98b57759b467370c0cd9aa2ee974e55',86,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_APPENDICES' AND d.revision_no=1
 );

-- records_based: original PDF "NoExamCsSar1405_v2.pdf" (filename is NOT a claim of official amendment number).
INSERT INTO eco_admission_documents (
 id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,source_external_id,original_pdf_sha256,pdf_page_count,document_review_state
)
SELECT UUID(),c.id,'SANJESH_1405_RECORDS_BASED',1,'GUIDE',NULL,
       'SANJESH','1a1kdO6WWaOt3GrKFKmxjgeWqsQCddMlC','26642d4ab27b07d8a69819f8efc5f5f4c31a6c13fa5f807005df9a001b39c1c0',278,'OWNER_CONFIRMED'
FROM eco_admission_cycles c
WHERE c.admission_year=1405 AND c.scope_code='NATIONAL'
 AND NOT EXISTS (
  SELECT 1 FROM eco_admission_documents d
  WHERE d.cycle_id=c.id AND d.document_code='SANJESH_1405_RECORDS_BASED' AND d.revision_no=1
 );

-- STOP: DRAFT register ONLY. No source-page QA, programme codes, review signoff,
-- effective amendment status or eligibility confirmation is implied by these inserts.
