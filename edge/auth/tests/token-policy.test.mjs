import test from 'node:test';
import assert from 'node:assert/strict';
import {newOpaqueToken,hashToken,tokenRecord,canConsumeToken} from '../reference/token-policy.mjs';

test('opaque tokens have 256 bits of randomness and are distinct',()=>{
  const a=newOpaqueToken(),b=newOpaqueToken();
  assert.equal(a.length,43); assert.notEqual(a,b);
  assert.equal(hashToken(a).length,64);
});
test('verification token accepts only matching purpose and valid lifetime',()=>{
  const token=newOpaqueToken(),record=tokenRecord({token,purpose:'verify_email',accountId:'user-1',now:1000});
  assert.equal(canConsumeToken(record,token,'verify_email',1001),true);
  assert.equal(canConsumeToken(record,token,'reset_password',1001),false);
  assert.equal(canConsumeToken(record,token,'verify_email',record.expiresAt),false);
  assert.equal(canConsumeToken(record,newOpaqueToken(),'verify_email',1001),false);
});
test('consumed token is rejected',()=>{
  const token=newOpaqueToken(),record=tokenRecord({token,purpose:'reset_password',accountId:'user-1'});
  record.consumedAt=Date.now();
  assert.equal(canConsumeToken(record,token,'reset_password'),false);
});
test('invalid token, purpose and ttl are rejected',()=>{
  assert.throws(()=>hashToken('short'));
  const token=newOpaqueToken();
  assert.throws(()=>tokenRecord({token,purpose:'unknown',accountId:'user-1'}));
  assert.throws(()=>tokenRecord({token,purpose:'verify_email',accountId:'user-1',ttlMs:1}));
});
