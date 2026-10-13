#!/usr/bin/env node
/* Bertina production readiness checks: public GET requests only; never mutate
 * customers, money, stock, documents, research records or the live database. */
import fs from 'node:fs';
const origin='https://drjavadrezazadeh.com';
const routes=['/fa/','/en/','/fa/register/','/en/register/','/fa/login/',
 '/en/login/','/fa/bazyabi-hesab/','/en/recover/','/fa/services/',
 '/fa/shop/','/fa/darkhast-moshavere/','/journal/','/journal/fa/'];
export function requireCondition(value,code){if(!value)throw Error(code)}
export function authContract(h){
 requireCondition(h?.ok===true && h.service==='auth','auth_contract');
 for(const k of ['ready','registrationReady','database','schemaReady','email','passwordKdf'])
   requireCondition(h[k]===true,'auth_not_ready_'+k);
 return 'auth, schema, email and registration configured';
}
export function commerceContract(c){
 requireCondition(c?.ok===true && c.service==='commerce','commerce_contract');
 requireCondition(c.hardeningRevision==='tls-gate-v1','commerce_tls_version');
 requireCondition(c.checkout===true && c.orderCapture===true,'commerce_not_ready');
 for(const k of ['database','schema','publicTlsConfirmed','commerceEnabled',
 'gatewayKeyConfigured','amountMultiplierValid'])
   requireCondition(c.requirements?.[k]===true,'commerce_gate_'+k);
 return {checkoutConfigured:true,orderCaptureConfigured:true,
   serviceBookingsConfigured:c.requirements?.serviceBookingConfirmed===true,
   vipBookingsConfigured:c.requirements?.vipBookingConfirmed===true,
   shippingConfigured:c.requirements?.bookShippingConfirmed===true,
   inventoryReconciled:c.requirements?.inventoryReconciled===true,
   receiptsConfigured:c.requirements?.orderEmailFulfilmentConfirmed===true,
   paymentClaimSchemaReady:c.requirements?.paymentClaimSchemaReady===true};
}
export function guestContract(status,data){requireCondition(status===401 && data?.ok!==true,'guest_private_access');return 'anonymous access denied'}
export function consultationGate(status,data){
 if(status===503 && data?.error==='secure_lead_capture_unavailable')
   throw Error('consultation_schema_or_runtime_not_ready_http_503');
 return guestContract(status,data);
}
async function query(route,json=false){
 const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),17000);
 try{
  const res=await fetch(origin+route,{method:'GET',redirect:'manual',
   cache:'no-store',credentials:'omit',signal:ctrl.signal,
   headers:{Accept:json?'application/json':'text/html,text/plain,application/xml'}});
  const text=await res.text();
  return {status:res.status,body:json?JSON.parse(text):text};
 }finally{clearTimeout(timeout)}
}
export async function pulse(){
 const results={};let failures=0;
 async function test(label,job){
  try{results[label]={ok:true,value:await job()};console.log('PASS',label)}
  catch(e){failures++;results[label]={ok:false,reason:String(e?.message||e).slice(0,220)};
   console.error('FAIL',label,results[label].reason)}
 }
 await test('auth',async()=>authContract((await query('/api/auth/health',true)).body));
 await test('commerce',async()=>commerceContract((await query('/api/commerce/health',true)).body));
 for(const route of ['/api/auth/me','/api/commerce/history','/api/growth/leads/mine'])
   await test('guest_access_'+route,async()=>{
    const r=await query(route,true);return route==='/api/growth/leads/mine' ? consultationGate(r.status,r.body) : guestContract(r.status,r.body);
   });
 await Promise.all(routes.map(route=>test('page_'+route,async()=>{
  const r=await query(route);
  requireCondition(r.status===200 && /<html\b/i.test(r.body),'public_page_http_or_html');
  if(['/journal/','/journal/fa/','/fa/services/','/fa/shop/'].includes(route)){
    requireCondition(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(r.body),'unexpected_noindex');
    requireCondition(r.body.includes(origin+route),'page_canonical_absent');
  }
  return '200';
 })));
 for(const [label,route,tag] of [
   ['root_sitemap','/sitemap.xml',/<sitemapindex\b/],
   ['journal_sitemap','/journal/sitemap.xml',/<urlset\b/]
 ])await test(label,async()=>{const r=await query(route);
  requireCondition(r.status===200 && tag.test(r.body),'sitemap_unavailable');return '200'});
 await test('release_fingerprint',async()=>{const r=await query('/sw.js');
  requireCondition(r.status===200,'sw_http');
  const m=r.body.match(/jr-site-bertina-([a-f0-9]{40})/);
  requireCondition(Boolean(m),'release_sha_missing');return m[1]});
 const disclaimer='Read-only readiness is NOT proof of real email-token activation, bank settlement, shipment, consultation completion, isolated backup restore, OJS review workflow or Golden Talent scientific field validation.';
 const summary=['## Bertina daily production readiness','',
  'Failed public checks: '+failures,'',
  ...Object.entries(results).map(([k,v])=>(v.ok?'PASS ':'FAIL ')+k+(v.reason?': '+v.reason:'')),
  '',disclaimer].join('\n');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
 console.log('READINESS',JSON.stringify({failures,results,limitations:disclaimer}));
 if(failures)process.exitCode=1;
}
if(process.argv[1]?.endsWith('production-operational-pulse.mjs'))await pulse();
