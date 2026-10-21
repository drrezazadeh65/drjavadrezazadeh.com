import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sourceOnlySchemaReuseAudit,assessSchemaReuse} from '../scripts/konkur-schema-reuse-readiness.mjs';
test('historical 003e tables are not a request to create duplicate tables',()=>{
 const r=sourceOnlySchemaReuseAudit();
 assert.equal(r.previouslyObservedCatalogueTables.length,8);
 assert.equal(r.previouslyObservedProviderTables.length,3);
 assert.equal(r.newTablesRecommendedNow,0);
 assert.equal(r.currentProductionSchemaInspected,false);
 assert.equal(r.databaseChangesPermitted,false);
 assert.equal(r.restoreTested,false);
});
test('changes in SQL table proposals stop the source-only schema reviewer',()=>{
 const sql=fs.readFileSync('database/unified/003e_admission_knowledge_catalog_PROPOSED.sql','utf8');
 const safe={migrationAuthorized:false,overlappingConcepts:[1,2,3,4]};
 assert.throws(()=>assessSchemaReuse({catalogueSql:sql.replace('eco_admission_cycles','eco_admission_cycles_v2'),proposalAudit:safe}),TypeError);
 assert.throws(()=>assessSchemaReuse({catalogueSql:sql,proposalAudit:{migrationAuthorized:true}}),TypeError);
});
