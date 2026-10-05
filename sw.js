const CACHE_VERSION='jr-site-v1-20261006';
const STATIC_CACHE=CACHE_VERSION+'-static';
const PUBLIC_CACHE=CACHE_VERSION+'-public';
const CORE=[
  './',
  './offline.html',
  './site.webmanifest',
  './assets/css/style.css',
  './assets/js/site.js',
  './fa/',
  './en/',
  './en/golden-talent/'
];
const PRIVATE_PREFIXES=[
  '/fa/app/','/app/','/fa/login/','/login/','/fa/register/','/register/','/en/login/','/en/register/','/en/account/',
  '/fa/assessments/','/assessments/','/fa/shop/','/shop/',
  '/en/golden-talent/assessment/','/en/golden-talent/dashboard/',
  '/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/','/en/golden-talent/checkout/'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>!k.startsWith(CACHE_VERSION)).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function localPath(url){
  const scopePath=new URL(self.registration.scope).pathname;
  if(url.pathname.startsWith(scopePath)){
    const rest=url.pathname.slice(scopePath.length);
    return '/'+rest.replace(/^\/+/, '');
  }
  return url.pathname;
}
function isPrivate(url){
  const path=localPath(url);
  return PRIVATE_PREFIXES.some(p=>path.startsWith(p));
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(isPrivate(url)){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  const isAsset=url.pathname.startsWith('/assets/') || /\.(?:css|js|svg|webp|png|jpg|jpeg|woff2?)$/i.test(url.pathname);
  if(isAsset){
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache=>{
        const hit=await cache.match(req,{ignoreSearch:true});
        const network=fetch(req).then(res=>{
          if(res.ok) cache.put(req,res.clone());
          return res;
        }).catch(()=>hit);
        return hit||network;
      })
    );
    return;
  }

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(async res=>{
        if(res.ok){
          const cache=await caches.open(PUBLIC_CACHE);
          cache.put(req,res.clone());
        }
        return res;
      }).catch(async()=>{
        const cache=await caches.open(PUBLIC_CACHE);
        return (await cache.match(req)) || (await caches.match('./offline.html'));
      })
    );
  }
});