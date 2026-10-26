import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('sw.js','utf8');
const ecosystem=JSON.parse(fs.readFileSync('platform/ecosystem-registry.json','utf8'));
const prefixes=ecosystem.route_families.filter(route=>ecosystem.policies[route.policy]?.cache==='NO_STORE').map(route=>route.prefix);
const origin='https://example.test';
const key=request=>typeof request==='string'?request:request.url;
function response(path,{control='public, no-cache',body='public',status=200,headers={}}={}){
  const res=new Response(body,{status,headers:{'Cache-Control':control,...headers}});
  Object.defineProperty(res,'url',{value:new URL(path,origin).href});
  // Native clones lack the synthetic final URL used by this fixture.
  res.clone=()=>response(path,{control,body,status,headers});
  return res;
}
function worker(){
  const handlers={},entries=new Map(),calls=[];
  let network=async request=>response(key(request));
  const cache={
    async put(request,res){calls.push(['put',key(request)]);entries.set(key(request),res)},
    async match(request){calls.push(['match',key(request)]);return entries.get(key(request))},
    async delete(request){calls.push(['delete',key(request)]);return entries.delete(key(request))}
  };
  const context=vm.createContext({URL,Response,
    self:{location:{origin},registration:{scope:origin+'/'},clients:{async claim(){}},async skipWaiting(){},addEventListener:(type,handler)=>handlers[type]=handler},
    caches:{async open(){calls.push(['open']);return cache},async keys(){return ['jr-site-old-runtime','other-app-cache']},async delete(name){calls.push(['delete-cache',name])}},
    fetch:(request,options)=>network(request,options)
  });
  vm.runInContext(source,context);
  return {calls,entries,handlers,context,setNetwork:fn=>network=fn,
    async request(path,destination='document',extra={}){
      let result;
      handlers.fetch({request:{url:new URL(path,origin).href,method:'GET',
        mode:destination==='document'?'navigate':'cors',destination,
        headers:new Headers(extra.headers||{}),cache:extra.cache||'default'},
        respondWith:promise=>result=promise});
      return result&&await result;
    }
  };
}

for(const prefix of prefixes){
  test(prefix+' stays network-only with root, slash, child and query variants',async()=>{
    const w=worker();
    for(const path of [prefix.slice(0,-1),prefix,prefix+'index.html',prefix+'record?token=secret']){
      w.setNetwork(async(req,options)=>{assert.equal(options.cache,'no-store');return response(path,{control:'no-store, private'})});
      assert.equal((await w.request(path)).status,200);
      w.setNetwork(async()=>{throw Error('offline')});
      await assert.rejects(w.request(path),/offline/);
    }
    assert.deepEqual(w.calls,[],'private requests must not even open CacheStorage');
  });
}

for(const [label,path,options] of [
  ['no-store','/fa/',{control:'public, no-store'}],
  ['private','/fa/',{control:'private="Set-Cookie", max-age=0'}],
  ['private redirect','/fa/customer-dashboard/',{}],
  ['foreign redirect','https://foreign.test/private',{}]
]){
  test('public navigation rejects and evicts '+label+' responses',async()=>{
    const w=worker();w.entries.set(origin+'/fa/',response('/fa/',{body:'old'}));
    w.setNetwork(async()=>response(path,options));
    assert.equal((await w.request('/fa/')).status,200);
    assert.equal(w.calls.filter(([op])=>op==='put').length,0);
    assert.equal(w.entries.has(origin+'/fa/'),false);
    w.setNetwork(async()=>{throw Error('offline')});
    assert.equal((await w.request('/fa/')).status,0,'must not fall back to evicted content');
  });
}

test('versioned image responses also respect no-store',async()=>{
  const w=worker();w.setNetwork(async()=>response('/assets/photo.png?v=1',{control:'no-store'}));
  assert.equal((await w.request('/assets/photo.png?v=1','image')).status,200);
  assert.equal(w.calls.filter(([op])=>op==='put').length,0);
});

test('public pages and similarly named siblings retain exact offline fallback',async()=>{
  for(const path of ['/fa/services/','/fa/shop/','/fa/shop/golden-talent/','/en/golden-talent/','/fa/services/checkout-help/']){
    const w=worker();assert.equal(vm.runInContext('isPrivate(new URL('+JSON.stringify(origin+path)+'))',w.context),false);
    await w.request(path);assert.equal(w.calls.filter(([op])=>op==='put').length,1);
    w.setNetwork(async()=>{throw Error('offline')});
    assert.equal(await (await w.request(path)).text(),'public');
  }
});

