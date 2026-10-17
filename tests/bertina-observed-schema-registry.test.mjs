import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('docs/governance/BERTINA_OBSERVED_TABLE_CATALOG_20261017.json'));
const store=catalog.databases.drjavad1_store;
const ojs=catalog.databases.drjavad1_jhela_ojs;
const orderedMigrations=[
 'docs/migrations/20261016_private_service_intake.sql',
 'docs/migrations/20261017_private_service_files.sql',
 'docs/migrations/20261017_service_buyer_receipt.sql',
 'database/unified/004c_jhela_founding_intake.sql',
 'docs/migrations/20261017_jr_future_publishing.sql',
 'docs/migrations/20261017_jr_publishing_contract_and_reserve.sql',
 'docs/migrations/20261017_jr_publishing_author_onboarding.sql'
];
const namesFromMigration=sql=>{
 const tableNames=[];
 const re=/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:`[^`]+`\.)?(?:`([A-Za-z_][\w]*)`|([A-Za-z_][\w]*))/gi;
 for(const m of sql.matchAll(re))tableNames.push(m[1]||m[2]);
 return tableNames;
};
test('sanitized Bertina registry reflects 225 baseline and exactly 28 owner-verified additions',()=>{
 assert.equal(catalog.schema,'jr-bertina-observed-table-catalog-v1');
 assert.equal(catalog.branch,'migration/bertina-linux6');
 assert.equal(catalog.classification,'SANITIZED_SCHEMA_NAMES_ONLY_NO_ROWS_NO_SECRETS');
 assert.equal(store.baselineTableCount,225);
 assert.equal(store.addedTableCount,28);
 assert.equal(store.baseTableCount,253);
 assert.equal(store.baselineTableNames.length,225);
 assert.equal(store.additionsByModule.service.length,3);
 assert.equal(store.additionsByModule.journal.length,5);
 assert.equal(store.additionsByModule.publishing.length,20);
 const all=[...store.baselineTableNames,...Object.values(store.additionsByModule).flat()];
 assert.equal(all.length,253);
 assert.equal(new Set(all).size,253,'table name collision in source-of-truth inventory');
 assert.ok(all.every(x=>/^[a-z][a-z0-9_]+$/.test(x)));
 for(const [family,count] of Object.entries(store.allFamilies))
  assert.equal(all.filter(name=>name.startsWith(family+'_')).length,count,'wrong family '+family);
 assert.equal(Object.values(store.allFamilies).reduce((a,b)=>a+b,0),253);
 assert.equal(store.newTableInnoDBCount,28);
 assert.equal(store.newTableUnicodeCollationCount,28);
 assert.equal(store.newTableForeignKeyConstraints,41);
 assert.equal(store.newTableForeignKeyColumns,44);
});
test('seven canonical additive migrations exactly match all 28 added table names',()=>{
 const names=orderedMigrations.flatMap(file=>namesFromMigration(read(file)));
 const expected=Object.values(store.additionsByModule).flat();
 assert.equal(names.length,28);
 assert.equal(new Set(names).size,28);
 assert.deepEqual([...names].sort(),[...expected].sort());
 for(const path of orderedMigrations){
  const sql=read(path);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS/i);
  assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i,'additive migration must not include destructive DDL/DML: '+path);
 }
});
test('vendor OJS remains its own not-yet-installed database; no fake readiness',()=>{
 assert.equal(ojs.baseTableCount,0);
 assert.equal(ojs.status,'EMPTY_OJS_NOT_INSTALLED');
 assert.equal(ojs.observedSchemaDefaultCharset,'utf8mb4');
 assert.equal(ojs.observedSchemaDefaultCollation,'utf8mb4_unicode_ci');
 assert.equal(catalog.deploymentAndAcceptance.productionEndToEndForNewFeatures,'NOT_VERIFIED');
 assert.equal(catalog.deploymentAndAcceptance.masterplanReleaseState,'BLOCKED_PENDING_FULL_ACCEPTANCE');
});
test('committed inventory has no row values or private credentials',()=>{
 const text=read('docs/governance/BERTINA_OBSERVED_TABLE_CATALOG_20261017.json');
 assert.ok(!/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text),'Unexpected email in Git-tracked inventory');
 assert.ok(!/(?:password_hash|access_token|refresh_token|customer_email|gateway_secret|iban_sealed)"\s*:/.test(text),'Possible secret or PII field');
 assert.ok(!text.includes('INSERT INTO '),'Raw database dump content must not be committed');
});
