import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workerSafeErrorCode} from
  '../platform/jrei-v5/windows-worker/jrei-worker-error-code.mjs';

const wrapped=code=>new TypeError('fetch failed',{
  cause:Object.assign(new Error('private server detail must never appear'),{code})
});
test('DNS and TLS diagnostic classification never exposes private cause text',()=>{
  assert.equal(workerSafeErrorCode(wrapped('ENOTFOUND')),'WORKER_DNS_RESOLUTION_FAILED');
  assert.equal(workerSafeErrorCode(wrapped('EAI_AGAIN')),'WORKER_DNS_RESOLUTION_FAILED');
  assert.equal(workerSafeErrorCode(wrapped('CERT_HAS_EXPIRED')),'WORKER_TLS_VERIFICATION_FAILED');
  assert.equal(workerSafeErrorCode(wrapped('UNABLE_TO_VERIFY_LEAF_SIGNATURE')),
    'WORKER_TLS_VERIFICATION_FAILED');
});
test('network and timeouts receive stable nonsecret classifications',()=>{
  for(const code of ['ECONNRESET','ECONNREFUSED','ENETUNREACH','UND_ERR_SOCKET'])
    assert.equal(workerSafeErrorCode(wrapped(code)),'WORKER_NETWORK_CONNECT_FAILED');
  for(const code of ['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'])
    assert.equal(workerSafeErrorCode(wrapped(code)),'WORKER_HTTPS_TIMEOUT');
  assert.equal(workerSafeErrorCode(Object.assign(new Error('This contains private IP'),{
    name:'AbortError'})),'WORKER_HTTPS_TIMEOUT');
});
test('domain codes remain unchanged and raw errors never leak',()=>{
  assert.equal(workerSafeErrorCode(Error('WORKER_NOT_AUTHORIZED')),'WORKER_NOT_AUTHORIZED');
  assert.equal(workerSafeErrorCode(Error('WORKER_BACKEND_UNAVAILABLE')),'WORKER_BACKEND_UNAVAILABLE');
  assert.equal(workerSafeErrorCode(wrapped('PRIVATE_LEAK_CODE')),'WORKER_HTTPS_TRANSPORT_FAILED');
  assert.equal(workerSafeErrorCode(new Error('https://private.example/token?a=123')),
    'TEMPORARILY_UNAVAILABLE');
  assert.equal(workerSafeErrorCode(new SyntaxError('Unexpected token from private body')),
    'WORKER_RESPONSE_JSON_INVALID');
});
test('Node aggregate failures are sanitized',()=>{
  const e=new TypeError('fetch failed',{cause:new AggregateError([
    Object.assign(Error('opaque'),{code:'ENETUNREACH'})
  ],'secret')});
  assert.equal(workerSafeErrorCode(e),'WORKER_NETWORK_CONNECT_FAILED');
});
