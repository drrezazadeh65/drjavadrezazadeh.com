// Server-only sandbox BitPay adapter. No production credentials accepted here.
const BASE='https://bitpay.ir/payment-test';
export function createRequest({api,amountRial,factorId,redirect}){
 if(!api||!Number.isSafeInteger(amountRial)||amountRial<5000||!/^[0-9]+$/.test(String(factorId))||!/^https:\/\//.test(redirect)) throw new Error('invalid_bitpay_request');
 return {url:BASE+'/gateway-send',body:new URLSearchParams({api,amount:String(amountRial),factorId:String(factorId),redirect})};
}
export async function requestIntent(args){
 const request=createRequest(args);
 const response=await fetch(request.url,{method:'POST',body:request.body,signal:AbortSignal.timeout(12000),redirect:'error'});
 const id=(await response.text()).trim();
 if(!response.ok||!/^\d+$/.test(id)||BigInt(id)<=0n) throw new Error('bitpay_intent_failed');
 return {idGet:id,url:BASE+'/gateway-'+id+'-get'};
}
