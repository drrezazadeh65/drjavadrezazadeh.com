/** Offline customer dashboard projection from verified account-owned service records.
 * Read-only; no live account lookup or data disclosure.
 */
const validEmail=s=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export function projectCustomerServiceDashboard({account,records=[],entitlementReport,locale='fa'}={}){
 const reject=reason=>({ready:false,reason,services:[],productionTouched:false});
 if(!account||typeof account.id!=='string'||!validEmail(account.email)||account.emailVerified!==true)return reject('verified-email-required');
 if(!['fa','en'].includes(locale)||!Array.isArray(records)||!Array.isArray(entitlementReport?.entitlements))return reject('invalid-input');
 const permitted=new Map(entitlementReport.entitlements.filter(e=>typeof e?.serviceId==='string').map(e=>[e.serviceId,e]));
 const services=records.filter(r=>r&&r.accountId===account.id&&permitted.has(r.serviceId)&&typeof r.orderId==='string').map(r=>{
  const entitlement=permitted.get(r.serviceId);
  const title=locale==='fa'?r.titleFa:r.titleEn;
  return {orderId:r.orderId,serviceId:r.serviceId,title:typeof title==='string'?title:'',status:r.status,resources:entitlement.resourceIds??[],supportEligible:entitlement.supportEligible===true,lastUpdate:Array.isArray(r.history)&&r.history.length?r.history.at(-1).occurredAt:null};
 }).sort((a,b)=>a.serviceId.localeCompare(b.serviceId)||a.orderId.localeCompare(b.orderId));
 return {ready:true,services,authentication:'verified-email-only',liveDataConnected:false,productionTouched:false};
}
