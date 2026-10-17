// Read-only Bertina acceptance. No credentials, orders, payment requests or mutations.
import fs from 'node:fs';
import {inspectPublicServiceRoute,serviceRoutesFromCatalog} from './lib/public-service-route-contract.mjs';
import {assessPublicReleaseEvidence} from './lib/public-release-acceptance.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
const expected=(process.env.BERTINA_EXPECTED_RELEASE_SHA||'').trim();
const output=process.env.BERTINA_ACCEPTANCE_EVIDENCE||'bertina-postrelease-evidence.json';
const checks=[];
let failures=0;
async function inspect(name,task){
 try{const detail=await task();checks.push({name,passed:true,...(detail||{})});console.log('PASS '+name);}
 catch(_){checks.push({name,passed:false,reason:'read_only_check_failed'});failures++;console.error('FAIL '+name);}
}
async function get(path){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(ORIGIN+path,{method:'GET',redirect:'manual',cache:'no-store',
   headers:{Accept:'text/html,application/json,application/javascript,text/xml;q=0.9'},signal:controller.signal});
  if(response.status!==200)throw new Error('unexpected_http_status');
  return await response.text();
 }finally{clearTimeout(timer);}
}
if(expected&&!/^[a-f0-9]{40}$/.test(expected))throw new Error('invalid_expected_release_sha');
let observed=null;
await inspect('trusted-https-release-fingerprint',async()=>{
 const script=await get('/sw.js');
 const match=script.match(/CACHE_VERSION\s*=\s*['"]jr-site-bertina-([a-f0-9]{40})['"]/);
 if(!match)throw new Error('release_stamp_missing');
 observed=match[1];
 if(expected&&observed!==expected)throw new Error('live_release_not_expected_deploy');
 return {releaseSha:observed,matchedExpected:expected?true:null};
});
await inspect('email-auth-runtime-ready',async()=>{
 const h=JSON.parse(await get('/api/auth/health'));
 if(h?.ok!==true||h.service!=='auth'||h.ready!==true||h.database!==true
    ||h.schemaReady!==true||h.email!==true||h.passwordKdf!==true)throw new Error('auth_unready');
 if(h.smtpEffectiveProviderSettingsMatch===false)throw new Error('smtp_mismatch');
 return {ready:true,dbSchemaVerified:true,verifiedEndToEndEmailDelivery:false};
});
await inspect('commerce-runtime-safe',async()=>{
 const h=JSON.parse(await get('/api/commerce/health'));
 if(h?.ok!==true||h.service!=='commerce'||typeof h.checkout!=='boolean'
  ||typeof h.requirements?.publicTlsConfirmed!=='boolean')throw new Error('commerce_contract');
 for(const key of ['books','services','vip']){
  if(typeof h.capabilities?.[key]!=='boolean')throw new Error('missing_capability');
  if(h.capabilities[key]===true&&h.checkout!==true)throw new Error('capability_without_checkout');
 }
 if(h.checkout===true&&h.requirements.publicTlsConfirmed!==true)throw new Error('checkout_without_tls');
 return {checkoutAdvertised:h.checkout,realPaymentOrSettlementVerified:false,inventoryVerified:false};
});
const xml=fs.readFileSync('sitemap-news.xml','utf8');
const links=[...xml.matchAll(/<loc>(https:\/\/drjavadrezazadeh\.com\/fa\/akhbar\/[^<]+\/)<\/loc>/g)]
 .map(m=>m[1]).filter(url=>!/(\/entekhab-reshteh-1405\/|\/farakhvan-jhela\/)$/.test(url));
await inspect('source-13-article-route-registry',async()=>{
 if(links.length<13||new Set(links).size!==links.length)throw new Error('article_registry_invalid');
 return {articleCount:links.length};
});
if(links.length>=13&&new Set(links).size===links.length){
 for(let i=0;i<links.length;i+=3){
  await Promise.all(links.slice(i,i+3).map(async link=>{
   const path=new URL(link).pathname;
   await inspect('article:'+path,async()=>{
    const html=await get(path);
    if(!html.includes('<link rel="canonical" href="'+link+'"'))throw new Error('canonical_mismatch');
    if(/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
     throw new Error('unexpected_noindex');
    if(!html.includes('"NewsArticle"')&&!html.includes('"Article"'))
     throw new Error('article_schema_missing');
    return {http200:true,selfCanonical:true,indexableSource:true};
   });
  }));
 }
}

// Additional P0 host observations are deliberately NON-GATING for the older
// 17-check public release acceptance. A public GET cannot prove real SMTP
// delivery, a private user journey, settlement, OJS security or DB restoration.
const operationalGates=[];
async function observeHostGate(name,task){
  try{
    const result=await task();
    operationalGates.push({name,...result});
    console.log('OBSERVE '+name+' '+result.status);
  }catch(_){
    operationalGates.push({name,status:'HOST_UNVERIFIED',reason:'trusted_public_read_unavailable'});
    console.log('UNVERIFIED '+name);
  }
}
async function getPublicJson(path){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(ORIGIN+path,{method:'GET',redirect:'manual',
      headers:{Accept:'application/json'},signal:controller.signal});
    if(response.status!==200)return {httpStatus:response.status,body:null};
    const body=await response.json();
    if(!body||typeof body!=='object'||Array.isArray(body))
      throw new Error('invalid_public_json');
    return {httpStatus:200,body};
  }finally{clearTimeout(timer);}
}
// Specific 2026-10-17 Google Search Console smartphone 404: validate the
// one-hop semantic /home/ -> / route; never request indexing of the alias.
// This is non-gating until a signed production release ships the Apache rule.
await observeHostGate('gsc-home-legacy-301',async()=>{
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(ORIGIN+'/home/',{
   method:'GET',redirect:'manual',cache:'no-store',
   headers:{Accept:'text/html'},signal:controller.signal
  });
  const location=response.headers.get('location');
  const correct=response.status===301&&location===ORIGIN+'/';
  return {
   status:correct?'LIVE_VERIFIED':'HOST_UNVERIFIED',
   httpStatus:response.status,
   destination:location===ORIGIN+'/'?'/':null,
   oneHopPermanentCanonical:correct,
   googleIndexConsolidationVerified:false,
   note:'Public read-only response; does not confirm Google has recrawled or indexed any page.'
  };
 }finally{clearTimeout(timer);}
});

await observeHostGate('ramzinex-public-indicative-rate',async()=>{
  const r=await getPublicJson('/api/rates/usdt-irt');
  if(r.httpStatus!==200)return {status:r.httpStatus===503?'BLOCKED_BY_CONFIGURATION':'HOST_UNVERIFIED',
    httpStatus:r.httpStatus,paymentQuoteVerified:false};
  const p=r.body;
  if(p?.ok!==true||p.schema!=='ramzinex-usdt-irr-indicative-v1'||
     p.rate?.pairId!==11||p.rate?.base!=='USDT'||p.rate?.quote!=='IRR'||
     p.rate?.indicativeOnly!==true||p.rate?.paymentQuote!==false||
     !Number.isFinite(p.rate?.buyToman)||!Number.isFinite(p.rate?.sellToman))
    return {status:'FAILED',httpStatus:200,reason:'unexpected_public_rate_contract',
      paymentQuoteVerified:false};
  return {status:'LIVE_VERIFIED',httpStatus:200,indicativeRateOnly:true,
    paymentQuoteVerified:false,observedAt:p.rate.receivedAt||null};
});
await observeHostGate('newsletter-consent-schema-not-delivery',async()=>{
  const r=await getPublicJson('/api/newsletter/health');
  if(r.httpStatus!==200||r.body?.schema!=='newsletter-preferences-v1')
    return {status:'HOST_UNVERIFIED',httpStatus:r.httpStatus,
      actualInboxDeliveryVerified:false};
  return {status:r.body.ready===true?'LIVE_VERIFIED':'BLOCKED_BY_CONFIGURATION',
    httpStatus:200,preferenceSchemaReady:r.body.ready===true,
    actualInboxDeliveryVerified:false,subscriptionMailWorkerVerified:false};
});
await observeHostGate('jhela-founding-intake-readiness',async()=>{
  const r=await getPublicJson('/api/journal/intake/health');
  if(r.httpStatus!==200||r.body?.schema!=='jhela-public-intake-readiness-v1')
    return {status:'HOST_UNVERIFIED',httpStatus:r.httpStatus,realSubmissionVerified:false};
  const b=r.body;
  return {status:b.manuscriptIntake===true&&b.reviewerIntake===true?
      'HOST_UNVERIFIED':'BLOCKED_BY_CONFIGURATION',
    httpStatus:200,authorProfileReady:b.profile===true,
    manuscriptIntakeConfigured:b.manuscriptIntake===true,
    reviewerIntakeConfigured:b.reviewerIntake===true,
    ojsReviewConnected:b.ojsFormalPeerReviewConnected===true,
    realSubmissionVerified:false};
});
await observeHostGate('jhela-ojs-subdomain-tls',async()=>{
  // Fetch checks CA-trusted TLS. Never follow redirects or expose installer HTML.
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('https://journal.drjavadrezazadeh.com/',{
      method:'GET',redirect:'manual',signal:controller.signal});
    return {status:'HOST_UNVERIFIED',httpStatus:response.status,
      trustedTlsHandshake:true,installedOjsOrPrivateUploadsVerified:false};
  }finally{clearTimeout(timer);}
});

