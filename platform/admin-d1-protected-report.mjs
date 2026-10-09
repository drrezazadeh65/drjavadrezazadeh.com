// Fail-closed composition: provider-signed identity + D1 grants.
// The identity provider must verify session signatures, audience, expiry and MFA.
import {createAdminSessionVerifier} from './admin-session-verifier.mjs';
import {createD1AdminRoleLookup} from './admin-d1-role-lookup.mjs';
import {createAdminEngineReportWorker} from './admin-engine-report-worker.mjs';
import {validateAdminRuntimeConfig} from './admin-runtime-config.mjs';
export function createD1ProtectedEngineReport({introspectSession,collectSignals,clock}={}){
 const lookupAdmin=createD1AdminRoleLookup();
 const verifySession=createAdminSessionVerifier({introspectSession,lookupAdmin});
 const worker=createAdminEngineReportWorker({verifySession,collectSignals,clock});
 return {async fetch(request,env,ctx){
  if(!validateAdminRuntimeConfig(env).ready)
   return new Response(JSON.stringify({error:'REPORT_SERVICE_UNAVAILABLE'}),{status:503,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0',
    'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'
   }});
  return worker.fetch(request,env,ctx);
 }};
}
