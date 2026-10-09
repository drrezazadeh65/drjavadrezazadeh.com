import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizePaidStudentSupport} from './paid-student-support.mjs';
const build=()=>({
 session:{authenticated:true,user_id:'u1',roles:['STUDENT'],client_role_claims_ignored:true},
 order:{id:'o1',user_id:'u1',status:'COMPLETED',total_minor:6000000,currency:'IRT'},
 orderItem:{id:'l1',order_id:'o1'},
 paymentIntent:{id:'i1',order_id:'o1',status:'PAID'},
 payment:{id:'p1',payment_intent_id:'i1',status:'VERIFIED',amount_minor:6000000,currency:'IRT'},
 entitlement:{id:'e1',user_id:'u1',order_item_id:'l1',entitlement_type:'CONSULTATION_ACCESS',status:'ACTIVE',starts_at:'2026-01-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',metadata:{student_support_channel:'EITAA'}},
 refunds:[],refunds_verified:true,now:new Date('2026-10-09T06:00:00Z')
});
test('verified student with paid support entitlement is permitted',()=>assert.equal(authorizePaidStudentSupport(build()).allowed,true));
const deny=(name,mutate,reason)=>test(name,()=>{let x=build();mutate(x);let r=authorizePaidStudentSupport(x);assert.equal(r.allowed,false);assert.equal(r.reason,reason);assert.equal(r.disclosure_allowed,false)});
deny('untrusted role claims denied',x=>x.session.client_role_claims_ignored=false,'VERIFIED_EMAIL_SESSION_REQUIRED');
deny('anonymous session denied',x=>x.session.authenticated=false,'VERIFIED_EMAIL_SESSION_REQUIRED');
deny('non-student denied',x=>x.session.roles=['PARENT'],'STUDENT_ROLE_REQUIRED');
deny('pending order denied',x=>x.order.status='PENDING','VERIFIED_PURCHASE_REQUIRED');
deny('another buyer denied',x=>x.order.user_id='u2','VERIFIED_PURCHASE_REQUIRED');
deny('another order item denied',x=>x.orderItem.order_id='o2','ORDER_ITEM_MISMATCH');
deny('payment for another order denied',x=>x.paymentIntent.order_id='o2','PAYMENT_ORDER_MISMATCH');
deny('unpaid payment intent denied',x=>x.paymentIntent.status='PENDING','PAID_PAYMENT_INTENT_REQUIRED');
deny('unverified payment denied',x=>x.payment.status='PENDING','PAYMENT_NOT_VERIFIED');
deny('wrong amount denied',x=>x.payment.amount_minor=5,'PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH');
deny('refund ledger must be checked',x=>x.refunds_verified=false,'REFUND_LEDGER_VERIFICATION_REQUIRED');
deny('refunds must be supplied',x=>x.refunds=null,'REFUND_LEDGER_VERIFICATION_REQUIRED');
deny('pending refund pauses access',x=>x.refunds=[{payment_id:'p1',status:'PENDING'}],'REFUND_REVOKES_SUPPORT');
deny('completed refund revoked',x=>x.refunds=[{payment_id:'p1',status:'COMPLETED'}],'REFUND_REVOKES_SUPPORT');
deny('revoked entitlement denied',x=>x.entitlement.status='REVOKED','ACTIVE_ENTITLEMENT_REQUIRED');
deny('unmarked service denied',x=>x.entitlement.metadata={},'SERVICE_NOT_SUPPORT_ELIGIBLE');
deny('not started yet denied',x=>x.entitlement.starts_at='2027-01-01T00:00:00Z','SUPPORT_NOT_STARTED');
deny('expired entitlement denied',x=>x.entitlement.ends_at='2026-01-02T00:00:00Z','SUPPORT_EXPIRED');
