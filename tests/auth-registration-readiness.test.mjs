import assert from 'node:assert/strict';
import { auth } from '../payment-api/auth-routes.js';

const origin='https://drjavadrezazadeh.com';
const tables=['customer_accounts','customer_auth_tokens','customer_auth_sessions','customer_auth_rate_limits'];

function mockDb(present){
  return {prepare(sql){
    return {async first(){
      const table=sql.match(/FROM (customer_[a-z_]+)/)?.[1];
      if(!present.includes(table))throw new Error('no such table');
      return null;
    }};
  }};
}
async function health(env){
  const response=await auth(new Request('https://worker.example/auth/health',{method:'GET'}),env);
  assert.equal(response.status,200);
  return response.json();
}
const base={RESEND_API_KEY:'test-configured',AUTH_PEPPER:'test-configured'};

const missing=await health({...base,DB:mockDb(tables.slice(0,3))});
assert.equal(missing.ready,false,'partial migrations must not pass the readiness gate');
assert.equal(missing.registrationReady,false);

const unverified=await health({...base,DB:mockDb(tables)});
assert.equal(unverified.ready,true,'existing sign-in can remain available');
assert.equal(unverified.registrationReady,false,'registration requires verified email delivery');

const ready=await health({...base,DB:mockDb(tables),AUTH_EMAIL_DELIVERY_VERIFIED:'true'});
assert.equal(ready.registrationReady,true);

const forbidden=await auth(new Request('https://worker.example/auth/register',{
  method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
  body:JSON.stringify({email:'sample@example.test',mobile:'+989000000000',password:'test-password-very-long'})
}),{...base,DB:mockDb(tables)});
assert.equal(forbidden.status,503);
assert.equal((await forbidden.json()).error,'verification_email_unavailable');

console.log('PASS: auth tables, delivery gating and fail-closed registration');
