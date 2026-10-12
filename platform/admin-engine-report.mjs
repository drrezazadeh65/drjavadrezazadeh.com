// Pure server-side projection. Caller must authenticate and authorize before invoking.
// No browser import or network endpoint is exposed by this module.
import {ENGINE_REGISTRY,ENGINE_MODULE_OWNERS} from './engine-registry.mjs';
const STATES=new Set(['ACTIVE','DEGRADED','BLOCKED','UNVERIFIED']);
const safeTimestamp=value=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?value:null;
const bounded=(value)=>Number.isSafeInteger(value)&&value>=0?value:null;
export function buildAdminEngineReport({authorization,signals={},as_of=new Date().toISOString()}={}){
 if(authorization?.server_authorized!==true||authorization?.email_verified!==true||
 !['ADMIN','SUPER_ADMIN'].includes(authorization?.role)||authorization?.mfa_verified!==true)
  throw new Error('Authenticated MFA admin required');
 const observedAt=safeTimestamp(as_of);
 if(!observedAt) throw new Error('Valid report timestamp required');
 return Object.freeze({as_of:observedAt,source:'SERVER_VERIFIED_SIGNALS',engine_count:ENGINE_REGISTRY.length,
 engines:ENGINE_REGISTRY.map(engine=>{
  const signal=signals[engine.id];
  const verifiedAt=safeTimestamp(signal?.last_verified_at);
  const age=verifiedAt?Date.parse(observedAt)-Date.parse(verifiedAt):NaN;
  const trusted=signal?.server_verified===true&&verifiedAt!==null&&age>=0&&age<=15*60*1000;
  const status=trusted&&STATES.has(signal.status)?signal.status:'UNVERIFIED';
  return {id:engine.id,owner_module:ENGINE_MODULE_OWNERS[engine.id],
   status,status_reason:status==='UNVERIFIED'?'NO_VERIFIED_SIGNAL':String(signal.reason_code||'UNSPECIFIED').slice(0,80),
   last_verified_at:trusted?signal.last_verified_at:null,
   metrics:trusted?{requests_24h:bounded(signal.requests_24h),errors_24h:bounded(signal.errors_24h)}:{requests_24h:null,errors_24h:null}};
 })});
}
