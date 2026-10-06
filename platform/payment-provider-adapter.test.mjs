import assert from 'node:assert/strict';
import {validatePaymentAdapter,paymentEventDedupeKey,planPaymentIntent,normalizeProviderVerification,safeProviderEventRecord} from './payment-provider-adapter.mjs';

const fake={provider_key:'fake',market:'IR',currency:'IRR',createIntent:async()=>({}),verifyEvent:async()=>({}),queryStatus:async()=>({})};
assert.equal(validatePaymentAdapter(fake).valid,true);
assert.throws(()=>validatePaymentAdapter({provider_key:'bad'}));
const plan=planPaymentIntent({adapter:fake,order:{id:'o1',total_minor:100000,currency:'IRR'},payment_intent_id:'pi1',idempotency_key:'k1',return_url:'https://app.example.test/payments/return'});
assert.equal(plan.client_amount_authoritative,false);
assert.equal(plan.browser_payment_truth,false);
assert.equal(paymentEventDedupeKey({provider_key:'fake',event_type:'CALLBACK',provider_reference:'ref1'}),'fake:CALLBACK:ref1');
const verified=normalizeProviderVerification({expected:{payment_intent_id:'pi1',provider_key:'fake',amount_minor:100000,currency:'IRR'},result:{verified:true,provider_reference:'ref1',amount_minor:100000,currency:'IRR'}});
assert.equal(verified.verified,true);
assert.equal(verified.grant_entitlement,false);
assert.throws(()=>normalizeProviderVerification({expected:{payment_intent_id:'pi1',provider_key:'fake',amount_minor:100000,currency:'IRR'},result:{verified:true,provider_reference:'ref1',amount_minor:99999,currency:'IRR'}}));
const event=safeProviderEventRecord({payment_intent_id:'pi1',provider_key:'fake',event_type:'CALLBACK',provider_reference:'ref1',payload_hash:'sha256:example',verification_state:'VERIFIED'});
assert.equal(event.raw_payload_stored,false);
console.log('Payment provider adapter contract passed');
