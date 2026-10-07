// BitPay server-side adapter contract.
// Production secrets must be injected at runtime; never place production API keys in Git, browser JS, URLs or logs.

export const BITPAY_ENDPOINTS = Object.freeze({
  production: Object.freeze({
    create: 'https://bitpay.ir/payment/gateway-send',
    payTemplate: 'https://bitpay.ir/payment/gateway-{id_get}-get',
    verify: 'https://bitpay.ir/payment/gateway-result-second'
  }),
  test: Object.freeze({
    create: 'https://bitpay.ir/payment-test/gateway-send',
    payTemplate: 'https://bitpay.ir/payment-test/gateway-{id_get}-get',
    verify: 'https://bitpay.ir/payment-test/gateway-result-second'
  })
});

function endpointSet(mode='production'){
  if(mode!=='production'&&mode!=='test') throw new Error('BitPay mode must be production or test');
  return BITPAY_ENDPOINTS[mode];
}

function formEncode(data={}){
  return new URLSearchParams(
    Object.entries(data)
      .filter(([,v])=>v!==undefined&&v!==null&&String(v)!=='')
      .map(([k,v])=>[k,String(v)])
  ).toString();
}

export function toBitPayRialAmount({amount,currency='IRR'}={}){
  if(!Number.isInteger(amount)||amount<=0) throw new Error('Positive integer amount required');
  const code=String(currency||'').toUpperCase();
  const rial=code==='IRT' ? amount*10 : code==='IRR' ? amount : NaN;
  if(!Number.isSafeInteger(rial)||rial<5000) throw new Error('BitPay amount must be at least 5000 IRR');
  return rial;
}

export function buildBitPayCreateRequest({
  api, amount, currency='IRR', redirect, factorId,
  name='', email='', description='', mobileNum='', cardNum='', mode='production'
}={}){
  if(!api) throw new Error('BitPay API credential is required');
  if(!/^https:\/\//i.test(String(redirect||''))) throw new Error('HTTPS redirect URL required');
  if(factorId===undefined||factorId===null||!/^[0-9]+$/.test(String(factorId).trim())) throw new Error('Numeric factorId required');
  const amountRial=toBitPayRialAmount({amount,currency});
  return {
    url: endpointSet(mode).create,
    method: 'POST',
    headers: {'content-type':'application/x-www-form-urlencoded'},
    body: formEncode({api,amount:amountRial,redirect,factorId,name,email,description,mobileNum,cardNum})
  };
}

export function interpretBitPayCreateResponse(raw){
  const value=String(raw??'').trim();
  if(/^\d+$/.test(value) && Number(value)>0) return {ok:true,id_get:value,provider_code:value};
  return {ok:false,id_get:null,provider_code:value||'EMPTY',reason_code:'BITPAY_CREATE_'+(value||'EMPTY')};
}

export function bitPayRedirectUrl(id_get,{mode='production'}={}){
  const id=String(id_get||'').trim();
  if(!/^\d+$/.test(id)||Number(id)<=0) throw new Error('Valid BitPay id_get required');
  return endpointSet(mode).payTemplate.replace('{id_get}',id);
}

export function buildBitPayVerifyRequest({api,trans_id,id_get,mode='production',json=true}={}){
  if(!api) throw new Error('BitPay API credential is required');
  if(!/^\d+$/.test(String(trans_id||'').trim())||!/^\d+$/.test(String(id_get||'').trim())) {
    throw new Error('Numeric BitPay callback trans_id and id_get required');
  }
  return {
    url: endpointSet(mode).verify,
    method: 'POST',
    headers: {'content-type':'application/x-www-form-urlencoded'},
    body: formEncode({api,trans_id,id_get,json:json?1:undefined})
  };
}

export function interpretBitPayVerification(raw){
  const text=String(raw??'').trim();
  let payload=null;
  if(text.startsWith('{')){
    try{payload=JSON.parse(text);}catch(e){payload=null;}
  }
  const status=String(payload?.status ?? text).trim();
  const verified=status==='1'||status==='11';
  return {
    verified,
    already_verified: status==='11',
    provider_code: status||'EMPTY',
    amount_rial: Number.isInteger(Number(payload?.amount)) ? Number(payload.amount) : null,
    card_masked: payload?.cardNum ? String(payload.cardNum) : null,
    factor_id: payload?.factorId!==undefined&&payload?.factorId!==null ? String(payload.factorId) : null,
    reason_code: verified ? null : 'BITPAY_VERIFY_'+(status||'EMPTY'),
    raw_json: payload
  };
}

// Runtime integration rules:
// 1. Server resolves/persists the canonical order and amount; browser amount is never authoritative.
// 2. Store/UI may use IRT (toman), but BitPay is always called with the converted integer IRR amount.
// 3. Server creates a provider intent and persists factorId/id_get before redirecting the browser.
// 4. Callback trans_id/id_get are identifiers only, never payment proof.
// 5. Server verifies the callback against BitPay and checks the returned amount against the persisted order.
// 6. status=1 is successful verification; status=11 is an idempotent already-verified response.
// 7. Only persisted server-verified state may mark an order paid or trigger fulfilment.
