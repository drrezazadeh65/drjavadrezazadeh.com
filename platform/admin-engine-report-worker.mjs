// Cloudflare Worker bridge for the private admin report.
// This is a factory, NOT a deployed public route. The host must provide a
// trusted session verifier, MFA policy and server-only signal collectors.
import {handleAdminEngineReport} from './admin-engine-report-handler.mjs';
export function createAdminEngineReportWorker({verifySession,collectSignals,clock}={}){
 if(typeof verifySession!=='function'||typeof collectSignals!=='function')
  throw new Error('Server-side session verifier and collectors are mandatory');
 return {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname!=='/api/v1/admin/engine-status')
   return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  // Reject cross-site browser origins; this is defense in depth, not authentication.
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)
   return new Response(JSON.stringify({error:'CROSS_ORIGIN_FORBIDDEN'}),{status:403,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0',
    'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Vary':'Origin'
   }});
  const report=await handleAdminEngineReport({
   request,authenticate:req=>verifySession({request:req,env,ctx}),
   collectSignals:args=>collectSignals({...args,env,ctx}),clock
  });
  return new Response(JSON.stringify(report.body),{status:report.status,headers:{
   ...report.headers,'X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
  }});
 }};
}
