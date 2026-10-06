// Server-side identity policy primitives. Raw tokens/session secrets must never be persisted.
const ROLES=new Set(['STUDENT','PARENT','TEACHER','CONSULTANT','COUNSELLOR','RESEARCHER','CONSULTATION_CLIENT','INSTITUTION','EDITOR','ADMIN','SUPER_ADMIN']);
const E164=/^\+[1-9]\d{7,14}$/;
const cleanEmail=email=>String(email||'').trim().toLowerCase();
export function registrationPlan({email,mobile_e164,role='STUDENT'}={}){
 const e=cleanEmail(email);
 const mobile=String(mobile_e164||'').replace(/[\s()-]/g,'');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Valid email required');
 if(!E164.test(mobile)) throw new Error('Mobile number in E.164 format required');
 if(!ROLES.has(role)) throw new Error('Supported role required');
 return {email:e,mobile_e164:mobile,role,status:'PENDING',email_verified_at:null,verification_channel:'EMAIL',login_identifier:'EMAIL',recovery_channel:'EMAIL',mobile_purpose:'CONTACT_ONLY',mobile_verification_required:false,sms_login_allowed:false,whatsapp_login_allowed:false,activation_requires_email_verification:true};
}
export function loginIdentifier(input){
 const email=cleanEmail(input);
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email login identifier required');
 return {type:'EMAIL',value:email};
}
export function recoveryRequestPlan({email}={}){
 const e=cleanEmail(email);
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Valid email required');
 return {identifier_type:'EMAIL',email:e,response_must_be_generic:true,channel:'EMAIL',single_use_token:true,rate_limit_required:true};
}
export function sessionDecision({user,session,now=new Date()}={}){
 if(!user||user.status!=='ACTIVE') return {authenticated:false,reason:'USER_NOT_ACTIVE'};
 if(!user.email_verified_at) return {authenticated:false,reason:'EMAIL_NOT_VERIFIED'};
 if(!session||session.revoked_at) return {authenticated:false,reason:'SESSION_REVOKED_OR_MISSING'};
 if(new Date(session.expires_at)<=now) return {authenticated:false,reason:'SESSION_EXPIRED'};
 return {authenticated:true,user_id:user.id,roles:user.roles||[],client_role_claims_ignored:true};
}
export function recoveryTokenDecision({token_record,now=new Date()}={}){
 if(!token_record||token_record.purpose!=='PASSWORD_RECOVERY'||token_record.consumed_at) return {valid:false};
 return {valid:new Date(token_record.expires_at)>now,single_use:true,revoke_existing_sessions_on_success:true,recovery_channel:'EMAIL'};
}
export function roleChangePlan({actor_roles=[],target_user_id,role,action,reason}={}){
 if(!target_user_id||!ROLES.has(role)||!['GRANT','REVOKE'].includes(action)||!String(reason||'').trim()) throw new Error('Audited role change required');
 const superAdmin=actor_roles.includes('SUPER_ADMIN');
 const admin=actor_roles.includes('ADMIN');
 if(role==='SUPER_ADMIN'&&!superAdmin) throw new Error('Only SUPER_ADMIN may change SUPER_ADMIN');
 if(!superAdmin&&!admin) throw new Error('Administrative role required');
 return {target_user_id,role,action,reason,audit_required:true,client_authoritative:false};
}
