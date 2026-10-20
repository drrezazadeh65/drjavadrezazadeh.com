import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ddl=fs.readFileSync('database/unified/003f_konkur_scorecard_adapters_PROPOSED.sql','utf8');
const clean=ddl.replace(/--[^\n]*/g,'');
test('scorecard module adds exactly four tables and no independent identity or database',()=>{
 const actual=[...clean.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(/g)].map(m=>m[1]);
 assert.deepEqual(actual,['eco_exam_score_providers','eco_exam_score_events','eco_exam_scorecards','eco_exam_scorecard_measures']);
 assert.equal((clean.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/g)||[]).length,4);
 assert.match(clean,/USE drjavad1_store;/);
 assert.doesNotMatch(clean,/\b(?:CREATE DATABASE|DROP|TRUNCATE|ALTER TABLE|DELETE FROM|UPDATE\s+[a-z_]+|INSERT INTO)\b/i);
});
test('scorecard ownership, source provenance and consent reuse existing mother schema',()=>{
 for(const ref of ['REFERENCES customer_accounts(id)','REFERENCES eco_consent_records(id)','REFERENCES eco_admission_cycles(id)'])
  assert.ok(clean.includes(ref),'missing '+ref);
 for(const column of ['provider_code','provider_exam_code','scale_code','scale_version','admission_cycle_id','account_id','consent_record_id','report_kind','verification_state','subject_code','measure_code','missing_reason','revoked_at'])
  assert.ok(clean.includes(column),'missing '+column);
 assert.match(clean,/provider_kind ENUM\('OFFICIAL','PRACTICE','SCHOOL'\)/);
 assert.match(clean,/verification_state ENUM\('SELF_REPORTED','DOCUMENT_REVIEWED','PROVIDER_VERIFIED'\) NOT NULL DEFAULT 'SELF_REPORTED'/);
 assert.doesNotMatch(clean,/CREATE TABLE IF NOT EXISTS\s+(?:customer_accounts|eco_consent_records|eco_academic_records)/);
});
test('readiness document explicitly blocks unvalidated admission probability and private storage',()=>{
 const s=fs.readFileSync('docs/governance/JR_KONKUR_SCORECARD_PROVIDERS_READINESS_20261021.md','utf8');
 for(const x of ['no-storage','guardian authorization','Ghalamchi','Gaj','003e','003f','NOT live','consent'])
  assert.ok(s.includes(x),'missing safeguard '+x);
});
