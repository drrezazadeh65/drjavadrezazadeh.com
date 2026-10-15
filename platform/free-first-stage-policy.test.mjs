import assert from 'node:assert/strict';
import test from 'node:test';
import {authoriseFreeFirstStage as gate,FREE_STAGE_MODULES} from './free-first-stage-policy.mjs';
const actor={record_source:'PERSISTED',session_verified:true,account_id:'a1'};
const subject={record_source:'PERSISTED',id:'s1',student_account_id:'a1',is_minor:false};
const assessmentConsent={record_source:'PERSISTED',subject_id:'s1',purpose:'ASSESSMENT',decision:'GRANTED',is_current:true,policy_version:'v1',granted_by_account_id:'a1'};
const stages={GOLDEN_TALENT:'ORIENTATION',RCAS:'CONTEXT_REFLECTION',BAHAR:'STARTER_PLAN'};
for(const module of FREE_STAGE_MODULES)test(module+' first stage is free without payment',()=>{
 const result=gate({module,stage:stages[module],actor,subject,assessmentConsent});
 assert.equal(result.allowed,true);assert.equal(result.payment_required,false);assert.equal(result.tier,'FREE');
});
test('paid and unknown stages are not made free',()=>{
 assert.equal(gate({module:'RCAS',stage:'ADVANCED_REPORT',actor,subject,assessmentConsent}).allowed,false);
 assert.equal(gate({module:'UNKNOWN',stage:'ORIENTATION',actor,subject,assessmentConsent}).allowed,false);
});
test('no consent, spoofed identity and cross-child access fail closed',()=>{
 assert.equal(gate({module:'RCAS',stage:stages.RCAS,actor,subject,assessmentConsent:{...assessmentConsent,decision:'WITHDRAWN'}}).allowed,false);
 assert.equal(gate({module:'RCAS',stage:stages.RCAS,actor:{...actor,record_source:'CLIENT'},subject,assessmentConsent}).allowed,false);
 assert.equal(gate({module:'RCAS',stage:stages.RCAS,actor:{...actor,account_id:'other'},subject,assessmentConsent}).allowed,false);
});
test('minor needs verified guardian consent',()=>{
 const child={...subject,is_minor:true,guardian_account_id:'g1'};
 const guardian={...actor,account_id:'g1'};
 const relation={record_source:'PERSISTED',state:'VERIFIED',subject_id:'s1',actor_id:'g1'};
 const consent={...assessmentConsent,granted_by_account_id:'g1',guardian_verified:true};
 assert.equal(gate({module:'BAHAR',stage:stages.BAHAR,actor:guardian,subject:child,guardianRelation:relation,assessmentConsent:consent}).allowed,true);
 assert.equal(gate({module:'BAHAR',stage:stages.BAHAR,actor:guardian,subject:child,guardianRelation:relation,assessmentConsent:{...consent,guardian_verified:false}}).allowed,false);
});

test('unknown or unverified age classification fails closed',()=>{
 for(const value of [undefined,null,'false','true']){
  const result=gate({module:'RCAS',stage:stages.RCAS,actor,
    subject:{...subject,is_minor:value},assessmentConsent});
  assert.equal(result.allowed,false,String(value));
  assert.equal(result.reason,'AGE_CLASSIFICATION_REQUIRED');
 }
});
