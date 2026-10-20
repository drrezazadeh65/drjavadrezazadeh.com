import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source=fs.readFileSync('assets/js/analytics-adapter.js','utf8');
const fixture={
 schema_version:'1.0',provider:'GA4',enabled:true,
 measurement_id:'G-C3C7NQQNWX',tag_transport:'GTM_ONLY',gtm_container_id:'GTM-TEST1234',
 consent:{required:true,storage_key:'jr-analytics-consent-v1',granted_value:'granted',denied_value:'denied'},
 allowed_client_events:['consultation_intent'],
 payload_allowlist:['event_key','surface','locale','route','target_kind']
};

async function boot(config=fixture,pathname='/en/services/',search='?email=private%40example.com'){
 const store=new Map(),listeners=new Map(),scripts=[],nodes=[];
 function makeNode(tag){
  return {
   tagName:tag.toUpperCase(),dataset:{},style:{},hidden:false,children:[],events:new Map(),
   setAttribute(){},
   addEventListener(name,handler){this.events.set(name,handler);},
   append(...args){this.children.push(...args);},
   appendChild(child){this.children.push(child);return child;}
  };
 }
 const document={
  documentElement:{lang:pathname.startsWith('/fa/')?'fa':'en'},
  createElement:makeNode,
  querySelector(selector){
   if(selector.includes('googletagmanager.com'))return scripts.find(s=>String(s.src).includes('googletagmanager.com'))||null;
   if(selector.includes('data-jr-analytics'))return scripts.find(s=>s.dataset?.jrAnalytics)||null;
   return null;
  },
  head:{appendChild(node){scripts.push(node);return node;}},
  body:{appendChild(node){nodes.push(node);return node;}}
 };
 const window={
  addEventListener(name,fn){listeners.set(name,fn);}
 };
 const localStorage={
  getItem(key){return store.has(key)?store.get(key):null;},
  setItem(key,value){store.set(key,String(value));}
 };
 vm.runInNewContext(source,{window,document,localStorage,
  location:{pathname,search,href:'https://drjavadrezazadeh.com'+pathname+search},
  fetch:async()=>({ok:true,json:async()=>config}),encodeURIComponent,Date},{timeout:2000});
 await new Promise(resolve=>setImmediate(resolve));
 const objects=()=>Array.from(window.dataLayer||[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.event);
 const consent=()=>Array.from(window.dataLayer||[]).filter(x=>x&&x[0]==='consent').map(x=>Array.from(x));
 const fire=detail=>listeners.get('JR_CONVERSION_INTENT')({detail});
 return {window,store,scripts,nodes,objects,consent,fire};
}

test('no GTM or analytics events are sent before explicit opt-in',async()=>{
 const x=await boot();
 x.fire({event_key:'consultation_intent',surface:'services',target_kind:'ACTION'});
 assert.equal(x.scripts.length,0);
 assert.equal(x.objects().length,0);
 assert.equal(x.window.JRAnalyticsConsent.status(),false);
 assert.ok(x.nodes.some(n=>n.dataset?.jrConsentNotice!==undefined),'privacy prompt should exist when configured');
});

test('one consented GTM loader and one sanitized page view; no direct gtag.js',async()=>{
 const x=await boot();
 assert.equal(x.window.JRAnalyticsConsent.grant(),true);
 assert.equal(x.scripts.length,1);
 assert.equal(x.scripts[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-TEST1234');
 assert.equal(x.scripts[0].dataset.jrAnalytics,'gtm');
 const view=x.objects().filter(v=>v.event==='jr_page_view');
 assert.equal(view.length,1);
 assert.equal(view[0].page_path,'/en/services/');
 assert.equal(view[0].page_location,'https://drjavadrezazadeh.com/en/services/');
 assert.equal(view[0].page_referrer,'');
 assert.ok(!JSON.stringify(x.objects()).includes('private%40example.com'));
 assert.equal(x.window.JRAnalytics.pageView(),false,'do not emit duplicate page_view');
 assert.equal(x.window.JRAnalyticsConsent.grant(),true);
 assert.equal(x.scripts.length,1);
 assert.equal(x.objects().filter(v=>v.event==='jr_page_view').length,1);
 assert.equal(x.consent()[0][1],'default');
 assert.equal(x.consent()[0][2].analytics_storage,'denied');
 assert.equal(x.consent()[1][2].analytics_storage,'granted');
});

test('consent revocation prevents future intent, checkout and item events',async()=>{
 const x=await boot();
 x.window.JRAnalyticsConsent.grant();
 x.fire({event_key:'consultation_intent',surface:'services',target_kind:'ACTION',email:'private@example.com',route:'/en/account/sensitive/'});
 const intent=x.objects().filter(v=>v.event==='jr_intent');
 assert.equal(intent.length,1);
 assert.deepEqual(Object.keys(intent[0]).sort(),['event','intent_key','jr_locale','jr_surface','jr_target_kind','page_location','page_path','page_referrer'].sort());
 assert.ok(!JSON.stringify(intent).includes('private@example.com'));
 assert.ok(!JSON.stringify(intent).includes('/en/account/'));
 assert.equal(x.window.JRAnalytics.beginCheckout(),true);
 assert.equal(x.window.JRAnalytics.beginCheckout(),false,'two rapid clicks are one checkout intention');
 assert.equal(x.window.JRAnalyticsConsent.deny(),true);
 x.fire({event_key:'consultation_intent',surface:'services',target_kind:'ACTION'});
 assert.equal(x.window.JRAnalytics.viewItem('book'),false);
 assert.equal(x.window.JRAnalytics.beginCheckout(),false);
 assert.equal(x.objects().filter(v=>v.event==='jr_intent').length,1);
 assert.equal(x.consent().at(-1)[2].analytics_storage,'denied');
 assert.equal(x.window.JRAnalyticsConsent.grant(),true);
 assert.equal(x.scripts.length,1,'GTM script must not be injected twice');
});

test('no GTM container ID means fail closed despite a configured GA4 measurement ID',async()=>{
 const x=await boot({...fixture,enabled:false,gtm_container_id:null});
 assert.equal(x.window.JRAnalyticsConsent.grant(),false);
 assert.equal(x.window.JRAnalyticsConsent.status(),false);
 assert.equal(x.scripts.length,0);
 assert.equal(x.nodes.length,0);
});

test('private account, assessment and checkout paths never inject GTM',async()=>{
 for(const pathname of ['/en/account/','/fa/app/admin/','/fa/assessments/','/en/shop/checkout/','/fa/shop/payment-result/']){
  const x=await boot(fixture,pathname);
  x.window.JRAnalyticsConsent.grant();
  assert.equal(x.scripts.length,0,pathname);
  assert.equal(x.objects().length,0,pathname);
 }
});

test('success events cannot be forged by a browser-side API',async()=>{
 const x=await boot();
 x.window.JRAnalyticsConsent.grant();
 assert.equal(x.window.JRAnalytics.purchase,undefined);
 assert.equal(x.window.JRAnalytics.registrationCompleted,undefined);
 assert.equal(x.window.JRAnalytics.newsletterCompleted,undefined);
 x.fire({event_key:'purchase',surface:'checkout',target_kind:'ACTION',transaction_id:'forged',value:999});
 assert.equal(x.objects().filter(v=>v.event==='purchase').length,0);
});
