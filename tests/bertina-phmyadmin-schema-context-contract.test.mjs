import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('docs/migrations/20261017_bertina_phmyadmin_schema_context_readonly.sql','utf8');

test('phpMyAdmin diagnostic must use explicit canonical Bertina database, never inferred selected context',()=>{
  assert.match(sql,/SELECT DATABASE\(\) AS phpmyadmin_current_context/);
  assert.match(sql,/TABLE_SCHEMA='drjavad1_store'/);
  assert.match(sql,/actual\.TABLE_SCHEMA='drjavad1_store'/);
  assert.match(sql,/FROM information_schema\.COLUMNS/);
  assert.match(sql,/FROM information_schema\.STATISTICS/);
  assert.doesNotMatch(sql,/WHERE\s+TABLE_SCHEMA\s*=\s*DATABASE\(\)/i);
  assert.doesNotMatch(sql,/ON\s+actual\.TABLE_SCHEMA\s*=\s*DATABASE\(\)/i);
});

test('diagnostic enumerates nine Stage09 baseline tables and three new independent service-file migrations',()=>{
 const required=[
  'commerce_orders','commerce_book_stock','commerce_book_reservations',
  'commerce_stock_movements','commerce_payment_claims','commerce_outbox',
  'commerce_service_cases','commerce_parcels','commerce_refund_requests',
  'commerce_service_files','commerce_service_delivery_evidence',
  'commerce_service_buyer_receipts'
 ];
 for(const table of required)assert.ok(sql.includes("'"+table+"'"),'missing table: '+table);
 assert.ok(sql.includes('BASELINE_STAGE09'));
 assert.ok(sql.includes('NEW_SERVICE_CUSTODY'));
 assert.ok(sql.includes('NOT_FOUND_IN_TARGET_SCHEMA'));
 assert.ok(sql.includes('PRESENT_INNODB'));
});

test('schema-context diagnostic is strictly read-only and contains no customer/payment rows or secrets',()=>{
 const executable=sql.replace(/^--.*$/gm,'');
 assert.doesNotMatch(executable,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|REPLACE|GRANT|REVOKE|CALL|INTO\s+OUTFILE|LOAD\s+DATA)\b/i);
 assert.doesNotMatch(executable,/FROM\s+commerce_orders\b/i);
 assert.doesNotMatch(executable,/JOIN\s+commerce_orders\b/i);
 assert.doesNotMatch(executable,/SELECT\s+\*\s+FROM/i);
 assert.ok(sql.includes('information_schema.TABLES'));
 assert.ok(sql.includes('information_schema.COLUMNS'));
 assert.ok(sql.includes('information_schema.STATISTICS'));
});


test('canonical publishing mother-schema inventory tracks both approved additive migrations',()=>{
 const migrationFiles=[
   'docs/migrations/20261017_jr_future_publishing.sql',
   'docs/migrations/20261017_jr_publishing_contract_and_reserve.sql'
 ];
 const canonical=migrationFiles.flatMap(file=>[...fs.readFileSync(file,'utf8')
   .matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(publishing_[a-z0-9_]+)/ig)]
   .map(m=>m[1]));
 assert.equal(canonical.length,17,'canonical publishing layer has 17 proposed tables');
 assert.equal(new Set(canonical).size,17,'no duplicate canonical table');
 for(const name of canonical)assert.ok(sql.includes("'"+name+"'"),'inventory missing: '+name);
 assert.match(sql,/PUBLISHING_CANONICAL/);
 assert.match(sql,/TABLE_NAME LIKE 'publishing_%'/);
 assert.match(sql,/FROM information_schema\.KEY_COLUMN_USAGE/);
 assert.match(sql,/REFERENCED_TABLE_NAME IS NOT NULL/);
 assert.match(sql,/publishing_sale_allocation_entries/);
 assert.match(sql,/publishing_platform_cost_entries/);
 assert.doesNotMatch(sql,/UNION ALL SELECT 'PUBLISHING_CANONICAL','jr_pub_/);
 // No live migration, private record query, authority claim or accepting evidence.
 const executable=sql.replace(/^--.*$/gm,'');
 assert.doesNotMatch(executable,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|REPLACE|GRANT|REVOKE|CALL)\b/i);
 assert.doesNotMatch(executable,/FROM\s+publishing_[a-z]+/i);
 assert.doesNotMatch(executable,/JOIN\s+publishing_[a-z]+/i);
});
