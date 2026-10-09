/** Offline customer entitlement engine. Server-side authoritative payment checks are required.
 * Does not grant actual access or send notifications.
 */
const validEmail=s=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
export function resolveCustomerEntitlements({account,orders=[],now=new Date().toISOString()}={}){
 const deny=reason=>({entitlements:[],denied:reason,authentication:'email-only',productionTouched:false});
 if(!account||typeof account.id!=='string'||!validEmail(account.email)||account.emailVerified!==true)return deny('verified-email-required');
 if(!Array.isArray(orders)||!Number.isFinite(Date.parse(now)))return deny('invalid-input');
 const nowMs=Date.parse(now), entitlements=new Map();
 for(const order of orders){
  if(!order||order.accountId!==account.id||order.paymentStatus!=='paid'||order.gatewayVerified!==true||order.refunded===true||order.chargeback===true)continue;
  if(typeof order.serviceId!=='string'||!order.serviceId.trim()||typeof order.orderId!=='string'||!order.orderId.trim())continue;
  const expires=order.accessExpiresAt?Date.parse(order.accessExpiresAt):Infinity;
  if(Number.isNaN(expires)||expires<=nowMs)continue;
  const resources=Array.isArray(order.approvedResourceIds)?order.approvedResourceIds.filter(x=>typeof x==='string'&&x.trim()):[];
  const prior=entitlements.get(order.serviceId)??{serviceId:order.serviceId,orderIds:[],resourceIds:[],supportEligible:false,expiresAt:null};
  prior.orderIds.push(order.orderId);
  prior.resourceIds=[...new Set([...prior.resourceIds,...resources])];
  prior.supportEligible ||= order.supportIncluded===true&&(!order.supportExpiresAt||(Number.isFinite(Date.parse(order.supportExpiresAt))&&Date.parse(order.supportExpiresAt)>nowMs));
  if(expires===Infinity)prior.expiresAt=null;
  else if(prior.expiresAt!==null)prior.expiresAt=new Date(Math.max(Date.parse(prior.expiresAt),expires)).toISOString();
  else if(prior.orderIds.length===1)prior.expiresAt=new Date(expires).toISOString();
  entitlements.set(order.serviceId,prior);
 }
 return {entitlements:[...entitlements.values()].sort((a,b)=>a.serviceId.localeCompare(b.serviceId)),denied:null,authentication:'email-only',phoneVerificationRequired:false,authoritativeGatewayRecheckRequired:true,productionTouched:false};
}
export function authorizeCustomerResource({entitlementReport,serviceId,resourceId}={}){
 const match=entitlementReport?.entitlements?.find(x=>x.serviceId===serviceId);
 return {allowed:Boolean(match&&typeof resourceId==='string'&&match.resourceIds.includes(resourceId)),reason:match?'resource-entitlement-check':'no-paid-service-entitlement',productionTouched:false};
}
