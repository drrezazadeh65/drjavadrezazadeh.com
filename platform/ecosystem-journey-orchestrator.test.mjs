import assert from 'node:assert/strict';
import {createEcosystemJourney,recordEcosystemEvent,planEcosystemJourney,JOURNEY_KINDS} from './ecosystem-journey-orchestrator.mjs';
let counter=0;
const event=(event_type,source,reference_id,extra={})=>({
 event_id:'e-'+(++counter),event_type,source,reference_id,
 occurred_at:'2026-10-14T07:00:00Z',server_attested:true,...extra
});
const make=kind=>createEcosystemJourney({journey_id:'j-'+kind,subject_id:'u-42',kind});
assert.equal(JOURNEY_KINDS.length,4);
let g=make('GOLDEN_TALENT');
assert.equal(planEcosystemJourney(g).next_action,'VERIFY_EMAIL_ACCOUNT');
assert.throws(()=>recordEcosystemEvent(g,event('PAYMENT_VERIFIED','COMMERCE','o-1')), /prerequisite/);
assert.throws(()=>recordEcosystemEvent(g,{...event('ACCOUNT_VERIFIED','IDENTITY','u-42'),email:'secret@example.com'}),/allowlist/);
assert.throws(()=>recordEcosystemEvent(g,event('ACCOUNT_VERIFIED','BROWSER','u-42')), /Authoritative/);
g=recordEcosystemEvent(g,event('ACCOUNT_VERIFIED','IDENTITY','u-42'));
g=recordEcosystemEvent(g,event('ASSESSMENT_SUBMITTED','ASSESSMENT','s-1'));
assert.equal(planEcosystemJourney(g).next_action,'QUEUE_PROFESSIONAL_EVIDENCE_REVIEW');
assert.throws(()=>recordEcosystemEvent(g,event('ASSESSMENT_REVIEWED','GOLDEN_TALENT','s-1')), /human review/);
assert.throws(()=>recordEcosystemEvent(g,event('ASSESSMENT_REVIEWED','GOLDEN_TALENT','s-2',{human_reviewed:true,reviewer_id:'r-1'})),/prerequisite/);
g=recordEcosystemEvent(g,event('ASSESSMENT_REVIEWED','GOLDEN_TALENT','s-1',{human_reviewed:true,reviewer_id:'r-1'}));
const order=event('ORDER_CREATED','COMMERCE','o-1');
g=recordEcosystemEvent(g,order);
const replay=recordEcosystemEvent(g,order);
assert.equal(replay.idempotent_replay,true);
assert.equal(replay.revision,g.revision);
assert.equal(planEcosystemJourney(g).next_action,'AWAIT_PROVIDER_VERIFIED_PAYMENT');
assert.throws(()=>recordEcosystemEvent(g,event('PAYMENT_VERIFIED','COMMERCE','o-2')),/prerequisite/);
assert.throws(()=>recordEcosystemEvent(g,event('ENTITLEMENT_GRANTED','COMMERCE','o-1')),/prerequisite/);
g=recordEcosystemEvent(g,event('PAYMENT_VERIFIED','COMMERCE','o-1'));
g=recordEcosystemEvent(g,event('ENTITLEMENT_GRANTED','COMMERCE','o-1'));
assert.equal(planEcosystemJourney(g).next_action,'OFFER_HUMAN_SUPERVISED_GROWTH_CYCLE');
g=recordEcosystemEvent(g,event('BAHAR_CYCLE_REVIEWED','BAHAR','c-1',{human_reviewed:true,reviewer_id:'r-1'}));
assert.equal(planEcosystemJourney(g).next_action,'OFFER_CONTEXTUAL_FOLLOW_UP');
let b=make('BOOKSTORE');
b=recordEcosystemEvent(b,event('ACCOUNT_VERIFIED','IDENTITY','u-42'));
b=recordEcosystemEvent(b,event('ORDER_CREATED','COMMERCE','book-o-1'));
assert.equal(planEcosystemJourney(b).next_action,'AWAIT_PROVIDER_VERIFIED_PAYMENT');
b=recordEcosystemEvent(b,event('PAYMENT_VERIFIED','COMMERCE','book-o-1'));
assert.equal(planEcosystemJourney(b).next_action,'QUEUE_FULFILMENT_REVIEW');
b=recordEcosystemEvent(b,event('ORDER_FULFILLED','COMMERCE','book-o-1'));
assert.equal(planEcosystemJourney(b).next_action,'SHOW_VERIFIED_ORDER_HISTORY');
assert.throws(()=>recordEcosystemEvent(b,event('ASSESSMENT_SUBMITTED','ASSESSMENT','s-2')),/Authoritative/);
let c=make('CONSULTATION');
c=recordEcosystemEvent(c,event('ACCOUNT_VERIFIED','IDENTITY','u-42'));
c=recordEcosystemEvent(c,event('SERVICE_REQUESTED','CONSULTATION','case-1'));
assert.equal(planEcosystemJourney(c).next_action,'CHECK_REAL_APPOINTMENT_AVAILABILITY');
assert.throws(()=>recordEcosystemEvent(c,event('SESSION_COMPLETED','CONSULTATION','case-1')),/prerequisite/);
c=recordEcosystemEvent(c,event('BOOKING_CONFIRMED','CONSULTATION','case-1'));
c=recordEcosystemEvent(c,event('SESSION_COMPLETED','CONSULTATION','case-1'));
assert.equal(planEcosystemJourney(c).next_action,'OFFER_CONTEXTUAL_FOLLOW_UP');
// A previous paid order or reviewed instrument must never authorize a new one.
b=recordEcosystemEvent(b,event('ORDER_CREATED','COMMERCE','book-o-2'));
assert.equal(planEcosystemJourney(b).next_action,'AWAIT_PROVIDER_VERIFIED_PAYMENT');
g=recordEcosystemEvent(g,event('ASSESSMENT_SUBMITTED','ASSESSMENT','s-2'));
assert.equal(planEcosystemJourney(g).next_action,'QUEUE_PROFESSIONAL_EVIDENCE_REVIEW');
// A second consultation case may not inherit the first case's booking.
c=recordEcosystemEvent(c,event('SERVICE_REQUESTED','CONSULTATION','case-2'));
assert.equal(planEcosystemJourney(c).next_action,'CHECK_REAL_APPOINTMENT_AVAILABILITY');
console.log('Cross-domain journey contract passed');
