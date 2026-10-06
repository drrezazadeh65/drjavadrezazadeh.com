// Consultation workflow domain engine.
const TRANSITIONS={
 DRAFT:['SUBMITTED'],SUBMITTED:['TRIAGED','DECLINED','CANCELLED'],TRIAGED:['AWAITING_BOOKING','DECLINED'],AWAITING_BOOKING:['BOOKED','CANCELLED'],BOOKED:['AWAITING_PAYMENT','CONFIRMED','CANCELLED'],AWAITING_PAYMENT:['CONFIRMED','CANCELLED','REFUNDED'],CONFIRMED:['COMPLETED','CANCELLED','NO_SHOW'],COMPLETED:['FOLLOW_UP','CLOSED'],FOLLOW_UP:['CLOSED'],CLOSED:[],CANCELLED:[],NO_SHOW:['FOLLOW_UP','CLOSED'],DECLINED:[],REFUNDED:[]
};
export function transitionConsultation(current,next){if(!TRANSITIONS[current]?.includes(next)) throw new Error('Invalid consultation transition');return next;}
export function triageConsultation({request_id,assigned_consultant_user_id,recommended_service_type,assessment_needed=false,parent_attendance_recommended=null,payment_required=false,preparation_notes=null}={}){
 if(!request_id||!recommended_service_type) throw new Error('Triage decision required');
 return {request_id,assigned_consultant_user_id:assigned_consultant_user_id||null,recommended_service_type,assessment_needed,parent_attendance_recommended,payment_required,preparation_notes,status:'TRIAGED',human_decision:true};
}
export function bookingDecision({triage,slot,timezone}={}){
 if(triage?.status!=='TRIAGED'||!slot||!timezone) throw new Error('Triaged request and timezone-aware slot required');
 return {status:'BOOKED',starts_at:slot,timezone,next_status:triage.payment_required?'AWAITING_PAYMENT':'CONFIRMED',payment_verified:false};
}
export function confirmConsultation({booking,payment_required=false,payment_state=null}={}){
 if(booking?.status!=='BOOKED'&&booking?.status!=='AWAITING_PAYMENT') throw new Error('Bookable state required');
 if(payment_required&&payment_state!=='COMPLETED') throw new Error('Verified completed payment required');
 return {...booking,status:'CONFIRMED',payment_verified:payment_required};
}
