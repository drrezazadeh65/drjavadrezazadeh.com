import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const raw=read('database/unified/003f_candidate_exam_data_PROPOSED.sql');
const sql=raw.replace(/--[^\n]*/g,'');
const preflight=read('docs/migrations/20261020_konkur_scorecards_readonly_preflight.sql').replace(/--[^\n]*/g,'');
const tableNames=[
 'eco_exam_providers','eco_exam_scorecard_schemas','eco_exam_metric_definitions',
 'eco_exam_events','eco_candidate_exam_attempts','eco_candidate_exam_metric_values',
 'eco_candidate_selection_drafts','eco_candidate_selection_choices','eco_exam_component_policies'
];
test('003f is exactly nine additive InnoDB/utf8mb4 tables in the existing mother database',()=>{
 const seen=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(/g)].map(x=>x[1]);
 assert.deepEqual(seen,tableNames);
 assert.match(sql,/USE drjavad1_store;/);
 assert.equal((sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/g)||[]).length,9);
 assert.equal((sql.match(/PRIMARY KEY/g)||[]).length,9);
 assert.doesNotMatch(sql,/\b(?:DROP|ALTER|TRUNCATE|INSERT|UPDATE|DELETE|REPLACE|GRANT|REVOKE)\s+(?:TABLE|INTO|FROM|ON|DATABASE|VIEW)\b/i);
 assert.doesNotMatch(sql,/CREATE\s+(?:USER|DATABASE|TRIGGER|PROCEDURE|FUNCTION)\b/i);
 assert.doesNotMatch(sql,/CREATE TABLE IF NOT EXISTS\s+(?:customer_accounts|eco_subjects|eco_consent_records|eco_grade_records)\s*\(/);
});
test('provider-specific scales are never silently equated to Sanjesh',()=>{
 for(const x of [
  'provider_code VARCHAR(70)', 'scorecard_kind VARCHAR(70)', 'schema_revision INT UNSIGNED',
  'norm_population_code VARCHAR(100)', 'metric_kind ENUM(', "'MOCK_TAZ'", "'OFFICIAL_NORMALIZED'",
  "'COUNT_OF_TEN'","'SUBJECT_PERCENT'",'source_url VARCHAR(400)',
  "review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','RETIRED') NOT NULL DEFAULT 'DRAFT'"
 ]) assert.ok(raw.includes(x),x);
 assert.ok(raw.includes('scale_min DECIMAL(15,5)')&&raw.includes('scale_max DECIMAL(15,5)'));
});
test('private scorecard and saved choice objects use real identities, consents and retention',()=>{
 for(const x of [
  'subject_id CHAR(36) NOT NULL','consent_record_id CHAR(36) NOT NULL',
  'entered_by_account_id CHAR(36) NOT NULL','owner_account_id CHAR(36) NOT NULL',
  'retention_until DATETIME(3) NOT NULL','deleted_at DATETIME(3) NULL',
  'REFERENCES eco_subjects(id)','REFERENCES eco_consent_records(id)',
  'REFERENCES customer_accounts(id)','REFERENCES eco_admission_programme_offerings(id)',
  'REFERENCES eco_admission_cycles(id)',
  "'MANUAL_SELF_REPORT'","'UNVERIFIED'","'SELF_REPORTED'",
  'preference_position SMALLINT UNSIGNED NOT NULL','UNIQUE KEY uq_ecsc_position'
 ]) assert.ok(raw.includes(x),x);
 assert.doesNotMatch(sql,/\b(?:national_id|passport_number|bank_account|guardian_mobile|birth_date|password_hash)\b/i);
});
test('future-year admission decisions are not inferred from old annual weights',()=>{
 assert.match(raw,/proposed_admission_year SMALLINT UNSIGNED NOT NULL/);
 assert.match(raw,/verified_admission_cycle_id CHAR\(36\) NULL/);
 assert.match(raw,/contribution_fraction DECIMAL\(8,6\) NULL/);
 assert.match(raw,/effect_kind ENUM\('DEFINITE','POSITIVE','NOT_APPLICABLE','OFFICIAL_CONFIRMATION_REQUIRED'\)/);
 assert.match(raw,/source_page_id CHAR\(36\) NOT NULL/);
 assert.match(raw,/review_state ENUM\('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED'\) NOT NULL DEFAULT 'DRAFT'/);
 assert.doesNotMatch(sql,/(?:contribution_fraction|effect_kind)\s+.*DEFAULT\s+0\.[3467]/);
});
test('003f live preflight reads metadata only and protects existing identity/commerce records',()=>{
 for(const x of ['information_schema.TABLES','information_schema.COLUMNS','information_schema.KEY_COLUMN_USAGE',"t.TABLE_SCHEMA='drjavad1_store'"])assert.ok(preflight.includes(x),x);
 assert.doesNotMatch(preflight,/\b(?:CREATE|ALTER|DELETE|UPDATE|INSERT|DROP|TRUNCATE|GRANT|REVOKE|REPLACE)\s+(?:TABLE|INTO|FROM|DATABASE|VIEW)/i);
 assert.doesNotMatch(preflight,/FROM\s+customer_accounts\b|FROM\s+eco_subjects\b/i);
 const guide=read('docs/governance/JR_KONKUR_MOCK_SCORECARDS_1406_LAUNCH_RESEARCH_20261020.md');
 assert.match(guide,/no live statistical admission prediction service/i);
 assert.match(guide,/No automated account login or scraping/i);
});
