import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditProposed003f,rejectCombined003fSelection,runSourceOnly003fAudit,PROPOSALS} from '../scripts/konkur-003f-proposal-audit.mjs';
test('competing 003f source proposals are inventoried, not applied or combined',()=>{
 const result=runSourceOnly003fAudit();
 assert.equal(result.state,'MUTUALLY_EXCLUSIVE_PENDING_LIVE_SCHEMA_RECONCILIATION');
 assert.deepEqual(result.proposedTableCounts,{full:9,compact:4});
 assert.equal(result.overlappingConcepts.length,4);
 assert.equal(result.migrationAuthorized,false);
 assert.equal(result.connectedToProduction,false);
 assert.equal(result.liveSchemaInventoried,false);
 assert.equal(result.consentAndGuardianOperationsCertified,false);
 assert.equal(new Set([...result.fullTables,...result.compactTables]).size,13);
});
test('selecting both 003f migrations together is explicitly rejected',()=>{
 assert.throws(()=>rejectCombined003fSelection([PROPOSALS.full,PROPOSALS.compact]),/overlapping 003f/);
 for(const choice of [[],[PROPOSALS.full],[PROPOSALS.compact]]){
  const plan=rejectCombined003fSelection(choice);
  assert.equal(plan.databaseOperationAuthorized,false);
 }
});
test('all unexpected SQL drift or write-bearing proposals stop source audit',()=>{
 const src=fs.readFileSync(PROPOSALS.full,'utf8');
 const compact=fs.readFileSync(PROPOSALS.compact,'utf8');
 assert.throws(()=>auditProposed003f({full:src,compact:compact+'\nCREATE TABLE IF NOT EXISTS eco_danger (id INT);'}),/drift/);
 assert.throws(()=>auditProposed003f({full:src+'\nDROP TABLE customer_accounts;',compact}),/drift/);
 assert.throws(()=>auditProposed003f({full:src,compact:compact+'\nINSERT INTO eco_exam_scorecards VALUES (1);'}),/drift/);
});
test('mother database governance remains source-only until authenticated inventory',()=>{
 const doc=fs.readFileSync('docs/governance/JR_EDUCATIONAL_INTELLIGENCE_V3_IMPLEMENTATION_20261021.md','utf8');
 assert.match(doc,/Two distinct proposed 003f migrations/);
 assert.match(doc,/MUTUALLY EXCLUSIVE/);
 assert.match(doc,/NO DATABASE MIGRATION/);
});
