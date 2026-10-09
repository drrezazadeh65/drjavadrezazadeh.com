/** Offline order lifecycle: gateway verification is external and must be server-authenticated. */
const STATES=Object.freeze({pending:'pending-payment',paid:'paid',failed:'payment-failed'});
const valid=v=>typeof v==='string'&&v.trim().length>0;
export function createPendingOrder({orderId,quote}={}){
 if(!valid(orderId)||!quote||quote.quoteOnly!==true||quote.paymentInitiated!==false||!Number.isSafeInteger(quote.totalMinor)||quote.totalMinor<0||!valid(quote.currency)||!valid(quote.email)||!Array.isArray(quote.lines)||quote.lines.length===0)throw new Error('Valid order ID and checkout quote required');
 return {orderId,email:quote.email,lines:quote.lines.map(line=>({...line})),amountMinor:quote.totalMinor,currency:quote.currency,status:STATES.pending,providerReference:null,verifiedAt:null,invoiceIssued:false,productionTouched:false};
}
export function applyVerifiedPayment(order,{verification,expectedProvider}={}){
 if(!order||order.status!==STATES.pending)throw new Error('Only pending orders can transition');
 if(!valid(expectedProvider)||!verification||verification.serverVerified!==true||verification.provider!==expectedProvider||verification.orderId!==order.orderId||verification.amountMinor!==order.amountMinor||verification.currency!==order.currency||!valid(verification.transactionId)||!valid(verification.verifiedAt))throw new Error('Trusted server-side payment verification required');
 return {...order,lines:order.lines.map(line=>({...line})),status:STATES.paid,providerReference:verification.transactionId,verifiedAt:verification.verifiedAt,invoiceIssued:false,productionTouched:false};
}
export function recordPaymentFailure(order,{reason}={}){
 if(!order||order.status!==STATES.pending||!valid(reason))throw new Error('Pending order and failure reason required');
 return {...order,lines:order.lines.map(line=>({...line})),status:STATES.failed,failureReason:reason,invoiceIssued:false,productionTouched:false};
}
