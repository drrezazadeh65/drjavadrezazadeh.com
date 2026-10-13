import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('database/unified');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'schema_manifest.json'),'utf8'));
const files=manifest.modules.map(m=>path.join(root,m.file));
const baseline=new Set(['customer_accounts','commerce_orders']);
const allTables=new Set();
const declarations=[];
const allowedStatement=/^\s*(?:--[^\n]*\n|\s)*CREATE TABLE IF NOT EXISTS\s+(eco_[a-z0-9_]+)\s*\(/gim;

for(const [i,file] of files.entries()){
 const sql=fs.readFileSync(file,'utf8');
 const tables=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(eco_[a-z0-9_]+)\s*\(/gi)].map(x=>x[1]);
 assert.equal(tables.length,manifest.modules[i].tableCount,manifest.modules[i].file);
 assert.ok(!/\b(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+\w+\s+SET|ALTER\s+TABLE|INSERT\s+INTO|REPLACE\s+INTO|GRANT|CREATE\s+DATABASE|FOREIGN_KEY_CHECKS)\b/i.test(sql),file);
 assert.ok(!/\b(?:JSONB|TIMESTAMPTZ|BIGSERIAL|CREATE\s+EXTENSION|SERIAL\s+PRIMARY\s+KEY)\b/i.test(sql),
   'PostgreSQL construct accidentally entered Bertina SQL: '+file);
 const statements=sql.split(/;\s*(?:\n|$)/).map(x=>x.trim()).filter(Boolean);
 for(const statement of statements){
   const clean=statement.replace(/^\s*(?:--[^\n]*(?:\n|$)\s*)*/g,'').trim();
   if(!clean)continue;
   assert.match(clean,/^(?:SET NAMES utf8mb4|SET time_zone = '\+00:00'|CREATE TABLE IF NOT EXISTS eco_[a-z0-9_]+\s*\()/i,
     'Unexpected statement: '+file+': '+clean.slice(0,75));
 }
 for(const name of tables){
  assert.equal(allTables.has(name),false,'Duplicate table: '+name);
  allTables.add(name);
 }
 for(const stmt of [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(eco_[a-z0-9_]+)\s*\(([\s\S]*?)\)\s*ENGINE=InnoDB\s+DEFAULT CHARSET=utf8mb4\s+COLLATE=utf8mb4_unicode_ci\s*;/gi)]){
  declarations.push({table:stmt[1],definition:stmt[2],file});
 }
}

test('design uses one namespaced, additive, numbered MariaDB/MySQL schema',()=>{
 assert.equal(manifest.state,'DESIGN_ONLY_NOT_APPLIED');
 assert.equal(manifest.expectedNewTableCount,198);
 assert.equal(files.length,16);
 assert.equal(allTables.size,manifest.expectedNewTableCount);
 assert.equal(declarations.length,manifest.expectedNewTableCount,'Every table must declare InnoDB, charset and collation');
 for(const d of declarations)assert.match(d.definition,/\bPRIMARY KEY\b/i,'Missing PK: '+d.table);
});

test('all foreign keys resolve to a known table or the existing Bertina identity/order sources',()=>{
 for(const d of declarations){
  for(const ref of d.definition.matchAll(/REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(/gi))
   assert.ok(allTables.has(ref[1])||baseline.has(ref[1]),
     'Missing FK target '+ref[1]+' from '+d.table);
 }
});

test('foreign key delete policy and identifiers are bounded',()=>{
 for(const d of declarations){
  assert.match(d.table,/^eco_[a-z0-9_]+$/);
  assert.ok(d.table.length<=64,'Identifier too long '+d.table);
  const names=[...d.definition.matchAll(/(?:UNIQUE KEY|KEY|CONSTRAINT)\s+([a-z_][a-z0-9_]*)/gi)].map(m=>m[1]);
  for(const n of names)assert.ok(n.length<=64,'Index/constraint too long '+n);
  assert.ok(!/ON DELETE SET NULL\s*,\s*ON DELETE CASCADE/i.test(d.definition));
 }
});

test('user, checkout and journal operational sources remain untouched',()=>{
 const all=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
 assert.doesNotMatch(all,/\b(?:DROP TABLE|ALTER TABLE|TRUNCATE TABLE|UPDATE commerce_orders|UPDATE customer_accounts)\b/i);
 for(const t of ['customer_accounts','commerce_orders'])
   assert.ok(!allTables.has(t));
 assert.ok(manifest.optionalLegacyModules.includes('operations_*'));
 assert.ok(manifest.optionalLegacyModules.includes('social_*'));
});

test('payments, learner outcomes and OJS preserve external proof boundaries',()=>{
 const combined=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
 for(const required of [
   'eco_settlement_entries','eco_assessment_reviews','eco_research_consent_snapshots',
   'eco_ojs_external_links','eco_bahar_weekly_cycles','eco_audit_events','eco_privacy_requests',
   'eco_ai_safety_reviews','eco_golden_path_releases','eco_analytics_consents'
 ])assert.ok(allTables.has(required),required+' missing');
 assert.match(combined,/bank_evidence_sha256/);
 assert.match(combined,/validation_state/);
 assert.match(combined,/human_review_required/);
});

test('all module files actually exist and no hidden executables are bundled',()=>{
 const actual=fs.readdirSync(root).filter(x=>/^\d{3}[a-d]?_.*\.sql$/.test(x)).sort();
 assert.deepEqual(actual,manifest.modules.map(x=>x.file).sort());
});
