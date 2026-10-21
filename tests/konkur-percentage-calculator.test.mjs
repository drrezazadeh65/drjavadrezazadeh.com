import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateExamPercentage,PERCENTAGE_CALCULATOR_SCHEMA} from '../assets/js/jr-konkur-percentage-v1.mjs';
const input={correct:20,incorrect:5,unanswered:5,correctWeight:3,wrongPenalty:1,blankPenalty:0};
test('configurable raw percentage uses all three explicit answer counts and scoring weights',()=>{
 const r=calculateExamPercentage(input);
 assert.equal(r.status,'CALCULATED');
 assert.equal(r.rawPercentage,61.11);
 assert.equal(r.total,30);
 assert.equal(r.earnedPoints,55);
 assert.equal(r.maximumPoints,90);
 assert.equal(r.schema,PERCENTAGE_CALCULATOR_SCHEMA);
 assert.equal(r.admissionProbability,null);
 assert.equal(r.officialScore,false);
 assert.equal(r.taz,null);
 assert.equal(r.rank,null);
 assert.ok(Object.isFrozen(r));
 assert.ok(Object.isFrozen(r.scoringRule));
});
test('no negative marking and configurable blank penalty remain descriptive',()=>{
 assert.equal(calculateExamPercentage({...input,wrongPenalty:0}).rawPercentage,66.67);
 assert.equal(calculateExamPercentage({...input,blankPenalty:1}).rawPercentage,55.56);
 assert.equal(calculateExamPercentage({correct:0,incorrect:3,unanswered:0,correctWeight:3,wrongPenalty:1,blankPenalty:0}).rawPercentage,-33.33);
});
test('all invalid counts and weights fail closed without a fabricated result',()=>{
 const variants=[{...input,correct:-1},{...input,correct:1.5},{...input,correct:'20'},
  {...input,wrongPenalty:NaN},{...input,correctWeight:0},{...input,blankPenalty:-1},
  {...input,incorrect:100001},{...input,correct:0,incorrect:0,unanswered:0},
  {...input,correct:60000,incorrect:60000},{...input,unanswered:Infinity},null,undefined];
 for(const variant of variants){
  const r=calculateExamPercentage(variant??undefined);
  assert.equal(r.status,'INVALID_INPUT');
  assert.equal(r.rawPercentage,null);
  assert.equal(r.admissionProbability,null);
  assert.equal(r.officialScore,false);
 }
});
test('unexpected properties are ignored and results remain only aggregate statistics',()=>{
 const r=calculateExamPercentage({...input,studentName:'Private',nationalId:'Private'});
 assert.equal(r.status,'CALCULATED');
 assert.equal('studentName' in r,false);
 assert.equal('nationalId' in r,false);
 assert.equal(r.officiallyVerified,false);
});
