import assert from 'node:assert/strict';
import test from 'node:test';
import {talentCustomerCards} from '../assets/js/talent-dashboard-view-model.mjs';
const modules=[
 {module:'GOLDEN_TALENT',freeStage:{code:'ORIENTATION',state:'UNKNOWN',paymentRequired:false},paidStage:{state:'NOT_VERIFIED'},report:{state:'NOT_CONNECTED',scientificStatus:'PREVALIDATION'}},
 {module:'RCAS',freeStage:{code:'CONTEXT_REFLECTION',state:'COMPLETED',paymentRequired:false},paidStage:{state:'NOT_VERIFIED'},report:{state:'NOT_CONNECTED',scientificStatus:'PREVALIDATION'}},
 {module:'BAHAR',freeStage:{code:'STARTER_PLAN',state:'IN_PROGRESS',paymentRequired:false},paidStage:{state:'NOT_VERIFIED'},report:{state:'NOT_CONNECTED',scientificStatus:'PREVALIDATION'}}
];
const base={ok:true,schema:'talent-customer-overview-v1',viewerScope:'VERIFIED_SELF',modules,hasPrivateEvidence:false,normativeScoresAvailable:false,reportDownloadAvailable:false};
test('renders three bilingual fixed-code research stages without inventing scores',()=>{
 for(const lang of ['fa','en']){
   const v=talentCustomerCards(base,lang);
   assert.equal(v.verified,true);
   assert.deepEqual(v.cards.map(c=>c.stageState),['UNKNOWN','COMPLETED','IN_PROGRESS']);
   assert.ok(v.cards.every(c=>c.canDownloadReport===false&&c.canStartPaid===false));
   assert.ok(v.cards.every(c=>c.scientificNote.length>15&&c.reportNote.length>15));
 }
});
test('unverified or extra sensitive payload cannot be rendered as results',()=>{
 for(const payload of [null,{}, {...base,ok:false}, {...base,hasPrivateEvidence:true},
   {...base,reportDownloadAvailable:true}, {...base,normativeScoresAvailable:true},
   {...base,viewerScope:'UNVERIFIED'}, {...base,modules:[modules[0],modules[0],modules[2]]},
   {...base,modules:[...modules,{...modules[0]}]}]){
   const v=talentCustomerCards(payload,'fa');
   assert.equal(v.verified,false);
   assert.deepEqual(v.cards,[]);
 }
});
test('unknown paid status or fabricated clinical release fails closed',()=>{
 for (const patched of [
   {...modules[1],paidStage:{state:'ACTIVE'}},
   {...modules[1],report:{state:'RELEASED',scientificStatus:'VALIDATED'}},
   {...modules[1],freeStage:{...modules[1].freeStage,paymentRequired:true}},
   {...modules[1],freeStage:{...modules[1].freeStage,state:'DIAGNOSED'}}
 ]) {
   assert.equal(talentCustomerCards({...base,modules:[modules[0],patched,modules[2]]},'en').verified,false);
 }
});
test('extra raw answer is never copied to displayed card',()=>{
 const payload={...base,modules:[modules[0],{...modules[1],rawAnswers:'private answer',score:99},modules[2]]};
 const result=talentCustomerCards(payload,'fa');
 assert.equal(result.verified,true);
 const serialized=JSON.stringify(result);
 assert.equal(serialized.includes('private answer'),false);
 assert.equal(serialized.includes('99'),false);
});
test('invalid locale and empty state deny',()=>{
 assert.equal(talentCustomerCards(base,'ar').verified,false);
 assert.equal(talentCustomerCards({...base,modules:[]}).verified,false);
});
