/** Preflight paid-customer email-only support eligibility.
 * Offline policy engine; does not send email, expose Eitaa IDs, or authenticate users.
 */
const emailOk=s=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
export function evaluateStudentSupportAccess({account,orders=[],serviceId,now=new Date().toISOString()}={}){
 if(!account||!emailOk(account.email)||account.emailVerified!==true)return {allowed:false,reason:'verified-email-required',eitaaVisible:false,productionTouched:false};
 if(account.phoneVerified===true)return {allowed:false,reason:'phone-verification-not-supported',eitaaVisible:false,productionTouched:false};
 if(!Array.isArray(orders)||typeof serviceId!=='string'||!serviceId.trim())return {allowed:false,reason:'invalid-service-or-orders',eitaaVisible:false,productionTouched:false};
 const current=Date.parse(now);
 if(!Number.isFinite(current))return {allowed:false,reason:'invalid-current-time',eitaaVisible:false,productionTouched:false};
 const eligible=orders.some(o=>o&&o.accountId===account.id&&o.serviceId===serviceId&&o.paymentStatus==='paid'&&o.gatewayVerified===true&&o.refunded!==true&&o.chargeback!==true&&(!o.supportExpiresAt||(Number.isFinite(Date.parse(o.supportExpiresAt))&&Date.parse(o.supportExpiresAt)>current)));
 return {allowed:eligible,reason:eligible?'verified-paid-entitlement':'no-valid-paid-entitlement',eitaaVisible:eligible,authentication:'verified-email-only',phoneAuthenticationAllowed:false,productionTouched:false};
}
