/** Pure, fail-closed document issuance eligibility checks; never performs issuance. */
const TYPES=new Set(["receipt","invoice","consultation_confirmation","assessment_report","certificate","donation_acknowledgement"]);
const isRecord=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const nonempty=x=>typeof x==="string"&&x.trim().length>0;
export function evaluateIssuanceEligibility(input){
 const reasons=[];
 if(!isRecord(input))return {eligible:false,reasons:["INVALID_REQUEST"]};
 if(!TYPES.has(input.document_type))reasons.push("UNSUPPORTED_DOCUMENT");
 if(!isRecord(input.actor)||input.actor.authenticated!==true||!nonempty(input.actor.account_id))reasons.push("UNAUTHENTICATED");
 if(!isRecord(input.source)||!nonempty(input.source.id)||!nonempty(input.source.type))reasons.push("UNTRUSTED_SOURCE");
 if(!isRecord(input.authorization)||input.authorization.allowed!==true)reasons.push("NOT_AUTHORIZED");
 if(!nonempty(input.template_version)||!nonempty(input.brand_version))reasons.push("UNVERSIONED_TEMPLATE");
 if(!isRecord(input.audit)||input.audit.ready!==true)reasons.push("AUDIT_NOT_READY");
 if(input.subject_is_minor===true&&(!isRecord(input.guardian)||input.guardian.authorized!==true))reasons.push("GUARDIAN_AUTH_REQUIRED");
 if(["receipt","donation_acknowledgement"].includes(input.document_type)){
  const p=input.payment;
  if(!isRecord(p)||p.server_verified!==true||p.state!=="SETTLED"||p.order_matches!==true||p.amount_matches!==true||p.currency_matches!==true||!nonempty(p.provider_event_id)||p.event_unique!==true)reasons.push("PAYMENT_NOT_VERIFIED");
 }
 if(input.document_type==="invoice"&&(!isRecord(input.invoice)||input.invoice.server_computed!==true||input.invoice.immutable_snapshot!==true))reasons.push("INVOICE_NOT_FINAL");
 if(input.document_type==="consultation_confirmation"&&(!isRecord(input.booking)||input.booking.accepted!==true||input.booking.slot_confirmed!==true||input.booking.account_matches!==true))reasons.push("BOOKING_NOT_CONFIRMED");
 if(input.document_type==="assessment_report"&&(!isRecord(input.assessment)||input.assessment.consent_valid!==true||input.assessment.instrument_version_verified!==true||input.assessment.interpretation_version_verified!==true||input.assessment.review_complete!==true))reasons.push("ASSESSMENT_NOT_APPROVED");
 if(input.document_type==="certificate"&&(!isRecord(input.award)||input.award.completion_verified!==true||input.award.issuer_approved!==true))reasons.push("AWARD_NOT_APPROVED");
 return {eligible:reasons.length===0,reasons};
}
