const CACHE_VERSION='jr-site-v9-20261007-v42';
const CACHE_FAMILY='jr-site-';
const STATIC_CACHE=CACHE_VERSION+'-static';
const PUBLIC_CACHE=CACHE_VERSION+'-public';
const CORE=[
  './',
  './offline.html',
  './site.webmanifest',
  './assets/css/style.css',
  './assets/css/public-v2.css',
  './assets/js/site.js',
  './assets/js/language-gateway.js',
  './favicon.svg',
  './assets/images/pwa-icon-192.png',
  './assets/images/pwa-icon-512.png',
  './assets/images/pwa-icon-maskable-512.png',
  './fa/',
  './en/',
  './en/golden-talent/'
];
const PRIVATE_PREFIXES=[
  '/fa/app/','/app/','/fa/login/','/login/','/fa/register/','/register/','/fa/bazyabi-hesab/','/en/login/','/en/register/','/en/recover/','/en/account/',
  '/fa/assessments/','/assessments/','/fa/shop/','/en/shop/','/shop/',
  '/en/golden-talent/assessment/','/en/golden-talent/dashboard/',
  '/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/','/en/golden-talent/checkout/','/en/golden-talent/plans/',
  '/fa/darkhast-moshavere/','/en/request-consultation/'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(STATIC_CACHE);
    await Promise.all(CORE.map(async url=>{
      try{
        const res=await fetch(url,{cache:'reload'});
        if(res.ok) await cache.put(url,res.clone());
      }catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_FAMILY)&&!k.startsWith(CACHE_VERSION)).map(k=>caches.delete(k))))
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
    event.respondWith(
      fetch(req,{cache:'no-store'}).catch(()=>caches.match('./offline.html'))
    );
    return;
  }

  const isAsset=url.pathname.startsWith('/assets/') || /\.(?:css|js|svg|webp|png|jpg|jpeg|woff2?)$/i.test(url.pathname);
  const isCode=/\.(?:css|js)$/i.test(url.pathname);
  if(isAsset){
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache=>{
        // CSS/JS: network-first so a successful deploy is not hidden behind stale app-shell assets.
        if(isCode){
          try{
            const res=await fetch(req,{cache:'no-cache'});
            if(res.ok) await cache.put(req,res.clone());
            return res;
          }catch(e){
            return (await cache.match(req)) || (await cache.match(req,{ignoreSearch:true})) || Response.error();
          }
        }

        // Images/fonts: cache-first is safe and reduces repeat transfer.
        const hit=await cache.match(req);
        if(hit) return hit;
        try{
          const res=await fetch(req,{cache:'reload'});
          if(res.ok) await cache.put(req,res.clone());
          return res;
        }catch(e){
          return Response.error();
        }
      })
    );
    return;
  }

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'reload'}).then(async res=>{
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