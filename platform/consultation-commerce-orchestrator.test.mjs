import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmPaidConsultation} from './consultation-commerce-orchestrator.mjs';
const booking={status:'AWAITING_PAYMENT'};
const order={id:'o1',user_id:'u1',status:'PAID',total_minor:10000,currency:'IRR'};
const payment={id:'p1',order_id:'o1',status:'VERIFIED',amount_minor:10000,currency:'IRR'};
test('paid consultation delegates to canonical commerce payment guard',()=>{
 const result=confirmPaidConsultation({booking,order,payment,consultation_user_id:'u1'});
 assert.equal(result.consultation.status,'CONFIRMED');
 assert.equal(result.persisted,false);
});
test('rejects user mismatch, payment mismatch and unverified payments',()=>{
 assert.throws(()=>confirmPaidConsultation({booking,order,payment,consultation_user_id:'u2'}),/user mismatch/);
 assert.throws(()=>confirmPaidConsultation({booking,order,payment:{...payment,order_id:'o2'},consultation_user_id:'u1'}),/order mismatch/);
 assert.throws(()=>confirmPaidConsultation({booking,order,payment:{...payment,amount_minor:9999},consultation_user_id:'u1'}),/matching payment/);
 assert.throws(()=>confirmPaidConsultation({booking,order,payment:{...payment,status:'PENDING'},consultation_user_id:'u1'}),/verified/);
});
