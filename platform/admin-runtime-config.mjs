// Production configuration gate. A private Worker must not start with an
// unconfigured or ambiguous identity-provider integration.
export function validateAdminRuntimeConfig(env={}){
 const failures=[];
 if(!env.ADMIN_DB||typeof env.ADMIN_DB.prepare!=='function')failures.push('ADMIN_DB_D1_MISSING');
 if(typeof env.IDENTITY_ISSUER!=='string'||!/^https:\/\/[^/]+$/.test(env.IDENTITY_ISSUER))failures.push('IDENTITY_ISSUER_INVALID');
 if(typeof env.IDENTITY_AUDIENCE!=='string'||env.IDENTITY_AUDIENCE.length<8)failures.push('IDENTITY_AUDIENCE_INVALID');
 if(env.ADMIN_MFA_REQUIRED!=='true')failures.push('ADMIN_MFA_NOT_ENFORCED');
 if(env.ADMIN_REPORT_ENABLED!=='true')failures.push('ADMIN_REPORT_DISABLED');
 return {ready:failures.length===0,failures};
}
