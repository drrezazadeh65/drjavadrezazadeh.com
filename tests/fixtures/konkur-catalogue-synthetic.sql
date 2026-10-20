-- SYNTHETIC FIXTURE. EPHEMERAL CI DATABASE ONLY. NOT an official Sanjesh record.
-- Never execute against Bertina production or import these fictitious programme names.
SET NAMES utf8mb4;
USE drjavad1_store;
SET @konkur_fixture_reviewer=UUID(),@konkur_fixture_cycle=UUID(),
    @konkur_fixture_doc=UUID(),@konkur_fixture_page=UUID(),@konkur_fixture_offering=UUID();
INSERT INTO customer_accounts(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at)
VALUES(@konkur_fixture_reviewer,'synthetic-reviewer@example.invalid','INVALID_NON_LOGIN_FIXTURE_ONLY','active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),UNIX_TIMESTAMP());
INSERT INTO eco_admission_cycles(id,admission_year,scope_code,authority_code,record_status,approved_by_account_id,approved_at)
VALUES(@konkur_fixture_cycle,1403,'SYNTHETIC_FIXTURE','SANJESH','ACTIVE',@konkur_fixture_reviewer,NOW(3));
INSERT INTO eco_admission_documents(id,cycle_id,document_code,revision_no,document_kind,examination_group_code,
 issuer_code,original_pdf_sha256,pdf_page_count,document_review_state,reviewed_by_account_id,reviewed_at)
VALUES(@konkur_fixture_doc,@konkur_fixture_cycle,'SYNTHETIC_NOT_OFFICIAL',1,'GUIDE','SYNTHETIC',
'SANJESH',REPEAT('a',64),2,'QA_APPROVED',@konkur_fixture_reviewer,NOW(3));
INSERT INTO eco_admission_document_pages(id,document_id,pdf_page_number,printed_page_label,
page_image_sha256,page_review_state,reviewed_by_account_id,reviewed_at)
VALUES(@konkur_fixture_page,@konkur_fixture_doc,1,'SYNTHETIC PAGE',REPEAT('b',64),
'REVIEWED',@konkur_fixture_reviewer,NOW(3));
INSERT INTO eco_admission_programme_offerings(
 id,cycle_id,examination_group_code,admission_track_code,programme_location_code,
 record_revision,official_institution_name,programme_title,source_page_id,normalized_row_sha256,
 conditions_review_state,conditions_reviewed_by_account_id,conditions_reviewed_at,
 review_state,approved_by_account_id,approved_at)
VALUES(
 @konkur_fixture_offering,@konkur_fixture_cycle,'SYNTHETIC','SYNTHETIC_TRACK','00001',
 1,'SYNTHETIC UNIVERSITY — NOT REAL','SYNTHETIC PROGRAMME — NOT REAL',@konkur_fixture_page,REPEAT('c',64),
 'COMPLETE',@konkur_fixture_reviewer,NOW(3),'APPROVED',@konkur_fixture_reviewer,NOW(3)
);
-- Runtime negative cases are introduced and reversed only by a dedicated test
-- against this throwaway container, not by any migration or seed SQL.