test('activation purges prior site caches and keeps unrelated cache families',async()=>{
  const w=worker();let result;w.handlers.activate({waitUntil:promise=>result=promise});await result;
  assert.deepEqual(w.calls,[['delete-cache','jr-site-old-runtime']]);
});

for(const [label,finalPath,control] of [['no-store','/fa/','no-store'],['private','/fa/','private'],['private redirect','/api/auth/me','public']]){
  test('offline fallback rejects an initially unsafe '+label+' runtime or image entry',async()=>{
    for(const [path,destination] of [['/fa/','document'],['/assets/photo.png?v=1','image']]){
      const w=worker();w.entries.set(origin+path,response(finalPath,{control}));
      w.setNetwork(async()=>{throw Error('offline')});
      assert.equal((await w.request(path,destination)).status,0);
      assert.equal(w.entries.has(origin+path),false);
    }
  });
  test('shell installation and optional offline fallback reject '+label+' responses',async()=>{
    const w=worker();w.setNetwork(async()=>response(finalPath,{control}));
    let installed;w.handlers.install({waitUntil:promise=>installed=promise});await installed;
    assert.equal(w.calls.filter(([op])=>op==='put').length,0);
    w.entries.set('/offline.html',response(finalPath,{control}));
    w.setNetwork(async()=>{throw Error('offline')});
    const res=await vm.runInContext('freshNetwork({url:'+JSON.stringify(origin+'/fa/')+'},{fallback:"/offline.html"})',w.context);
    assert.equal(res.status,0);assert.equal(w.entries.has('/offline.html'),false);
  });
}


test('encoded, repeated-slash and ambiguous private paths never enter CacheStorage',async()=>{
 for(const path of [
  '/%61pi/admin/operations',
  '/%2561pi/admin/operations',
  '/en/%61ccount/admin/',
  '/fa/%61pp%2fadmin/',
  '/en/shop%2fcheckout/',
  '/fa//shop//checkout/',
  '/en/%2525account/',
  '/api/%E0%A4%A',
  '/fa/app/%2e%2e/%61pi/private'
 ]){
  const w=worker();
  if(path.includes('%2e%2e')){
   // Browsers may normalise traversal before interception; assert the
   // interpreted URL does not become an unexpectedly cached private page.
   const actual=new URL(path,origin);
   if(!actual.pathname.includes('api'))continue;
  }
  w.setNetwork(async(req,options)=>{
   assert.equal(options.cache,'no-store','encoded private route '+path);
   return response('/fa/');
  });
  assert.equal((await w.request(path)).status,200,path);
  assert.deepEqual(w.calls,[],path+' entered shared cache');
 }
});

for(const [label,options] of [
 ['Set-Cookie',{headers:{'Set-Cookie':'session=opaque; Secure'}}],
 ['cookie-vary',{headers:{Vary:'Accept-Encoding, Cookie'}}],
 ['authorization-vary',{headers:{Vary:'Authorization'}}],
 ['attachment',{headers:{'Content-Disposition':'attachment; filename="private.pdf"'}}],
 ['partial-response',{status:206}],
 ['explicit private',{control:'private, max-age=0'}]
]){
 test('public navigation never caches '+label+' responses',async()=>{
  const w=worker();
  w.entries.set(origin+'/fa/',response('/fa/',{body:'old'}));
  w.setNetwork(async()=>response('/fa/',options));
  assert.equal((await w.request('/fa/')).status,options.status||200);
  assert.equal(w.calls.filter(([name])=>name==='put').length,0);
  assert.equal(w.entries.has(origin+'/fa/'),false);
 });
}

test('authorization-bearing public requests never populate offline shared cache',async()=>{
 const w=worker();
 w.setNetwork(async()=>response('/en/'));
 await w.request('/en/','document',{headers:{Authorization:'Bearer fake'}}); // synthetic only
 assert.equal(w.calls.filter(([name])=>name==='put').length,0);
});

