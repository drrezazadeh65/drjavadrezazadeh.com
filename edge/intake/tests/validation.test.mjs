import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntake} from '../src/validation.js';

test('accepts and normalizes a valid request',()=>{
  assert.deepEqual(validateIntake({name:'  Sara  ',email:'  SARA@Example.org ',role:'student'}),{name:'Sara',email:'sara@example.org',role:'student'});
});
for(const [label,data] of [
  ['empty payload',null],['array payload',[]],
  ['invalid email',{name:'Sara',email:'bad',role:'student'}],
  ['unsupported role',{name:'Sara',email:'sara@example.org',role:'admin'}],
  ['missing name',{email:'sara@example.org',role:'student'}],
  ['long name',{name:'a'.repeat(101),email:'sara@example.org',role:'student'}]
]){
  test('rejects '+label,()=>assert.equal(validateIntake(data),null));
}
test('removes newline injection from name',()=>{
  assert.equal(validateIntake({name:'Sara\nInjected',email:'sara@example.org',role:'book'}).name,'Sara Injected');
});
