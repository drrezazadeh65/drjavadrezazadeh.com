import test from 'node:test';
import assert from 'node:assert/strict';
import {priceOrder,fulfilVerifiedOrder,reconcileRefund} from './commerce-engine.mjs';
import {bookingDecision,confirmConsultation,triageConsultation} from './consultation-engine.mjs';
import {planEmail} from './communication-engine.mjs';
import {createLead,qualifyLead} from './crm-engine.mjs';
import {assembleReport,approveReport} from './report-engine.mjs';
import {consultationReportDecision} from './consultation-record-engine.mjs';

test('lead qualification and consultation triage retain separate ownership',()=>{
 const lead=createLead({lead_id:'l1',source:'organic',service_interest:'advice',contact_channel:'EMAIL',contact_value_hash:'hash'});
 assert.equal(qualifyLead(lead,{decision:'QUALIFIED',owner_user_id:'u1',reason:'Eligible'}).status,'QUALIFIED');
 const triage=triageConsultation({request_id:'r1',recommended_service_type:'advice',payment_required:true});
 const booking=bookingDecision({triage,slot:'2026-10-12T12:00:00+03:30',timezone:'Asia/Tehran'});
 assert.equal(booking.next_status,'AWAITING_PAYMENT');
 assert.throws(()=>confirmConsultation({booking,payment_required:true,payment_state:'PENDING'}),/Verified/);
 assert.equal(confirmConsultation({booking,payment_required:true,payment_state:'COMPLETED'}).status,'CONFIRMED');
});

test('commerce requires matching server verified payment before entitlement',()=>{
 const order=priceOrder({user_id:'u1',items:[{product_id:'p1',price_id:'pr1',quantity:1}],catalogue:{products:[{id:'p1',status:'ACTIVE',title:'Service'}],prices:[{id:'pr1',product_id:'p1',status:'ACTIVE',currency:'IRR',amount_minor:10000}]}});
 assert.equal(order.client_amount_ignored,true);
 assert.throws(()=>fulfilVerifiedOrder({order:{...order,status:'PAID'},payment:{id:'pay',status:'PENDING',currency:'IRR',amount_minor:10000}}),/verified/);
 const result=fulfilVerifiedOrder({order:{...order,status:'PAID'},payment:{id:'pay',status:'VERIFIED',currency:'IRR',amount_minor:10000},entitlement_specs:[{id:'ent1'}]});
 assert.equal(result.entitlements[0].status,'ACTIVE');
 assert.equal(reconcileRefund({entitlements:result.entitlements,refund:{status:'COMPLETED'}})[0].status,'REVOKED');
});

test('communication marketing remains consent gated',()=>{
 const args={category:'MARKETING',template_key:'campaign',recipient_hash:'hash'};
 assert.equal(planEmail(args).send,false);
 assert.equal(planEmail({...args,preferences:{allow_marketing:true}}).send,true);
});

test('report assembly and consultation release require distinct human reviews',()=>{
 const report=assembleReport({report_id:'rep1',report_type:'CONSULTATION',subject_user_id:'u1',template_version:'v1'});
 const approved=approveReport(report,{reviewer_user_id:'reviewer',reviewed_at:'2026-10-09T20:00:00Z'});
 assert.equal(approved.status,'READY');
 assert.throws(()=>consultationReportDecision({consultation:{status:'BOOKED'},report:approved,reviewer_user_id:'reviewer',decision:'APPROVE'}),/review/);
 const release=consultationReportDecision({consultation:{status:'COMPLETED'},report:approved,reviewer_user_id:'reviewer',decision:'APPROVE'});
 assert.equal(release.client_visible,true);
 assert.equal(release.automatic_release,false);
});
