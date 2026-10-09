/** Offline digital fulfilment planner. No delivery, email or gateway side effects.
 * Requires an independently verified payment and explicit approved resource mapping.
 */
const emailOk=s=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
export function planDigitalFulfilment({account,order,catalog=[],previousFulfilments=[]}={}){
 const reject=reason=>({ready:false,reason,grants:[],emailJob:null,productionTouched:false});
 if(!account||typeof account.id!=='string'||!emailOk(account.email)||account.emailVerified!==true)return reject('verified-email-required');
 if(!order||order.accountId!==account.id||typeof order.orderId!=='string'||!order.orderId.trim())return reject('order-account-mismatch');
 if(order.paymentStatus!=='paid'||order.gatewayVerified!==true||!order.gatewayVerificationId||order.refunded===true||order.chargeback===true)return reject('payment-not-authoritatively-verified');
 if(!Array.isArray(catalog)||!Array.isArray(previousFulfilments)||!Array.isArray(order.items)||order.items.length===0)return reject('invalid-order-items');
 const uniqueItems=new Set(),grants=[];
 for(const item of order.items){
  if(!item||typeof item.serviceId!=='string'||uniqueItems.has(item.serviceId)||!Number.isSafeInteger(item.quantity)||item.quantity!==1)return reject('invalid-or-duplicate-line-item');
  uniqueItems.add(item.serviceId);
  const service=catalog.find(s=>s?.id===item.serviceId&&s.active===true&&s.editorialApproved===true);
  if(!service||!Array.isArray(service.approvedResourceIds)||service.approvedResourceIds.length===0||!service.approvedResourceIds.every(x=>typeof x==='string'&&x.trim()))return reject('missing-approved-digital-resources');
  grants.push({serviceId:item.serviceId,resourceIds:[...new Set(service.approvedResourceIds)],fulfilmentKey:order.orderId+':'+item.serviceId});
 }
 const existing=new Set(previousFulfilments.filter(x=>x?.status==='fulfilled').map(x=>x.fulfilmentKey));
 const pending=grants.filter(x=>!existing.has(x.fulfilmentKey));
 return {ready:true,reason:pending.length?'pending-fulfilment':'already-fulfilled',grants:pending,emailJob:pending.length?{recipient:account.email,template:'digital-purchase-ready',orderId:order.orderId,idempotencyKey:'email:'+order.orderId+':digital-ready',status:'not-sent'}:null,requiresTransactionalOutbox:true,requiresServerSideAccessCheck:true,requiresGatewayRevalidation:true,networkCalled:false,productionTouched:false};
}
