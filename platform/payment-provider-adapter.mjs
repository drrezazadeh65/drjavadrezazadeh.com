// Provider-neutral payment adapter boundary. Exact provider SDK/API code plugs in here later.
const REQUIRED_METHODS=['createIntent','verifyEvent','queryStatus'];

export function validatePaymentAdapter(adapter={}){
 if(!adapter.provider_key||!adapter.market||!adapter.currency) throw new Error('Payment adapter identity required');
 for(const method of REQUIRED_METHODS) if(typeof adapter[method]!=='function') throw new Error('Payment adapter method missing: '+method);
 if(adapter.refund!==undefined&&typeof adapter.refund!=='function') throw new Error('Refund capability must be a function when supplied');
 return {valid:true,provider_key:adapter.provider_key,market:adapter.market,currency:adapter.currency};
}

export function paymentEventDedupeKey({provider_key,event_type,provider_reference,event_id}={}){
 if(!provider_key||!event_type) throw new Error('Provider event identity required');
 const stable=String(event_id||provider_reference||'').trim();
 if(!stable) throw new Error('Provider event requires provider event id or reference');
 return [provider_key,event_type,stable].join(':');
}

export function planPaymentIntent({adapter,order,payment_intent_id,idempotency_key,return_url}={}){
 validatePaymentAdapter(adapter);
 if(!order?.id||!Number.isInteger(order.total_minor)||order.total_minor<=0||!order.currency) throw new Error('Persisted priced order required');
 if(order.currency!==adapter.currency) throw new Error('Adapter/order currency mismatch');
 if(!payment_intent_id||!idempotency_key||!/^https:\/\//i.test(String(return_url||''))) throw new Error('Payment intent identity and HTTPS return URL required');
 return {
  provider_key:adapter.provider_key,market:adapter.market,payment_intent_id,order_id:order.id,
  amount_minor:order.total_minor,currency:order.currency,idempotency_key,return_url,
  client_amount_authoritative:false,browser_payment_truth:false,status:'CREATED'
 };
}

export function normalizeProviderVerification({expected,result}={}){
 if(!expected?.payment_intent_id||!expected?.provider_key) throw new Error('Expected persisted payment intent required');
 if(result?.verified!==true) return {verified:false,reason_code:result?.reason_code||'PROVIDER_NOT_VERIFIED',grant_entitlement:false};
 if(!result.provider_reference) throw new Error('Verified provider reference required');
 if(result.amount_minor!==expected.amount_minor||result.currency!==expected.currency) throw new Error('Verified payment amount/currency mismatch');
 return {verified:true,provider_key:expected.provider_key,payment_intent_id:expected.payment_intent_id,provider_reference:result.provider_reference,amount_minor:result.amount_minor,currency:result.currency,verified_at:result.verified_at||null,grant_entitlement:false,next_state:'PAYMENT_VERIFIED'};
}

export function safeProviderEventRecord({payment_intent_id,provider_key,event_type,provider_reference,event_id,payload_hash,verification_state,safe_metadata={}}={}){
 if(!payment_intent_id||!payload_hash) throw new Error('Payment event intent and payload hash required');
 const event_dedupe_key=paymentEventDedupeKey({provider_key,event_type,provider_reference,event_id});
 return {payment_intent_id,provider_key,event_type,provider_reference:provider_reference||null,event_dedupe_key,payload_hash,verification_state,safe_metadata,raw_payload_stored:false};
}
