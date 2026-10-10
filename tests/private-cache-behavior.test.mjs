import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('sw.js','utf8');
const ecosystem=JSON.parse(fs.readFileSync('platform/ecosystem-registry.json','utf8'));
const prefixes=ecosystem.route_families.filter(route=>ecosystem.policies[route.policy]?.cache==='NO_STORE').map(route=>route.prefix);
const origin='https://example.test';
const key=request=>typeof request==='string'?request:request.url;
function response(path,{control='public, no-cache',body='public'}={}){
  const res=new Response(body,{headers:{'Cache-Control':control}});
  Object.defineProperty(res,'url',{value:new URL(path,origin).href});
  // Native clones lack the synthetic final URL used by this fixture.
  res.clone=()=>response(path,{control,body});
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
    async request(path,destination='document'){
      let result;
      handlers.fetch({request:{url:new URL(path,origin).href,method:'GET',mode:destination==='document'?'navigate':'cors',destination},respondWith:promise=>result=promise});
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
