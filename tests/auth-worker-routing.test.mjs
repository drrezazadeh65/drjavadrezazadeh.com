import assert from 'node:assert/strict';
import candidate from '../payment-api/worker-single-file-candidate.js';
import corrected from '../payment-api/worker-v4.4-corrected.js';

// These mocks deliberately exclude the payment provider. Authentication routing
// must run before unrelated commerce prerequisites are evaluated.
const env={
  DB:{prepare(sql){
    return {async first(){return null}};
  }},
  AUTH_PEPPER:'test-only',
  RESEND_API_KEY:'test-only'
};

for(const [name,worker] of [['candidate',candidate],['corrected',corrected]]){
  const health=await worker.fetch(new Request('https://worker.example/auth/health'),env);
  assert.equal(health.status,200,`${name}: /auth/health must not fall through to 404`);
  const data=await health.json();
  assert.equal(data.service,'auth',`${name}: auth handler should own health`);
  assert.equal(data.registrationReady,false,`${name}: email delivery gate must stay closed`);

  const preflight=await worker.fetch(new Request('https://worker.example/auth/register',{
    method:'OPTIONS',
    headers:{Origin:'https://drjavadrezazadeh.com','Access-Control-Request-Method':'POST'}
  }),env);
  assert.equal(preflight.status,204,`${name}: preflight must be routed to auth`);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://drjavadrezazadeh.com');

  const blocked=await worker.fetch(new Request('https://worker.example/auth/register',{
    method:'POST',
    headers:{Origin:'https://drjavadrezazadeh.com','Content-Type':'application/json'},
    body:JSON.stringify({email:'test@example.invalid',mobile:'+989000000000',password:'test-password-very-long'})
  }),env);
  assert.equal(blocked.status,503,`${name}: new registration must fail closed until delivery verified`);
  assert.equal((await blocked.json()).error,'verification_email_unavailable');
}

console.log('PASS: candidate and corrected Worker route account requests before commerce');