test('query-parameter versioned images and ordinary fonts use fresh-first, not stale cache-first',async()=>{
 for(const path of ['/assets/images/portrait.webp?v=20261020','/assets/fonts/site.woff2']){
  const w=worker();
  w.entries.set(origin+path,response(path,{body:'old'}));
  w.setNetwork(async(_request,options)=>{
   assert.equal(options.cache,'no-cache','mutable media/font must conditionally revalidate');
   return response(path,{body:'updated'});
  });
  const res=await w.request(path,path.endsWith('.woff2')?'font':'image');
  assert.equal(await res.text(),'updated',path);
  assert.equal(await w.entries.get(origin+path).text(),'updated',path);
 }
});

test('genuinely content-fingerprinted media remains cache-first across navigations',async()=>{
 for(const path of [
   '/assets/img/photo.d41d8cd98f00b204e9800998ecf8427e.webp',
   '/assets/fonts/site-0123456789abcdef.woff2'
 ]){
  const w=worker();
  w.entries.set(origin+path,response(path,{body:'fingerprinted'}));
  w.setNetwork(async()=>{throw Error('fingerprinted bytes should not be fetched');});
  assert.equal(await (await w.request(path,path.endsWith('.woff2')?'font':'image')).text(),'fingerprinted');
 }
});


test('unavailable CacheStorage never blocks a successful live public document',async()=>{
 const w=worker();
 w.context.caches.open=async()=>{throw Error('storage blocked');};
 w.setNetwork(async()=>response('/fa/',{body:'fresh public document'}));
 assert.equal(await (await w.request('/fa/')).text(),'fresh public document');
});

test('quota failures do not turn a successful fetch into stale offline content',async()=>{
 const w=worker();
 w.entries.set(origin+'/en/',response('/en/',{body:'previous version'}));
 const prior=w.context.caches.open;
 w.context.caches.open=async name=>{
  const cache=await prior(name);
  return {...cache,put:async()=>{throw Error('QuotaExceededError');}};
 };
 w.setNetwork(async()=>response('/en/',{body:'deployed fresh version'}));
 assert.equal(await (await w.request('/en/')).text(),'deployed fresh version');
 assert.equal(w.entries.has(origin+'/en/'),false,'failed update must evict unsafe stale cache');
});

test('broken cache match cannot prevent a fresh fingerprinted asset',async()=>{
 const w=worker();
 const oldOpen=w.context.caches.open;
 w.context.caches.open=async name=>{
  const cache=await oldOpen(name);
  return {...cache,match:async()=>{throw Error('corrupt CacheStorage entry');}};
 };
 const path='/assets/images/photo.d41d8cd98f00b204e9800998ecf8427e.webp';
 w.setNetwork(async()=>response(path,{body:'verified-fresh-fingerprint'}));
 assert.equal(await (await w.request(path,'image')).text(),'verified-fresh-fingerprint');
});

test('live HTTP 404 supersedes a previously cached public page',async()=>{
 const w=worker(),route='/en/';
 w.entries.set(origin+route,response(route,{body:'outdated live page'}));
 w.setNetwork(async()=>response(route,{status:404,body:'not found'}));
 const res=await w.request(route);
 assert.equal(res.status,404);
 assert.equal(w.entries.has(origin+route),false);
});


test('public HTML still bypasses stale HTTP cache on every successful navigation',async()=>{
 const w=worker();
 w.entries.set(origin+'/fa/',response('/fa/',{body:'stale first load'}));
 w.setNetwork(async(_request,options)=>{
  assert.equal(options.cache,'reload');
  return response('/fa/',{body:'latest approved document'});
 });
 assert.equal(await (await w.request('/fa/')).text(),'latest approved document');
});

test('content-digest core styles reuse exact cached bytes without contacting a slow origin',async()=>{
 for(const path of [
  '/assets/css/style.0123456789ab.css',
  '/assets/css/public-v2.abcdef012345.css'
 ]){
  const w=worker();
  w.entries.set(origin+path,response(path,{body:'approved immutable stylesheet'}));
  w.setNetwork(async()=>{throw Error('immutable style should not revalidate');});
  assert.equal(await (await w.request(path,'style')).text(),'approved immutable stylesheet');
 }
});

test('query-versioned and unhashed styles still fetch current approved content',async()=>{
 for(const path of [
  '/assets/css/style.css?v=20261026',
  '/assets/css/public-v2.css'
 ]){
  const w=worker();
  w.entries.set(origin+path,response(path,{body:'stale stylesheet'}));
  w.setNetwork(async(_req,options)=>{
   assert.equal(options.cache,'reload');
   return response(path,{body:'current stylesheet'});
  });
  assert.equal(await (await w.request(path,'style')).text(),'current stylesheet');
 }
});
