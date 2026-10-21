/* Source+historic-snapshot metadata inspection ONLY. No connection or SQL writes. */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {runSourceOnly003fAudit} from './konkur-003f-proposal-audit.mjs';
const expected=Object.freeze(['eco_admission_cycles','eco_admission_documents',
 'eco_admission_document_pages','eco_admission_import_batches','eco_admission_import_rows',
 'eco_admission_programme_offerings','eco_admission_offering_conditions',
 'eco_admission_rule_versions']);
export function assessSchemaReuse({catalogueSql,proposalAudit}){
 if(typeof catalogueSql!=='string'||proposalAudit?.migrationAuthorized!==false||
  proposalAudit?.overlappingConcepts?.length!==4)
  throw new TypeError('Schema proposal must be reviewed without execution');
 const tables=[...catalogueSql.matchAll(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z][a-z0-9_]*)\s*\(/gi)].map(x=>x[1]);
 if(tables.length!==8||tables.some((t,i)=>t!==expected[i]))
  throw new TypeError('Catalogue DDL source drift, do not create new tables');
 return Object.freeze({
  status:'HISTORIC_SNAPSHOT_ONLY_LIVE_RECONCILIATION_PENDING',
  snapshotDate:'2026-10-21',
  previousSnapshotContains003e:true,
  previouslyObservedCatalogueTables:expected,
  previouslyObservedProviderTables:Object.freeze(['eco_exam_providers','eco_exam_series','eco_exam_results']),
  two003fProposalsMutuallyExclusive:true,
  newTablesRecommendedNow:0,
  currentProductionSchemaInspected:false,
  liveColumnTypeIndexAndFKChecksComplete:false,
  restoreTested:false,databaseChangesPermitted:false,
  nextAction:'Owner-authorized read-only current information_schema and version ledger comparison, then reuse existing schema. Do not run competing 003f proposals.'
 });
}
export function sourceOnlySchemaReuseAudit(){
 return assessSchemaReuse({
  catalogueSql:fs.readFileSync('database/unified/003e_admission_knowledge_catalog_PROPOSED.sql','utf8'),
  proposalAudit:runSourceOnly003fAudit()
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify(sourceOnlySchemaReuseAudit(),null,2));
