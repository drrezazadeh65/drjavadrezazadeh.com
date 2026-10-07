import {
  buildBitPayCreateRequest,
  interpretBitPayCreateResponse,
  bitPayRedirectUrl,
  buildBitPayVerifyRequest,
  interpretBitPayVerification
} from '../platform/bitpay-adapter.mjs';
import {validateBitPayVerifiedPayment} from '../platform/bitpay-callback.mjs';

const api='adxcv-zzadq-polkjsad-opp13opoz-1sdf455aadzmck1244567';
const redirect='https://drjavadrezazadeh.com/fa/shop/checkout/?bitpay_test=1';
const factorId=String(Date.now());

async function post(url,body,headers={'content-type':'application/x-www-form-urlencoded'}){
  const res=await fetch(url,{method:'POST',headers,body,redirect:'manual',signal:AbortSignal.timeout(30000)});
  return {status:res.status,text:(await res.text()).trim(),location:res.headers.get('location')||''};
}

const createReq=buildBitPayCreateRequest({
  api,amount:2_000_000,currency:'IRT',redirect,factorId,mode:'test',
  description:'Automated successful BitPay sandbox roundtrip'
});
const created=await post(createReq.url,createReq.body,createReq.headers);
const cr=interpretBitPayCreateResponse(created.text);
if(!cr.ok) throw new Error('create_failed:'+created.text);

const paymentUrl=bitPayRedirectUrl(cr.id_get,{mode:'test'});
const success=await post(paymentUrl,new URLSearchParams({method:'get'}).toString());
console.log('sandbox_success_submit_status='+success.status);
console.log('sandbox_success_location='+success.location);
if(![301,302,303,307,308].includes(success.status)||!success.location) throw new Error('sandbox_success_did_not_redirect');

const callbackUrl=new URL(success.location,redirect);
const transId=callbackUrl.searchParams.get('trans_id');
const idGet=callbackUrl.searchParams.get('id_get');
if(!/^\d+$/.test(transId||'')||!/^\d+$/.test(idGet||'')) throw new Error('callback_identifiers_missing');
if(idGet!==cr.id_get) throw new Error('callback_id_get_mismatch');

const verifyReq=buildBitPayVerifyRequest({api,trans_id:transId,id_get:idGet,mode:'test',json:true});
const verified=await post(verifyReq.url,verifyReq.body,verifyReq.headers);
console.log('sandbox_verify_response='+verified.text);
const vr=interpretBitPayVerification(verified.text);
const integrity=validateBitPayVerifiedPayment({
  expected:{order_id:'sandbox-'+factorId,id_get:idGet,factor_id:factorId,amount_rial:20_000_000},
  verification:vr
});
if(!integrity.verified) throw new Error('positive_roundtrip_not_verified:'+JSON.stringify({vr,integrity}));

console.log(JSON.stringify({
  positive_roundtrip:true,
  id_get:idGet,
  trans_id:transId,
  provider_status:vr.provider_code,
  amount_rial:vr.amount_rial,
  factor_id:vr.factor_id,
  integrity_gate:true
},null,2));
