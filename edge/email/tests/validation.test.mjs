import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMessage } from '../src/index.js';

const valid={
  type:'registration_verification',
  to:'student@example.org',
  subject:'Verify your email',
  text:'Use the one-time verification link from your account.',
  idempotencyKey:'registration:12345678'
};

test('valid transactional payload is normalized',()=>{
  const result=validateMessage(valid);
  assert.equal(result.from,'info@drjavadrezazadeh.com');
  assert.deepEqual(result.to,['student@example.org']);
});

for(const [label,patch] of [
  ['unsupported type',{type:'bulk_marketing'}],
  ['invalid recipient',{to:'not-an-email'}],
  ['missing recipient',{to:undefined}],
  ['empty subject',{subject:'  '}],
  ['empty body',{text:''}],
  ['missing idempotency key',{idempotencyKey:undefined}],
  ['malformed idempotency key',{idempotencyKey:'x'}],
]){
  test('rejects '+label,()=>{
    assert.throws(()=>validateMessage({...valid,...patch}));
  });
}
