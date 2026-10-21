/* JR Konkur source-only audit for two MUTUALLY EXCLUSIVE proposed 003f schemas.
 * This tool does not connect to a database, migrate data, or authorize either plan.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const PROPOSALS=Object.freeze({
 full:'database/unified/003f_candidate_exam_data_PROPOSED.sql',
 compact:'database/unified/003f_konkur_scorecard_adapters_PROPOSED.sql'
});
const EXPECTED=Object.freeze({
 full:Object.freeze(['eco_exam_providers','eco_exam_scorecard_schemas','eco_exam_metric_definitions',
  'eco_exam_events','eco_candidate_exam_attempts','eco_candidate_exam_metric_values',
  'eco_candidate_selection_drafts','eco_candidate_selection_choices','eco_exam_component_policies']),
 compact:Object.freeze(['eco_exam_score_providers','eco_exam_score_events',
  'eco_exam_scorecards','eco_exam_scorecard_measures'])
});
const ROLE_PAIRS=Object.freeze([
 ['PROVIDER_DIRECTORY','eco_exam_providers','eco_exam_score_providers'],
 ['EXAM_EVENT','eco_exam_events','eco_exam_score_events'],
 ['PRIVATE_EXAM_RECORD','eco_candidate_exam_attempts','eco_exam_scorecards'],
 ['SUBJECT_METRIC_VALUE','eco_candidate_exam_metric_values','eco_exam_scorecard_measures'],
]);
const bare=source=>source.replace(/^\s*--[^\n]*/gm,'');
function inventory(source){
 const sql=bare(source);
 const names=[...sql.matchAll(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z][a-z0-9_]*)\s*\(/gi)].map(m=>m[1]);
 const unsafe=/\b(?:CREATE\s+(?:DATABASE|USER)|DROP\s+TABLE|ALTER\s+TABLE|TRUNCATE\s+TABLE|INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM)\b/i.test(sql);
 return Object.freeze({names:Object.freeze(names),unsafe});
}
export function auditProposed003f({full,compact}){
 if(typeof full!=='string'||typeof compact!=='string')throw new TypeError('Both source proposals are required');
 const a=inventory(full),b=inventory(compact);
 const expected=(actual,reference)=>actual.length===reference.length&&actual.every((name,i)=>name===reference[i]);
 if(!expected(a.names,EXPECTED.full)||!expected(b.names,EXPECTED.compact)||a.unsafe||b.unsafe)
  throw new Error('003f source drift; proposals must be manually reconciled before any migration');
 const roles=ROLE_PAIRS.map(([role,fullTable,compactTable])=>Object.freeze({role,fullTable,compactTable}));
 return Object.freeze({
  state:'MUTUALLY_EXCLUSIVE_PENDING_LIVE_SCHEMA_RECONCILIATION',
  migrationAuthorized:false,connectedToProduction:false,
  proposedTableCounts:Object.freeze({full:a.names.length,compact:b.names.length}),
  fullTables:a.names,compactTables:b.names,
  overlappingConcepts:Object.freeze(roles),
  liveSchemaInventoried:false,consentAndGuardianOperationsCertified:false,
  rule:'Do not apply both 003f plans, do not add both table families, do not store candidate data before authenticated live-schema, identity, consent, retention and backup-restore acceptance.'
 });
}
export function rejectCombined003fSelection(paths=[]){
 if(!Array.isArray(paths))throw new TypeError('Migration selection must be an array');
 const chosen=Object.values(PROPOSALS).filter(path=>paths.includes(path));
 if(chosen.length>1)throw new Error('Two overlapping 003f migrations selected; block database changes');
 return Object.freeze({simultaneous003fSelectionRejected:true,selected003f:chosen[0]??null,
  databaseOperationAuthorized:false});
}
export function runSourceOnly003fAudit(){
 return auditProposed003f({
  full:fs.readFileSync(PROPOSALS.full,'utf8'),
  compact:fs.readFileSync(PROPOSALS.compact,'utf8')
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const audit=runSourceOnly003fAudit();
 if(process.argv.includes('--check')){
  console.log(JSON.stringify({state:audit.state,proposedTableCounts:audit.proposedTableCounts,
   overlappingConcepts:audit.overlappingConcepts.length,migrationAuthorized:false}));
 }else console.log(JSON.stringify(audit,null,2));
}
