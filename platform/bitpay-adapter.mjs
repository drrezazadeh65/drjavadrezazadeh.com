// BitPay server-side adapter contract.
// Secrets must be injected at runtime; never place API keys in Git, browser JS, URLs or logs.

export const BITPAY_PRODUCTION = Object.freeze({
  create: 'https://bitpay.ir/payment/gateway-send',
  payTemplate: 'https://bitpay.ir/payment/gateway-{id_get}-get',
  verify: 'https://bitpay.ir/payment/gateway-result-second'
});

function formEncode(data={}){
  return new URLSearchParams(
    Object.entries(data).filter(([,v])=>v!==undefined&&v!==null&&String(v)!=='')
      .map(([k,v])=>[k,String(v)])
  ).toString();
}

export function buildBitPayCreateRequest({
  api, amount, redirect, factorId, name='', email='', description='', mobile=''
}={}){
  if(!api) throw new Error('BITPAY_API secret is required');
  if(!Number.isInteger(amount)||amount<=0) throw new Error('Positive integer BitPay amount required');
  if(!/^https:\/\//i.test(String(redirect||''))) throw new Error('HTTPS redirect URL required');
  if(factorId===undefined||factorId===null||String(factorId).trim()==='') throw new Error('factorId required');
  return {
    url: BITPAY_PRODUCTION.create,
    method: 'POST',
    headers: {'content-type':'application/x-www-form-urlencoded'},
    body: formEncode({api,amount,redirect,factorId,name,email,description,mobile})
  };
}

export function bitPayRedirectUrl(id_get){
  const id=String(id_get||'').trim();
  if(!/^\d+$/.test(id)) throw new Error('Valid BitPay id_get required');
  return BITPAY_PRODUCTION.payTemplate.replace('{id_get}',id);
}

export function buildBitPayVerifyRequest({api,trans_id,id_get}={}){
  if(!api) throw new Error('BITPAY_API secret is required');
  if(!String(trans_id||'').trim()||!String(id_get||'').trim()) throw new Error('BitPay callback trans_id and id_get required');
  return {
    url: BITPAY_PRODUCTION.verify,
    method: 'POST',
    headers: {'content-type':'application/x-www-form-urlencoded'},
    body: formEncode({api,trans_id,id_get})
  };
}

export function interpretBitPayVerification(raw){
  const value=String(raw??'').trim();
  return {
    verified: value==='1',
    provider_code: value,
    reason_code: value==='1' ? null : 'BITPAY_VERIFY_'+(value||'EMPTY')
  };
}

// Runtime integration rule:
// 1. Server creates/persists order and authoritative amount.
// 2. Server calls buildBitPayCreateRequest with runtime secret.
// 3. Positive numeric response becomes id_get and redirect URL.
// 4. Callback values are never trusted as payment proof.
// 5. Server calls buildBitPayVerifyRequest and marks order PAID only when provider returns "1".
