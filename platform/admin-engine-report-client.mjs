// Pure client adapter for a private admin reporting service. No public endpoint is embedded.
// The caller must supply a same-origin, authenticated transport with credentials and CSRF.
const STATES=new Set(['ACTIVE','DEGRADED','BLOCKED','UNVERIFIED']);
export function normalizeEngineReport(payload){
 if(!payload||!Array.isArray(payload.engines)||typeof payload.as_of!=='string'||Number.isNaN(Date.parse(payload.as_of)))
  throw new Error('Invalid engine report response');
 return {as_of:payload.as_of,engines:payload.engines.map(row=>{
  if(!row||typeof row.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(row.id)) throw new Error('Invalid engine identifier');
  const status=STATES.has(row.status)?row.status:'UNVERIFIED';
  return {id:row.id,owner_module:typeof row.owner_module==='string'?row.owner_module:'',
   status,last_verified_at:typeof row.last_verified_at==='string'&&!Number.isNaN(Date.parse(row.last_verified_at))?row.last_verified_at:null,
   requests_24h:Number.isSafeInteger(row.metrics?.requests_24h)&&row.metrics.requests_24h>=0?row.metrics.requests_24h:null,
   errors_24h:Number.isSafeInteger(row.metrics?.errors_24h)&&row.metrics.errors_24h>=0?row.metrics.errors_24h:null};
 })};
}
export async function loadAdminEngineReport({transport,signal}={}){
 if(typeof transport!=='function') throw new Error('Authorized admin transport required');
 const payload=await transport({signal});
 return normalizeEngineReport(payload);
}
