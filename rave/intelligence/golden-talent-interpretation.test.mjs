import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTalentInterpretation} from './golden-talent-interpretation.mjs';
const instrument={id:'exploratory',version:'0.1.0',items:[{id:'q1',dimension:'creativity',maxScore:4,promptFa:'نمونه'}]};
test('generates cautious descriptive report',()=>{
 const r=buildTalentInterpretation({instrument,responses:[{itemId:'q1',score:3}],audience:'parent'});
 assert.equal(r.status,'exploratory');assert.equal(r.dimensions[0].percentOfAvailablePoints,75);
 assert.equal(r.automaticPlacement,false);assert.equal(r.requiresCounselorReview,true);
});
test('blocks incomplete responses',()=>{
 const r=buildTalentInterpretation({instrument,responses:[]});
 assert.equal(r.status,'blocked');assert.ok(r.issues.includes('missing_response'));
});
test('rejects unknown audience',()=>assert.throws(()=>buildTalentInterpretation({instrument,responses:[],audience:'unknown'}),Error));