// Public-only 21 x 2 service route observation: HTTP 200, canonical,
// reciprocal hreflang, indexability, real checkout link and visible H1.
// Deliberately NON-GATING for the established 17-check observer. A clean
// source/browser result cannot prove a payment, fulfilled service or refund.
await observeHostGate('bilingual-public-service-pages-21x2',async()=>{
 const catalog=JSON.parse(fs.readFileSync('assets/data/service-catalog.json','utf8'));
 const routes=serviceRoutesFromCatalog(catalog);
 const inspected=[];
 for(let i=0;i<routes.length;i+=6){
   await Promise.all(routes.slice(i,i+6).map(async item=>{
     try{
       const controller=new AbortController();
       const timer=setTimeout(()=>controller.abort(),12000);
       let response;
       try{
         response=await fetch(ORIGIN+item.path,{
           method:'GET',redirect:'manual',cache:'no-store',
           headers:{Accept:'text/html'},signal:controller.signal
         });
         if(response.status!==200){
           inspected.push({...item,ok:false,httpStatus:response.status,
             failures:['http_status_'+response.status]});
           return;
         }
         const html=await response.text();
         const result=inspectPublicServiceRoute(html,{id:item.id,locale:item.locale,origin:ORIGIN});
         inspected.push({...item,httpStatus:200,...result});
       }finally{clearTimeout(timer);}
     }catch(_){
       inspected.push({...item,ok:false,httpStatus:null,failures:['trusted_tls_network_or_timeout']});
     }
   }));
 }
 const failed=inspected.filter(r=>!r.ok);
 return {
   status:failed.length?'HOST_UNVERIFIED':'LIVE_VERIFIED',
   expectedPages:42,inspectedPages:inspected.length,
   publicPagesMatchingContract:inspected.length-failed.length,
   failedRoutes:failed.map(({path,failures})=>({path,failures})),
   notes:'Public routes only; payment, user and owner dashboards, funds, fulfilment and academic endorsement are NOT verified.',
   verifiedEndToEndPurchase:false,verifiedDelivery:false,verifiedBeneficiarySettlement:false
 };
});

