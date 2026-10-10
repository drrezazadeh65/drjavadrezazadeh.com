// Adapter-neutral private endpoint handler. Wire only behind a trusted server route.
// Authentication and signal collection are injected, never inferred from browser data.
import {buildAdminEngineReport} from './admin-engine-report.mjs';
const headers=Object.freeze({'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8','Vary':'Cookie, Authorization'});
export async function handleAdminEngineReport({request,authenticate,collectSignals,clock=()=>new Date()}={}){
 const reply=(status,body)=>({status,headers:{...headers},body});
 if(request?.method!=='GET') return reply(405,{error:'METHOD_NOT_ALLOWED'});
 if(typeof authenticate!=='function'||typeof collectSignals!=='function') return reply(503,{error:'REPORT_SERVICE_UNAVAILABLE'});
 let identity;
 try{identity=await authenticate(request);}catch{return reply(401,{error:'AUTHENTICATION_REQUIRED'});}
 if(!identity?.server_authorized||!identity?.email_verified||!['ADMIN','SUPER_ADMIN'].includes(identity?.role)||!identity?.mfa_verified)
  return reply(403,{error:'ADMIN_ACCESS_REQUIRED'});
 try{
  const signals=await collectSignals({admin_id:identity.admin_id,request});
  const body=buildAdminEngineReport({authorization:identity,signals,as_of:clock().toISOString()});
  return reply(200,body);
 }catch{return reply(503,{error:'REPORT_SERVICE_UNAVAILABLE'});}
}
