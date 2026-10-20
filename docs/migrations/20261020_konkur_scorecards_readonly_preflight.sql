-- Konkur 003f: PRIVATE SCORECARDS MODULE - READ ONLY preflight (owner-run on Bertina).
-- Never run 003f until an independently tested database restore, verified minor/guardian
-- consent flows and an owner-approved secure scorecard data processing notice exist.
-- All queries use information_schema only; NO identity, learner, commerce or scorecard data.
SELECT DATABASE() AS mysql_context,'drjavad1_store' AS mother_db,
       VERSION() AS mariadb_version,
       CASE WHEN DATABASE()='drjavad1_store' THEN 'EXPECTED_CONTEXT'
            ELSE 'USE_EXPLICIT_MOTHER_DATABASE_AFTER_CONFIRMATION' END AS status;

SELECT t.TABLE_NAME,t.TABLE_TYPE,t.ENGINE,t.TABLE_COLLATION
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA='drjavad1_store'
 AND (t.TABLE_NAME IN (
  'customer_accounts','eco_subjects','eco_subject_relationships','eco_consent_records',
  'eco_consent_notices','eco_object_refs','eco_retention_policies',
  'eco_admission_cycles','eco_admission_programme_offerings','eco_admission_document_pages'
 ) OR t.TABLE_NAME IN (
  'eco_exam_providers','eco_exam_scorecard_schemas','eco_exam_metric_definitions',
  'eco_exam_events','eco_candidate_exam_attempts','eco_candidate_exam_metric_values',
  'eco_candidate_selection_drafts','eco_candidate_selection_choices',
  'eco_exam_component_policies'
 ))
ORDER BY t.TABLE_NAME;

SELECT k.TABLE_NAME,k.COLUMN_NAME,k.COLUMN_TYPE,k.CHARACTER_SET_NAME,
       k.COLLATION_NAME,k.IS_NULLABLE
FROM information_schema.COLUMNS k
WHERE k.TABLE_SCHEMA='drjavad1_store'
 AND k.TABLE_NAME IN (
   'customer_accounts','eco_subjects','eco_consent_records',
   'eco_admission_cycles','eco_admission_programme_offerings','eco_admission_document_pages'
 )
 AND k.COLUMN_NAME IN ('id','owner_account_id','guardian_account_id',
                       'subject_id','consent_record_id','notice_id','withdrawn_at','record_status')
ORDER BY k.TABLE_NAME,k.ORDINAL_POSITION;

SELECT x.TABLE_NAME,x.CONSTRAINT_NAME,x.COLUMN_NAME,x.REFERENCED_TABLE_NAME,
       x.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE x
WHERE x.TABLE_SCHEMA='drjavad1_store'
 AND x.TABLE_NAME IN ('eco_subjects','eco_subject_relationships','eco_consent_records',
                     'eco_admission_cycles','eco_admission_programme_offerings')
ORDER BY x.TABLE_NAME,x.CONSTRAINT_NAME,x.ORDINAL_POSITION;

-- A present table name is not proof of a compatible definition. Compare SHOW CREATE TABLE.
-- A missing expected table, collation/FK drift or no tested backup blocks any installation.
