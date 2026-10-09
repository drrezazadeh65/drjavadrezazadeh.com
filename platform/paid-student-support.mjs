// Server-only eligibility decision for paid student support.
// The Eitaa handle/link must be stored as a private server secret, never here.
// Inputs MUST be loaded from trusted server session and database records.
// This is a policy primitive, not an enabled production endpoint.
// Session must originate in server-side sessionDecision(), with email verification performed there.
// Refund ledger verification is mandatory; callers must never supply client-provided refund arrays.
const SERVICE_ACCESS_TYPES=new Set(['CONSULTATION_ACCESS','ASSESSMENT_ACCESS','COURSE_ACCESS']);
const PAID_ORDER_STATES=new Set(['PAID','FULFILLING','COMPLETED']);
const denied=reason=>({allowed:false,reason,disclosure_allowed:false});
const timestamp=x=>{const n=new Date(x).getTime();return Number.isFinite(n)?n:NaN;};

export function authorizePaidStudentSupport({session,order,orderItem,paymentIntent,payment,entitlement,refunds,refunds_verified=false,now=new Date()}={}){
 if(session?.authenticated!==true||!session.user_id||session.client_role_claims_ignored!==true) return denied('VERIFIED_EMAIL_SESSION_REQUIRED');
 if(!Array.isArray(session.roles)||!session.roles.includes('STUDENT')) return denied('STUDENT_ROLE_REQUIRED');
 if(!order?.id||order.user_id!==session.user_id||!PAID_ORDER_STATES.has(order.status)) return denied('VERIFIED_PURCHASE_REQUIRED');
 if(!orderItem?.id||orderItem.order_id!==order.id) return denied('ORDER_ITEM_MISMATCH');
 if(!paymentIntent?.id||paymentIntent.order_id!==order.id) return denied('PAYMENT_ORDER_MISMATCH');
 if(paymentIntent.status!=='PAID') return denied('PAID_PAYMENT_INTENT_REQUIRED');
 if(payment?.status!=='VERIFIED'||payment.payment_intent_id!==paymentIntent.id) return denied('PAYMENT_NOT_VERIFIED');
 if(!Number.isSafeInteger(order.total_minor)||order.total_minor<=0||payment.amount_minor!==order.total_minor||payment.currency!==order.currency) return denied('PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH');
 if(refunds_verified!==true||!Array.isArray(refunds)) return denied('REFUND_LEDGER_VERIFICATION_REQUIRED');
 if(refunds.some(r=>r?.payment_id===payment.id&&['REQUESTED','PENDING','COMPLETED'].includes(r?.status))) return denied('REFUND_REVOKES_SUPPORT');
 if(!entitlement?.id||entitlement.user_id!==session.user_id||entitlement.order_item_id!==orderItem.id||entitlement.status!=='ACTIVE') return denied('ACTIVE_ENTITLEMENT_REQUIRED');
 if(!SERVICE_ACCESS_TYPES.has(entitlement.entitlement_type)||entitlement.metadata?.student_support_channel!=='EITAA') return denied('SERVICE_NOT_SUPPORT_ELIGIBLE');
 const current=timestamp(now),start=timestamp(entitlement.starts_at);
 if(!Number.isFinite(current)||!Number.isFinite(start)||current<start) return denied('SUPPORT_NOT_STARTED');
 if(entitlement.ends_at!=null){const end=timestamp(entitlement.ends_at);if(!Number.isFinite(end)||current>=end)return denied('SUPPORT_EXPIRED');}
 return {allowed:true,reason:'VERIFIED_PURCHASE_AND_ACTIVE_ENTITLEMENT',disclosure_allowed:true,entitlement_id:entitlement.id};
}
