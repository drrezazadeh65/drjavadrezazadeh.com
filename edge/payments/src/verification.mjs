/**
 * Accept a BitPay verification only when provider HTTP success, success status,
 * precise amount, and the transaction's factorId are all present and consistent.
 * This module has no platform dependencies so it is regression-tested by Node.
 */
export function verifyProviderResponse(httpStatus, raw, intent) {
  const reject=(reason,status='')=>({verified:false,status,reason,amount:null,factorId:null,cardNum:null});
  if(httpStatus!==200)return reject('provider_http');
  let data;try{data=JSON.parse(raw)}catch{return reject('invalid_json')}
  if(!data||typeof data!=='object'||Array.isArray(data))return reject('invalid_payload');
  const status=String(data.status??'').trim();
  if(status!=='1'&&status!=='11')return reject('provider_not_success',status);
  const amountText=(typeof data.amount==='string'||typeof data.amount==='number')?String(data.amount):'';
  if(!/^[1-9][0-9]*$/.test(amountText))return reject('missing_or_invalid_amount',status);
  const amount=Number(amountText);
  if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(intent?.amount_rial)||amount!==intent.amount_rial)
    return reject('amount_mismatch',status);
  const factorId=(typeof data.factorId==='string'||typeof data.factorId==='number')?String(data.factorId):'';
  if(!factorId||!intent?.factor_id||factorId!==String(intent.factor_id))
    return reject('factor_mismatch',status);
  return {verified:true,status,reason:null,amount,factorId,cardNum:typeof data.cardNum==='string'?data.cardNum:null};
}
