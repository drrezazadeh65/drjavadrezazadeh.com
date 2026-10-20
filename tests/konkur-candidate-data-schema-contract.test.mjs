import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('database/unified/003f_candidate_exam_data_PROPOSED.sql').replace(/--[^\n]*/g,'');
const pre=read('docs/migrations/20261020_konkur_scorecards_readonly_preflight.sql').replace(/--[^\n]*/g,'');
const expected=[
 'eco_exam_providers','eco_exam_scorecard_schemas','eco_exam_metric_definitions',
 'eco_exam_events','eco_candidate_exam_attempts','eco_candidate_exam_metric_values',
 'eco_candidate_selection_drafts','eco_candidate_selection_choices',
 'eco_exam_component_policies'
];
test('003f is an additive 9-table proposal on the EXISTING mother database',()=>{
 const found=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(/g)].map(m=>m[1]);
 assert.deepEqual(found,expected);
 assert.equal((sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/g)||[]).length,9);
 assert.match(sql,/USE drjavad1_store;/);
 assert.doesNotMatch(sql,/\b(?:ALTER|DROP|TRUNCATE|DELETE|UPDATE|REPLACE|GRANT|REVOKE)\s+(?:TABLE|FROM|DATABASE|ON|INTO|VIEW)/i);
 assert.doesNotMatch(sql,/CREATE\s+(?:DATABASE|USER)\b/i);
});
test('private candidate records reference mother identity, scoped consent and retention',()=>{
 for(const item of [
  'REFERENCES eco_subjects(id)','REFERENCES eco_consent_records(id)',
  'REFERENCES customer_accounts(id)','REFERENCES eco_admission_cycles(id)',
  'REFERENCES eco_admission_programme_offerings(id)',
  'REFERENCES eco_admission_document_pages(id)',
  'retention_until DATETIME(3) NOT NULL','deleted_at DATETIME(3) NULL',
  "verification_state ENUM('UNVERIFIED','UNDER_REVIEW','VERIFIED','REVOKED') NOT NULL DEFAULT 'UNVERIFIED'",
  'norm_population_code VARCHAR(100) NULL','metric_kind ENUM('
 ])assert.ok(sql.includes(item),'missing boundary '+item);
 assert.match(sql,/UNIQUE KEY uq_ecsc_position \(draft_id,preference_position\)/);
 assert.match(sql,/reviewed_revision_no INT UNSIGNED NULL/);
});
test('official versus mock scoring remains intentionally incomparable and rules cannot be generic percentages',()=>{
 assert.match(sql,/provider_kind ENUM\('OFFICIAL_ADMISSION','PRIVATE_MOCK','SCHOOL_FINAL','OTHER'\)/);
 assert.match(sql,/scorecard_layout_sha256 CHAR\(64\)/);
 assert.match(sql,/contribution_fraction DECIMAL\(8,6\) NULL/);
 assert.match(sql,/policy_revision INT UNSIGNED NOT NULL/);
 assert.match(sql,/source_page_id CHAR\(36\) NOT NULL/);
 assert.match(sql,/review_state ENUM\('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED'\) NOT NULL DEFAULT 'DRAFT'/);
});
test('owner-readonly scorecard preflight uses metadata only, never private subject records',()=>{
 assert.match(pre,/information_schema\.TABLES/);
 assert.match(pre,/information_schema\.COLUMNS/);
 assert.match(pre,/information_schema\.KEY_COLUMN_USAGE/);
 assert.match(pre,/drjavad1_store/);
 assert.doesNotMatch(pre,/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|REPLACE|GRANT|REVOKE|CREATE)\s+(?:TABLE|INTO|FROM|DATABASE|VIEW|ON)/i);
 assert.doesNotMatch(pre,/FROM\s+(?:eco_subjects|customer_accounts|eco_candidate_exam_attempts)\b/i);
});
