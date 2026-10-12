// Server-side identity adapter: an identity provider must supply a trusted,
// cryptographically verified session. Never decode browser JWTs as proof.
export function createAdminSessionVerifier({introspectSession,lookupAdmin}={}){
 if(typeof introspectSession!=='function'||typeof lookupAdmin!=='function')
  throw new Error('Trusted session introspection and server role lookup required');
 return async function verifySession({request,env,ctx}={}){
  if(!request?.headers)return null;
  const session=await introspectSession({request,env,ctx});
  if(!session||session.verified!==true||session.email_verified!==true||
     session.mfa_verified!==true||typeof session.subject!=='string'||!session.subject)
   return null;
  const admin=await lookupAdmin({subject:session.subject,env,ctx});
  if(!admin||admin.enabled!==true||!['ADMIN','SUPER_ADMIN'].includes(admin.role))
   return null;
  return {server_authorized:true,email_verified:true,mfa_verified:true,
   role:admin.role,admin_id:admin.id};
 };
}
