// Server-side identity policy primitives. Raw tokens/session secrets must never be persisted.
const ROLES=new Set(['STUDENT','PARENT','TEACHER','CONSULTANT','RESEARCHER','EDITOR','ADMIN','SUPER_ADMIN']);
export function sessionDecision({user,session,now=new Date()}={}){
 if(!user||user.status!=='ACTIVE') return {authenticated:false,reason:'USER_NOT_ACTIVE'};
 if(!user.email_verified_at) return {authenticated:false,reason:'EMAIL_NOT_VERIFIED'};
 if(!session||session.revoked_at) return {authenticated:false,reason:'SESSION_REVOKED_OR_MISSING'};
 if(new Date(session.expires_at)<=now) return {authenticated:false,reason:'SESSION_EXPIRED'};
 return {authenticated:true,user_id:user.id,roles:user.roles||[],client_role_claims_ignored:true};
}
export function recoveryTokenDecision({token_record,now=new Date()}={}){
 if(!token_record||token_record.purpose!=='PASSWORD_RECOVERY'||token_record.consumed_at) return {valid:false};
 return {valid:new Date(token_record.expires_at)>now,single_use:true,revoke_existing_sessions_on_success:true};
}
export function roleChangePlan({actor_roles=[],target_user_id,role,action,reason}={}){
 if(!target_user_id||!ROLES.has(role)||!['GRANT','REVOKE'].includes(action)||!String(reason||'').trim()) throw new Error('Audited role change required');
 const superAdmin=actor_roles.includes('SUPER_ADMIN');
 const admin=actor_roles.includes('ADMIN');
 if(role==='SUPER_ADMIN'&&!superAdmin) throw new Error('Only SUPER_ADMIN may change SUPER_ADMIN');
 if(!superAdmin&&!admin) throw new Error('Administrative role required');
 return {target_user_id,role,action,reason,audit_required:true,client_authoritative:false};
}
