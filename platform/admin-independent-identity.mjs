// Independent OAuth/OIDC configuration gate; no Cloudflare Zero Trust subscription.
export function validateIndependentAdminIdentity(env={}){
 const errors=[];
 if(!env.ADMIN_DB||typeof env.ADMIN_DB.prepare!=='function')errors.push('D1_UNAVAILABLE');
 if(typeof env.OIDC_ISSUER!=='string'||!env.OIDC_ISSUER.startsWith('https://'))errors.push('ISSUER_REQUIRED');
 if(typeof env.OIDC_CLIENT_ID!=='string'||env.OIDC_CLIENT_ID.length<8)errors.push('CLIENT_ID_REQUIRED');
 if(typeof env.OIDC_REDIRECT_URI!=='string'||!env.OIDC_REDIRECT_URI.startsWith('https://'))errors.push('REDIRECT_URI_REQUIRED');
 if(typeof env.OIDC_CLIENT_SECRET!=='string'||env.OIDC_CLIENT_SECRET.length<16)errors.push('CLIENT_SECRET_REQUIRED');
 if(env.ADMIN_MFA_REQUIRED!=='true')errors.push('MFA_REQUIRED');
 return {ready:errors.length===0,errors};
}
