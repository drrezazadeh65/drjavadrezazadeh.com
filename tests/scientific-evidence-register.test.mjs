import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {evidenceMeetsSpecifiedUseGate} from '../platform/scientific-evidence-policy.mjs';

const registry=JSON.parse(fs.readFileSync('platform/scientific-evidence-register.v1.json','utf8'));
const profileId=r=>r.instrument_id+'|'+r.edition+'|'+r.language;
const expected=new Set([
  'GOLDEN_TALENT|framework-multisource-2026|fa',
  'GOLDEN_TALENT|framework-multisource-2026|en',
  'RCAS_START|start-1.2|fa',
  'RCAS_START|start-en-pilot-1|en',
  'BAHAR|formative-browser-1.0|fa',
  'BAHAR|formative-browser-1.0|en'
]);
test('six purpose-scoped FA/EN research profiles are individually registered',()=>{
 assert.equal(registry.schema_version,'scientific-evidence-register-v1');
 assert.equal(registry.production_release_allowed,false);
 assert.equal(registry.no_implied_certification,true);
 assert.equal(registry.records.length,expected.size);
 assert.deepEqual(new Set(registry.records.map(profileId)),expected);
 const protocol=fs.readFileSync(registry.canonical_protocol,'utf8');
 for(let i=1;i<=12;i++)assert.match(protocol,new RegExp('G'+String(i).padStart(2,'0')));
 for(const item of registry.records){
   assert.equal(item.status,'EVIDENCE_PENDING');
   assert.equal(item.scored_claims_allowed,false);
   assert.equal(item.normative_claims_allowed,false);
   assert.equal(item.empirical_dossier_sha256,null);
   assert.equal(item.independent_approval_reference,null);
   assert.equal(item.ethical_study_reference,null);
   assert.equal(item.board_signed,false);
   assert.ok(item.gates_required.includes('G12'));
 }
});
test('no evidence-pending instrument can unlock validated release through the independent gate',()=>{
 const instrument={code:'RCAS',version:'1.0',locale:'fa',item_bank_checksum:'sha256:synthetic',
   scoring_version:'1.0',content_sha256:crypto.createHash('sha256').update('synthetic').digest('hex')};
 const admin={target_population:'adult-learning',intended_use:'educational-guidance'};
 for(const item of registry.records){
   const provisional={
     schema_version:'scientific-reviewed-claim-v1',
     instrument_code:instrument.code,instrument_version:instrument.version,
     locale:instrument.locale,item_bank_checksum:instrument.item_bank_checksum,
     scoring_version:instrument.scoring_version,
     target_population:admin.target_population,intended_use:admin.intended_use,
     instrument_content_sha256:instrument.content_sha256,
     record_source:item.status,
     evidence_bundle_sha256:item.empirical_dossier_sha256,
     scientific_status:item.status,
     approval_state:'PENDING'
   };
   assert.equal(evidenceMeetsSpecifiedUseGate(provisional,instrument,admin,
       '2026-10-16T12:00:00Z'),false);
 }
});
test('published free browser assets still cannot silently score or persist answers',()=>{
 const files=['assets/js/rcas-start.js','assets/js/rcas-start-en.js',
              'assets/js/bahar-formative-workspace-v1.js'];
 for(const path of files){
   const source=fs.readFileSync(path,'utf8');
   assert.ok(source.length>100,path+' unexpectedly empty');
 }
 const bahar=fs.readFileSync(files[2],'utf8');
 for(const forbidden of ['localStorage','sessionStorage','fetch(','XMLHttpRequest(','WebSocket(']){
   assert.ok(!bahar.includes(forbidden),'BAHAR privacy breach: '+forbidden);
 }
});


test('three independent human-study workstreams have real instructions but zero fabricated evidence',()=>{
 const ops=JSON.parse(fs.readFileSync('platform/scientific-study-ops.v1.json','utf8'));
 assert.equal(ops.schema_version,'scientific-study-operations-v1');
 assert.equal(ops.all_live_intake_blocked,true);
 assert.equal(ops.owner_signoff_is_not_independent_approval,true);
 assert.equal(ops.studies.length,3);
 assert.deepEqual(new Set(ops.studies.map(s=>s.instrument)),
   new Set(['GOLDEN_TALENT','RCAS_START','BAHAR']));
 for(const study of ops.studies){
   const text=fs.readFileSync(study.protocol_path,'utf8');
   assert.ok(text.length>2500,study.study_id+' operational protocol incomplete');
   assert.equal(study.ethics_approval,'NOT_SUBMITTED');
   assert.equal(study.preregistration,'NOT_SUBMITTED');
   assert.equal(study.recruitment,'NOT_STARTED');
   assert.equal(study.external_review,'NOT_STARTED');
   assert.equal(study.empirical_results,'NONE');
   assert.equal(study.authorised_to_claim_validity,false);
   assert.ok(study.needed_roles.length>=3);
 }
 assert.equal(ops.release_boundaries.private_minor_records,false);
 assert.equal(ops.release_boundaries.psychometric_norms,false);
 assert.equal(ops.release_boundaries.validated_use_claims,false);
 assert.equal(ops.release_boundaries.adult_ephemeral_bahar_worksheet,true);
});
