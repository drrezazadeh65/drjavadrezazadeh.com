import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTalentInstrument,evaluateTalentResponseQuality} from './golden-talent-instrument-governance.mjs';
const instrument={id:'gt-exploratory',version:'0.1.0',items:[{id:'q1',dimension:'creative',maxScore:4,promptFa:'نمونه سؤال'}]};
test('validates versioned instrument without psychometric claims',()=>{
 const result=validateTalentInstrument(instrument);
 assert.equal(result.valid,true);assert.equal(result.psychometricallyValidated,false);
});
test('flags missing answers before scoring',()=>{
 const result=evaluateTalentResponseQuality(instrument,[]);
 assert.equal(result.eligibleForScoring,false);assert.ok(result.issues.includes('missing_response'));
});
test('flags out-of-range scores',()=>{
 const result=evaluateTalentResponseQuality(instrument,[{itemId:'q1',score:5}]);
 assert.equal(result.complete,false);assert.ok(result.issues.includes('invalid_score'));
});
test('rejects duplicate item identifiers',()=>{
 const invalid={...instrument,items:[...instrument.items,...instrument.items]};
 assert.throws(()=>validateTalentInstrument(invalid),Error);
});
