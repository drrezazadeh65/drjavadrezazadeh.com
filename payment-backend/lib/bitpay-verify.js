// Only a positive provider verification status is proof of payment.
// The BitPay verification response may be a bare status code without amount/factorId.
// In that case do not mark an order paid until independently validated.
export function parseVerification(raw){
 const value=String(raw??'').trim();
 let data={};try{data=JSON.parse(value)}catch{data={status:value}}
 const status=String(data?.status??'').trim();
 const amount=data?.amount==null?null:Number(data.amount);
 const factor=data?.factorId==null?null:String(data.factorId);
 return {
  verified:(status==='1'||status==='11')&&Number.isSafeInteger(amount)&&amount>0&&factor!==null&&/^\d+$/.test(factor),
  status,amountRial:Number.isSafeInteger(amount)&&amount>0?amount:null,factorId:factor
 };
}
export async function verifySandboxPayment({api,transId,idGet}){
 if(!api||!/^[0-9]+$/.test(String(transId))||!/^[0-9]+$/.test(String(idGet))) throw new Error('invalid_callback');
 const body=new URLSearchParams({api,trans_id:String(transId),id_get:String(idGet),json:'1'});
 const response=await fetch('https://bitpay.ir/payment-test/gateway-result-second',{method:'POST',body,signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response.ok) throw new Error('bitpay_verify_http_error');
 return parseVerification(await response.text());
}
