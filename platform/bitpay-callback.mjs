export function validateBitPayVerifiedPayment({expected,verification}={}){
  if(!expected?.order_id||!expected?.id_get||!expected?.factor_id) throw new Error('Persisted BitPay intent required');
  if(!Number.isInteger(expected.amount_rial)||expected.amount_rial<=0) throw new Error('Persisted BitPay amount required');
  if(verification?.verified!==true) return {verified:false,reason_code:verification?.reason_code||'BITPAY_NOT_VERIFIED'};
  if(verification.amount_rial!==null&&verification.amount_rial!==expected.amount_rial) {
    return {verified:false,reason_code:'BITPAY_AMOUNT_MISMATCH'};
  }
  if(verification.factor_id!==null&&String(verification.factor_id)!==String(expected.factor_id)) {
    return {verified:false,reason_code:'BITPAY_FACTOR_MISMATCH'};
  }
  return {
    verified:true,
    order_id:expected.order_id,
    id_get:String(expected.id_get),
    amount_rial:expected.amount_rial,
    already_verified:verification.already_verified===true,
    next_state:'PAYMENT_VERIFIED'
  };
}
