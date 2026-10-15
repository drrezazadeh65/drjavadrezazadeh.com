import test from 'node:test';
import assert from 'node:assert/strict';
import {authoriseFreeStageFromPersistedHistory as gate} from './free-first-stage-consent-adapter.mjs';

const now=Date.parse('2026-10-16T12:00:00Z');
const actor={record_source:'PERSISTED',session_verified:true,account_id:'student'};
const subject={record_source:'PERSISTED',id:'subject',student_account_id:'student',is_minor:false};
const grant={record_source:'PERSISTED',subject_id:'subject',purpose:'ASSESSMENT',sequence:1,
 decision:'GRANTED',decided_at:'2026-10-15T10:00:00Z',policy_version:'v1',
 granted_by_account_id:'student'};
const request=(overrides={})=>({
 module:'GOLDEN_TALENT',stage:'ORIENTATION',actor,subject,consents:[grant],now,...overrides
});
test('all three free stages require current persisted assessment grant',()=>{
 for(const [module,stage] of Object.entries({GOLDEN_TALENT:'ORIENTATION',RCAS:'CONTEXT_REFLECTION',BAHAR:'STARTER_PLAN'})){
  const result=gate(request({module,stage}));
  assert.equal(result.allowed,true,module);
  assert.equal(result.payment_required,false,module);
 }
});
test('later withdrawal revokes free stage',()=>{
 const withdrawal={...grant,sequence:2,decision:'WITHDRAWN',decided_at:'2026-10-16T11:00:00Z'};
 assert.equal(gate(request({consents:[grant,withdrawal]})).allowed,false);
});
test('later regrant restores access only for the current owner',()=>{
 const withdrawal={...grant,sequence:2,decision:'WITHDRAWN',decided_at:'2026-10-16T10:00:00Z'};
 const regrant={...grant,sequence:3,decided_at:'2026-10-16T11:00:00Z'};
 assert.equal(gate(request({consents:[grant,withdrawal,regrant]})).allowed,true);
 assert.equal(gate(request({actor:{...actor,account_id:'stranger'},consents:[grant,withdrawal,regrant]})).allowed,false);
});
test('duplicate latest sequence, incomplete history and future decisions fail closed',()=>{
 assert.equal(gate(request({consents:[grant,{...grant,decision:'WITHDRAWN'}]})).allowed,false);
 assert.equal(gate(request({consents:null})).allowed,false);
 assert.equal(gate(request({consents:[{...grant,decided_at:'2026-10-17T12:00:00Z'}]})).allowed,false);
});
test('minor requires verified guardian, explicit capability and guardian consent',()=>{
 const child={...subject,is_minor:true,guardian_account_id:'parent'};
 const parent={...actor,account_id:'parent'};
 const consent={...grant,granted_by_account_id:'parent',guardian_verified:true};
 const relation={record_source:'PERSISTED',type:'GUARDIAN',state:'VERIFIED',
  subject_id:'subject',actor_id:'parent',capabilities:['START_FREE_STAGE']};
 assert.equal(gate(request({subject:child,actor:parent,consents:[consent],relationships:[relation]})).allowed,true);
 assert.equal(gate(request({subject:child,actor:parent,consents:[consent],relationships:[{...relation,capabilities:[]}]})).allowed,false);
 assert.equal(gate(request({subject:child,actor:parent,consents:[{...consent,guardian_verified:false}],relationships:[relation]})).allowed,false);
});
test('paid stage never unlocked by free consent',()=>{
 assert.equal(gate(request({stage:'PROFESSIONAL_REPORT'})).allowed,false);
});
