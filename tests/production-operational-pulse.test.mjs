import test from 'node:test';
import assert from 'node:assert/strict';
import {authContract,commerceContract,guestContract,requireCondition} from '../scripts/production-operational-pulse.mjs';

const healthyAuth={ok:true,service:'auth',ready:true,registrationReady:true,
  database:true,schemaReady:true,email:true,passwordKdf:true};
const required={database:true,schema:true,publicTlsConfirmed:true,commerceEnabled:true,
  gatewayKeyConfigured:true,amountMultiplierValid:true,serviceBookingConfirmed:true,
  vipBookingConfirmed:false,bookShippingConfirmed:true,inventoryReconciled:true,
  orderEmailFulfilmentConfirmed:true,paymentClaimSchemaReady:true};
const healthyCommerce={ok:true,service:'commerce',hardeningRevision:'tls-gate-v1',
  checkout:true,orderCapture:true,requirements:required};

test('the monitor accepts truthful readiness without inventing transaction success',()=>{
  assert.match(authContract(healthyAuth),/configured/);
  const data=commerceContract(healthyCommerce);
  assert.equal(data.checkoutConfigured,true);
  assert.equal(data.vipBookingsConfigured,false);
  assert.equal(data.shippingConfigured,true);
  assert.ok(!Object.hasOwn(data,'bankSettlementProven'));
  assert.ok(!Object.hasOwn(data,'deliveryProven'));
});
test('missing any required account dependency fails closed',()=>{
  for(const field of ['ready','registrationReady','database','schemaReady','email','passwordKdf'])
    assert.throws(()=>authContract({...healthyAuth,[field]:false}),/auth_not_ready_/);
});
test('missing production commerce gate or checkout false fails closed',()=>{
  assert.throws(()=>commerceContract({...healthyCommerce,checkout:false}),/commerce_not_ready/);
  assert.throws(()=>commerceContract({...healthyCommerce,requirements:{...required,gatewayKeyConfigured:false}}),/commerce_gate_/);
  assert.throws(()=>commerceContract({...healthyCommerce,hardeningRevision:'old'}),/commerce_tls_version/);
});
test('private endpoints must deny anonymous requests',()=>{
  assert.equal(guestContract(401,{ok:false,error:'unauthorized'}),'anonymous access denied');
  for(const code of [200,302,403,404,503])
    assert.throws(()=>guestContract(code,{ok:false}),/guest_private_access/);
  assert.throws(()=>guestContract(401,{ok:true}),/guest_private_access/);
});
test('generic invariant helper has exact failure behavior',()=>{
  assert.doesNotThrow(()=>requireCondition(true,'ok'));
  assert.throws(()=>requireCondition(false,'safety_gate'),/safety_gate/);
});