// Future Publishing: public-only availability audit for the first multi-author
// scientific PDF listing. No payment, SMTP send, account login or private file
// access is attempted here. This does not grant publication rights or sign a
// contributor agreement.
await observeHostGate('mirkarimi-public-author-and-digital-offer',async()=>{
 const pagePath='/fa/shop/authors/mehrab-mirkarimi/';
 const url=ORIGIN+pagePath;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 let status=null, pageOk=false;
 try{
   const response=await fetch(url,{method:'GET',redirect:'manual',
     headers:{Accept:'text/html'},signal:controller.signal});
   status=response.status;
   if(status===200){
     const page=await response.text();
     pageOk=page.includes('<link rel="canonical" href="'+url+'"')
       && page.includes('id="jp-digital-checkout-form"')
       && page.includes('jr-publishing-checkout-v1.js')
       && page.includes('تأییدیه نهایی هنوز صادر نشده')
       && !/[a-z0-9._%+-]*mirkarimi[a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/i.test(page);
   }
 }finally{clearTimeout(timer);}
 const offer=await getPublicJson('/api/publishing/offer');
 const ready=offer.httpStatus===200&&offer.body?.ok===true
   &&offer.body?.available===true&&offer.body?.checkoutEnabled===true
   &&offer.body?.sku==='digital:tefl-ma-exams-1370-1405'
   &&offer.body?.priceToman===1000000;
 return {
   status:status===200&&pageOk&&offer.httpStatus===200
     ?'LIVE_VERIFIED':'HOST_UNVERIFIED',
   pageHttpStatus:status,publicPagePassesSourceDisclosure:pageOk,
   offerHttpStatus:offer.httpStatus,publicCheckoutReadyClaim:ready,
   actualBankPaymentAndVerifiedPrivatePdfDelivery:false,
   authorDistributionRightsIndependentlyReviewed:false,
   genuineContributorSignatureVerified:false,
   academicPeerReviewComplete:false,
   note:'Public HTTP read is not evidence of paid file custody, signed author rights, settlement, buyer email or both downloads.'
 };
});

const evidence={
 schema:'bertina-postrelease-acceptance-v1',checkedAt:new Date().toISOString(),
 origin:ORIGIN,expectedReleaseSha:expected||null,observedReleaseSha:observed,
 readOnly:true,authenticatedRequests:false,realMoneyActions:false,
 passed:failures===0,checks,operationalGates,
 limitation:'Anonymous HTTPS source/live observations, not proof of email inbox delivery, independent backup restore, real order, stock, BitPay settlement or protected admin login; operationalGates are public-only observations.'
};
// Legacy smoke remains backward-compatible; stricter P0 status is separate.
// A passing 17-check smoke run MUST NOT be represented as 42/42 route recovery.
evidence.publicReleaseAcceptance=assessPublicReleaseEvidence(evidence);
console.log('Public P0 deployment acceptance: '+evidence.publicReleaseAcceptance.publicP0Acceptance);
fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
console.log('Read-only operational acceptance: '+(failures===0?'PASS':'FAIL')+'; '+checks.length+' checks.');
if(failures)process.exitCode=1;
