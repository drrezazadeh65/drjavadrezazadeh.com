// Server-side coordinator only; domain services remain systems of record.
export const JOURNEY_KINDS=Object.freeze(['GOLDEN_TALENT','CONSULTATION','BOOKSTORE','COACHING']);
const rules={
 ACCOUNT_VERIFIED:{source:'IDENTITY'},
 ASSESSMENT_SUBMITTED:{source:'ASSESSMENT',requires:['ACCOUNT_VERIFIED']},
 ASSESSMENT_REVIEWED:{source:'GOLDEN_TALENT',requires:['ASSESSMENT_SUBMITTED'],sameReference:true,human:true},
 SERVICE_REQUESTED:{source:'CONSULTATION',requires:['ACCOUNT_VERIFIED']},
 ORDER_CREATED:{source:'COMMERCE',requires:['ACCOUNT_VERIFIED']},
 PAYMENT_VERIFIED:{source:'COMMERCE',requires:['ORDER_CREATED'],sameReference:true},
 ENTITLEMENT_GRANTED:{source:'COMMERCE',requires:['PAYMENT_VERIFIED'],sameReference:true},
 BOOKING_CONFIRMED:{source:'CONSULTATION',requires:['SERVICE_REQUESTED'],sameReference:true},
 SESSION_COMPLETED:{source:'CONSULTATION',requires:['BOOKING_CONFIRMED'],sameReference:true},
 BAHAR_CYCLE_REVIEWED:{source:'BAHAR',requires:['ENTITLEMENT_GRANTED'],human:true},
 FOLLOW_UP_COMPLETED:{source:'COACHING',requiresAny:['SESSION_COMPLETED','BAHAR_CYCLE_REVIEWED'],human:true},
 ORDER_FULFILLED:{source:'COMMERCE',requires:['PAYMENT_VERIFIED'],sameReference:true}
};
const allowed={
 GOLDEN_TALENT:['ACCOUNT_VERIFIED','ASSESSMENT_SUBMITTED','ASSESSMENT_REVIEWED','SERVICE_REQUESTED','ORDER_CREATED','PAYMENT_VERIFIED','ENTITLEMENT_GRANTED','BOOKING_CONFIRMED','SESSION_COMPLETED','BAHAR_CYCLE_REVIEWED','FOLLOW_UP_COMPLETED'],
 CONSULTATION:['ACCOUNT_VERIFIED','SERVICE_REQUESTED','ORDER_CREATED','PAYMENT_VERIFIED','ENTITLEMENT_GRANTED','BOOKING_CONFIRMED','SESSION_COMPLETED','FOLLOW_UP_COMPLETED'],
 BOOKSTORE:['ACCOUNT_VERIFIED','ORDER_CREATED','PAYMENT_VERIFIED','ORDER_FULFILLED'],
 COACHING:['ACCOUNT_VERIFIED','SERVICE_REQUESTED','ORDER_CREATED','PAYMENT_VERIFIED','ENTITLEMENT_GRANTED','BOOKING_CONFIRMED','SESSION_COMPLETED','BAHAR_CYCLE_REVIEWED','FOLLOW_UP_COMPLETED']
};
const fields=new Set(['event_id','event_type','source','reference_id','occurred_at','server_attested','human_reviewed','reviewer_id']);
const safeId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const has=(events,type,ref)=>events.some(e=>e.event_type===type&&(ref===undefined||e.reference_id===ref));
function assertJourney(j){
 if(!j||!safeId(j.journey_id)||!safeId(j.subject_id)||!JOURNEY_KINDS.includes(j.kind)||
    j.server_only!==true||!Array.isArray(j.events)||j.events.length>1000)
    throw new Error('Invalid private journey snapshot');
}
export function createEcosystemJourney({journey_id,subject_id,kind}={}){
 if(!safeId(journey_id)||!safeId(subject_id)||!JOURNEY_KINDS.includes(kind))
   throw new Error('Private journey identity and supported purpose required');
 return {journey_id,subject_id,kind,revision:0,events:[],server_only:true,
   private_persistence_required:true,automatic_payment:false,automatic_booking:false,
   automatic_scientific_interpretation:false};
}
export function recordEcosystemEvent(j,event){
 assertJourney(j);
 if(!event||typeof event!=='object'||Array.isArray(event)||
   Object.keys(event).some(key=>!fields.has(key)))
   throw new Error('Event payload violates minimal-data allowlist');
 const rule=rules[event.event_type];
 if(!rule||!allowed[j.kind].includes(event.event_type)||event.source!==rule.source||
   event.server_attested!==true||!safeId(event.event_id)||!safeId(event.reference_id)||
   typeof event.occurred_at!=='string'||
   !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(event.occurred_at)||
   !Number.isFinite(Date.parse(event.occurred_at)))
   throw new Error('Authoritative event contract required');
 if(event.event_type==='ACCOUNT_VERIFIED'&&event.reference_id!==j.subject_id)
   throw new Error('Verified account must match journey subject');
 if(rule.human&&(event.human_reviewed!==true||!safeId(event.reviewer_id)))
   throw new Error('Traceable professional human review required');
 if(!rule.human&&(event.human_reviewed!==undefined||event.reviewer_id!==undefined))
   throw new Error('Unexpected human review fields');
 const saved={event_id:event.event_id,event_type:event.event_type,source:event.source,
   reference_id:event.reference_id,occurred_at:event.occurred_at,server_attested:true};
 if(rule.human){saved.human_reviewed=true;saved.reviewer_id=event.reviewer_id;}
 const duplicate=j.events.find(e=>e.event_id===saved.event_id);
 if(duplicate){
   if(JSON.stringify(duplicate)===JSON.stringify(saved))
      return {...j,events:j.events.map(e=>({...e})),idempotent_replay:true};
   throw new Error('Event identity collision');
 }
 if(j.events.length===1000)throw new Error('Journey event cap reached');
 if(saved.event_type==='ACCOUNT_VERIFIED'&&has(j.events,'ACCOUNT_VERIFIED'))
   throw new Error('Account already verified');
 for(const required of rule.requires||[]){
   if(!has(j.events,required,rule.sameReference?saved.reference_id:undefined))
     throw new Error('Missing authoritative prerequisite: '+required);
 }
 if(rule.requiresAny&&!rule.requiresAny.some(type=>has(j.events,type)))
   throw new Error('Follow-up requires an actual session or development review');
 if(has(j.events,saved.event_type,saved.reference_id))
   throw new Error('Duplicate domain milestone');
 return {...j,events:[...j.events.map(e=>({...e})),saved],
   revision:j.events.length+1,idempotent_replay:false};
}
export function planEcosystemJourney(j){
 assertJourney(j);
 const ev=j.events,seen=type=>has(ev,type);
 const latest=type=>[...ev].reverse().find(e=>e.event_type===type)?.reference_id;
 const order=latest('ORDER_CREATED'),caseId=latest('SERVICE_REQUESTED'),assessment=latest('ASSESSMENT_SUBMITTED');
 const paid=order!==undefined&&has(ev,'PAYMENT_VERIFIED',order);
 const entitled=order!==undefined&&has(ev,'ENTITLEMENT_GRANTED',order);
 const booked=caseId!==undefined&&has(ev,'BOOKING_CONFIRMED',caseId);
 const completed=caseId!==undefined&&has(ev,'SESSION_COMPLETED',caseId);
 const reviewed=assessment!==undefined&&has(ev,'ASSESSMENT_REVIEWED',assessment);
 let next_action;
 if(!seen('ACCOUNT_VERIFIED'))next_action='VERIFY_EMAIL_ACCOUNT';
 else if(j.kind==='BOOKSTORE'){
   if(order===undefined)next_action='DISPLAY_BOOK_CATALOGUE';
   else if(!paid)next_action='AWAIT_PROVIDER_VERIFIED_PAYMENT';
   else if(!has(ev,'ORDER_FULFILLED',order))next_action='QUEUE_FULFILMENT_REVIEW';
   else next_action='SHOW_VERIFIED_ORDER_HISTORY';
 }else if(j.kind==='GOLDEN_TALENT'){
   if(assessment===undefined)next_action='OFFER_CONSENTED_ASSESSMENT';
   else if(!reviewed)next_action='QUEUE_PROFESSIONAL_EVIDENCE_REVIEW';
   else if(order===undefined)next_action='OFFER_OPTIONAL_SERVICE_OPTIONS';
   else if(!paid)next_action='AWAIT_PROVIDER_VERIFIED_PAYMENT';
   else if(!entitled)next_action='RECONCILE_PAID_ENTITLEMENT';
   else if(!seen('BAHAR_CYCLE_REVIEWED'))next_action='OFFER_HUMAN_SUPERVISED_GROWTH_CYCLE';
   else next_action='OFFER_CONTEXTUAL_FOLLOW_UP';
 }else{
   if(caseId===undefined)next_action='OFFER_SERVICE_INTAKE';
   else if(!booked)next_action='CHECK_REAL_APPOINTMENT_AVAILABILITY';
   else if(order!==undefined&&!paid)next_action='AWAIT_PROVIDER_VERIFIED_PAYMENT';
   else if(!completed)next_action='PREPARE_CONFIRMED_SESSION';
   else if(j.kind==='COACHING'&&!seen('BAHAR_CYCLE_REVIEWED'))next_action='OFFER_HUMAN_SUPERVISED_GROWTH_CYCLE';
   else next_action='OFFER_CONTEXTUAL_FOLLOW_UP';
 }
 return {journey_id:j.journey_id,kind:j.kind,revision:j.revision,next_action,
   current_order_reference:order||null,current_case_reference:caseId||null,
   current_assessment_reference:assessment||null,
   observed_milestones:ev.map(e=>e.event_type),
   no_side_effects:true,requires_server_authorization:true,
   payment_not_inferred_from_order:true,booking_not_inferred_from_preference:true,
   scientific_claims_not_inferred_from_assessment:true};
}
