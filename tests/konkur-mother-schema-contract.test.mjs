import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const migration=read('database/unified/003e_admission_knowledge_catalog_PROPOSED.sql');
const preflight=read('docs/migrations/20261020_konkur_catalog_readonly_preflight.sql');
const instructions=read('docs/governance/JR_KONKUR_MOTHER_DATABASE_EXTENSION_DESIGN_20261020.md');
const expected=[
 'eco_admission_cycles','eco_admission_documents','eco_admission_document_pages',
 'eco_admission_import_batches','eco_admission_import_rows','eco_admission_programme_offerings',
 'eco_admission_offering_conditions','eco_admission_rule_versions'
];
const uncomment=sql=>sql.replace(/--[^\n]*/g,'');
test('003e creates exactly eight bounded modules within the existing mother database',()=>{
 const sql=uncomment(migration);
 const actual=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(/g)].map(x=>x[1]);
 assert.deepEqual(actual,expected);
 assert.match(sql,/USE drjavad1_store;/);
 assert.equal((sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/g)||[]).length,8);
 assert.equal((sql.match(/PRIMARY KEY/g)||[]).length,8);
 assert.doesNotMatch(sql,/\b(?:DROP|ALTER|TRUNCATE|INSERT|UPDATE|DELETE|REPLACE|GRANT|REVOKE)\s+(?:TABLE|INTO|FROM|ON|DATABASE|VIEW)\b/i);
 assert.doesNotMatch(sql,/CREATE (?:DATABASE|USER)\b/i);
});
test('strict source revisions, page review, human approval and staged-only imports',()=>{
 for(const col of [
  "document_review_state ENUM('DRAFT','OWNER_CONFIRMED','SOURCE_VERIFIED','QA_APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT'",
  "page_review_state ENUM('UNREVIEWED','DISCREPANT','REVIEWED') NOT NULL DEFAULT 'UNREVIEWED'",
  "batch_status ENUM('STAGED','REVIEWING','REJECTED','ACCEPTED') NOT NULL DEFAULT 'STAGED'",
  "review_state ENUM('UNREVIEWED','REJECTED','CORRECTED','SOURCE_MATCHED') NOT NULL DEFAULT 'UNREVIEWED'",
  "review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT'",
  'original_pdf_sha256 CHAR(64)', 'page_image_sha256 CHAR(64)',
  'normalized_row_sha256 CHAR(64)', 'supersedes_document_id CHAR(36)',
  'supersedes_offering_id CHAR(36)', 'record_revision INT UNSIGNED'
 ])assert.ok(migration.includes(col),'missing governance field: '+col);
 for(const fk of [
  'REFERENCES eco_institutions(id)','REFERENCES eco_object_refs(id)',
  'REFERENCES customer_accounts(id)','REFERENCES eco_admission_cycles(id)',
  'REFERENCES eco_admission_documents(id)','REFERENCES eco_admission_document_pages(id)'
 ])assert.ok(migration.includes(fk),'missing modular reuse relation: '+fk);
 assert.match(migration,/UNIQUE KEY uq_eapo_cycle_code_revision[\s\S]*?cycle_id,examination_group_code,admission_track_code,programme_location_code,record_revision/);
 assert.match(migration,/source_page_id CHAR\(36\) NOT NULL/);
 assert.match(migration,/document_kind VARCHAR\(50\) NOT NULL/);
 assert.doesNotMatch(migration,/CREATE TABLE.*(?:customer_accounts|eco_institutions|eco_subjects)\s*\(/);
});
test('Bertina preflight is genuinely metadata-only and explicitly targets correct schema',()=>{
 const executable=uncomment(preflight);
 assert.match(executable,/information_schema\.TABLES/);
 assert.match(executable,/information_schema\.COLUMNS/);
 assert.match(executable,/information_schema\.KEY_COLUMN_USAGE/);
 assert.match(executable,/TABLE_SCHEMA='drjavad1_store'/);
 assert.doesNotMatch(executable,/\b(?:CREATE|DROP|ALTER|TRUNCATE|INSERT|UPDATE|DELETE|REPLACE|GRANT|REVOKE|USE)\s+(?:TABLE|INTO|FROM|DATABASE|drjavad1_store)/i);
 assert.doesNotMatch(executable,/FROM\s+customer_accounts\b|FROM\s+commerce_orders\b/i);
 assert.match(instructions,/NO DATABASE MIGRATION OR PRODUCTION DEPLOYMENT EXECUTED/);
 assert.match(instructions,/ten tables or schema redesigns/);
});
test('known 1405 PDF fingerprints exist but never grant automatic source-page approval',()=>{
 const manifest=JSON.parse(read('platform/konkur-1405-sources.json'));
 assert.equal(manifest.sources.length,6);
 assert.equal(new Set(manifest.sources.map(x=>x.fileId)).size,6);
 for(const s of manifest.sources){
  assert.match(s.sha256,/^[0-9a-f]{64}$/);
  assert.ok(Number.isInteger(s.pdfPageCount)&&s.pdfPageCount>0);
  assert.equal(s.activeForEligibility,false);
  assert.equal(s.criticalTablesVerification,'NOT_COMPLETED');
 }
 assert.match(instructions,/no publication should occur yet/);
});
