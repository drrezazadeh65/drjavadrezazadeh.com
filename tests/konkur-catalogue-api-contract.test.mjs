import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const api=read('api/konkur-admission.php');
const router=read('api/index.php');
const schema=read('database/unified/003e_admission_knowledge_catalog_PROPOSED.sql');
test('existing single Bertina API routes public institutional facts with no new login or persistence',()=>{
 assert.match(router,/require_once __DIR__\.'\/konkur-admission\.php'/);
 assert.match(router,/konkurCatalogueRoute\(\$path,\$verb\)/);
 assert.match(api,/if \(\$verb!=='GET'\) fail\('method_not_allowed',405\)/);
 assert.match(api,/Cache-Control: private, no-store, max-age=0/);
 assert.match(api,/OFFICIAL_CATALOGUE_NOT_READY/);
 assert.match(api,/NO_SOURCE_APPROVED_RECORDS/);
 assert.match(api,/admissionProbabilityEnabled/);
 assert.match(api,/officialApplicationSubmitted/);
 assert.match(api,/eligibilityAssessment/);
 assert.doesNotMatch(api,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE)\s+(?:INTO|FROM|TABLE)/i);
 assert.doesNotMatch(api,/\$_(?:POST|FILES|COOKIE|SESSION)\b/);
});
test('public catalogue enforces source, amendment, reviewer and complete conditions checks',()=>{
 const required=[
 "c.record_status='ACTIVE'","c.approved_by_account_id IS NOT NULL",
 "d.document_review_state='QA_APPROVED'",
 "dp.page_review_state='REVIEWED'",
 "p.review_state='APPROVED'",
 "p.conditions_review_state='COMPLETE'",
 "p.conditions_reviewed_by_account_id IS NOT NULL",
 "p.conditions_reviewed_at IS NOT NULL",
 "d.cycle_id=c.id",
 "supersedes_document_id=d.id",
 "revision.record_revision>p.record_revision",
 "condition_record.review_state <> 'APPROVED'",
 "condition_record.approved_by_account_id IS NULL",
 "cd.document_review_state <> 'QA_APPROVED'",
 "cd.cycle_id <> c.id",
 "cd.original_pdf_sha256 IS NULL"
 ];
 for(const s of required)assert.ok(api.includes(s),'Missing source-review gate: '+s);
 for(const column of [
  "conditions_review_state ENUM('UNREVIEWED','COMPLETE') NOT NULL DEFAULT 'UNREVIEWED'",
  "conditions_reviewed_by_account_id CHAR(36) NULL",
  "conditions_reviewed_at DATETIME(3) NULL",
  "CONSTRAINT fk_eapo_conditions_reviewer"
 ]) assert.ok(schema.includes(column),'Missing schema guard: '+column);
});
test('only synthetic ephemeral CI can assert a verified fixture, not a real university record',()=>{
 const fixture=read('tests/fixtures/konkur-catalogue-synthetic.sql');
 const qa=read('tests/konkur-catalogue-ephemeral.php');
 assert.match(fixture,/SYNTHETIC FIXTURE/);
 assert.match(fixture,/SYNTHETIC UNIVERSITY/);
 assert.match(qa,/JR_KONKUR_SYNTHETIC_FIXTURE/);
 assert.match(qa,/Refusing to run without explicit local synthetic MariaDB fixture/);
 assert.match(qa,/pending amendment blocks superseded guide/);
 assert.match(qa,/incomplete special conditions block publication/);
 assert.match(qa,/unreviewed newer code revision/);
 assert.doesNotMatch(qa,/\$_(?:POST|FILES|COOKIE|SESSION)\b/);
});
