// D1-backed server role lookup. Run only inside an authenticated Cloudflare Worker.
// The SQL table is provisioned separately; no browser can write admin grants.
export function createD1AdminRoleLookup({binding='ADMIN_DB'}={}){
 if(!/^[A-Z][A-Z0-9_]*$/.test(binding))throw new Error('Invalid D1 binding');
 return async function lookupAdmin({subject,env}={}){
  if(typeof subject!=='string'||!subject||subject.length>256)return null;
  const db=env?.[binding];
  if(!db||typeof db.prepare!=='function')throw new Error('Admin role store unavailable');
  const row=await db.prepare('SELECT admin_id, role, enabled FROM admin_role_grant WHERE identity_subject = ? LIMIT 1')
   .bind(subject).first();
  if(!row||row.enabled!==1||!['ADMIN','SUPER_ADMIN'].includes(row.role))return null;
  return {id:row.admin_id,role:row.role,enabled:true};
 };
}
