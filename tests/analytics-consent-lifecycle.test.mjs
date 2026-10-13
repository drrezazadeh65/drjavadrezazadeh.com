import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source=fs.readFileSync('assets/js/analytics-adapter.js','utf8');
const fixture={
  schema_version:'1.0',provider:'GA4',enabled:true,measurement_id:'G-TEST123456',
  consent:{required:true,storage_key:'jr-analytics-consent-v1',granted_value:'granted',denied_value:'denied'},
  allowed_client_events:['consultation_intent'],
  payload_allowlist:['event_key','surface','locale','route','target_kind']
};

async function boot(config){
  const store=new Map(),listeners=new Map(),scripts=[];
  const window={
    dataLayer:[],
    addEventListener(name,handler){listeners.set(name,handler);}
  };
  const document={
    documentElement:{lang:'en'},
    createElement(){return {dataset:{}};},
    head:{appendChild(node){scripts.push(node);}}
  };
  const localStorage={
    getItem(key){return store.has(key)?store.get(key):null;},
    setItem(key,value){store.set(key,String(value));}
  };
  vm.runInNewContext(source,{
    window,document,localStorage,
    location:{pathname:'/en/services/'},
    fetch:async()=>({ok:true,json:async()=>config}),
    encodeURIComponent,Date
  },{timeout:2000});
  await new Promise(resolve=>setImmediate(resolve));
  const fire=()=>listeners.get('JR_CONVERSION_INTENT')({
    detail:{event_key:'consultation_intent',surface:'services',locale:'en',
      route:'/en/services/',target_kind:'CONTACT',email:'private@example.test'}
  });
  const events=()=>window.dataLayer.map(args=>Array.from(args))
    .filter(args=>args[0]==='event'&&args[1]==='consultation_intent');
  const consentUpdates=()=>window.dataLayer.map(args=>Array.from(args))
    .filter(args=>args[0]==='consent'&&args[1]==='update');
  return {window,store,scripts,fire,events,consentUpdates};
}

test('no analytics script or event before consent, regardless of CTA',async()=>{
  const s=await boot(fixture);
  s.fire();
  assert.equal(s.scripts.length,0);
  assert.equal(s.events().length,0);
  assert.equal(s.window.JRAnalyticsConsent.status(),false);
});

test('revoke stops all later events; regrant resumes without duplicate script',async()=>{
  const s=await boot(fixture);
  assert.equal(s.window.JRAnalyticsConsent.grant(),true);
  assert.equal(s.scripts.length,1);
  s.fire();
  assert.equal(s.events().length,1);
  assert.deepEqual(Object.keys(s.events()[0][2]).sort(),['locale','route','surface','target_kind']);
  assert.equal(s.window.JRAnalyticsConsent.deny(),true);
  assert.equal(s.window.JRAnalyticsConsent.status(),false);
  s.fire();
  assert.equal(s.events().length,1,'event must not transmit after consent revocation');
  assert.equal(s.consentUpdates().at(-1)[2].analytics_storage,'denied');
  assert.equal(s.window.JRAnalyticsConsent.grant(),true);
  assert.equal(s.consentUpdates().at(-1)[2].analytics_storage,'granted');
  assert.equal(s.scripts.length,1,'no duplicate GA4 injection after regrant');
  s.fire();
  assert.equal(s.events().length,2);
});

test('unconfigured analytics remains fail-closed even with stored opt-in',async()=>{
  const s=await boot({...fixture,enabled:false,measurement_id:null});
  assert.equal(s.window.JRAnalyticsConsent.grant(),false);
  s.fire();
  assert.equal(s.scripts.length,0);
  assert.equal(s.events().length,0);
});
