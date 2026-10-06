// Consent-aware communication planner. Transactional service messages and marketing are distinct.
const TRANSACTIONAL=new Set(['VERIFICATION','PASSWORD_RESET','APPOINTMENT_CONFIRMATION','APPOINTMENT_REMINDER','PAYMENT_RECEIPT','REPORT_READY','CASE_STATUS','SYSTEM_NOTICE']);
export function planEmail({category,template_key,user_id,recipient_hash,preferences={},service_required=false}={}){
 if(!category||!template_key||!recipient_hash) throw new Error('Communication provenance required');
 if(category==='MARKETING'&&preferences.allow_marketing!==true) return {send:false,reason:'MARKETING_OPT_IN_REQUIRED'};
 if(TRANSACTIONAL.has(category)){
  if(!service_required&&preferences.allow_transactional_email===false) return {send:false,reason:'TRANSACTIONAL_PREFERENCE_SUPPRESSED'};
  if(category==='APPOINTMENT_REMINDER'&&preferences.allow_appointment_reminders===false) return {send:false,reason:'REMINDER_SUPPRESSED'};
 }
 return {send:true,category,template_key,user_id:user_id||null,recipient_hash,provider_message_id:null,status:'QUEUED',marketing_consent_inferred:false};
}
export function authorizeThreadAction({actor_user_id,participants=[],thread_status,action}={}){
 const active=participants.some(p=>p.user_id===actor_user_id&&!p.left_at);
 if(!active) return {allowed:false,reason:'NOT_ACTIVE_PARTICIPANT'};
 if(action==='SEND'&&thread_status!=='OPEN') return {allowed:false,reason:'THREAD_NOT_OPEN'};
 return {allowed:true};
}
export function safeNotification({user_id,type,title,action_url=null}={}){
 if(!user_id||!type||!String(title||'').trim()) throw new Error('Notification metadata required');
 return {user_id,notification_type:type,title,body:null,action_url,status:'UNREAD',sensitive_payload:false};
}
