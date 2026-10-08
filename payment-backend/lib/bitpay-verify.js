// Verification is server-to-server; callback parameters alone never prove payment.
const VERIFY_URL='https://bitpay.ir/payment-test/gateway-result-second';
export async function verifySandboxPayment({api,transId,idGet}){
 if(!api||!/^[0-9]+$/.test(String(transId))||!/^[0-9]+$/.test(String(idGet))) throw new Error('invalid_callback');
 const body=new URLSearchParams({api,trans_id:String(transId),id_get:String(idGet),json:'1'});
 const response=await fetch(VERIFY_URL,{method:'POST',body,signal:AbortSignal.timeout(12000),redirect:'error'});
 if(!response.ok) throw new Error('bitpay_verify_http_error');
 const raw=(await response.text()).trim();
 let data;try{data=JSON.parse(raw)}catch{data={status:raw}}
 const status=String(data.status??'');
 return {verified:status==='1'||status==='11',status,amountRial:data.amount==null?null:Number(data.amount),factorId:data.factorId==null?null:String(data.factorId)};
}
