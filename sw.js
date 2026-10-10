/* JR Cache Standard v2.0 — fresh-by-default, offline-safe, privacy-safe */
const CACHE_VERSION='jr-site-20261010-bertina-cache-v5';
const CACHE_FAMILY='jr-site-';
const SHELL_CACHE=CACHE_VERSION+'-shell';
const RUNTIME_CACHE=CACHE_VERSION+'-runtime';
const OFFLINE_URL='/offline.html';

const CORE=[
  OFFLINE_URL,
  '/favicon.svg',
  '/assets/images/pwa-icon-192.png',
  '/assets/images/pwa-icon-512.png',
  '/assets/images/pwa-icon-maskable-512.png'
];

const PRIVATE_PREFIXES=[
  '/api/','/fa/services/checkout/','/fa/shop/golden-talent/checkout/',
  '/fa/app/','/fa/customer-dashboard/','/app/','/fa/login/','/login/','/fa/register/','/register/','/fa/bazyabi-hesab/',
  '/en/login/','/en/register/','/en/recover/','/en/account/',
  '/fa/assessments/','/assessments/',
  '/fa/shop/cart/','/fa/shop/checkout/','/fa/shop/payment-start/','/fa/shop/payment-return/','/fa/shop/payment-result/',
  '/en/shop/cart/','/en/shop/checkout/',
  '/en/golden-talent/assessment/','/en/golden-talent/dashboard/',
  '/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/',
  '/en/golden-talent/checkout/','/en/golden-talent/plans/',
  '/fa/darkhast-moshavere/','/en/request-consultation/'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    await Promise.all(CORE.map(async url=>{
      try{
        const res=await fetch(url,{cache:'reload'});
        if(isCacheableResponse(res)) await cache.put(url,res.clone());
      }catch(_){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k.startsWith(CACHE_FAMILY) && !k.startsWith(CACHE_VERSION))
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  const type=event.data && event.data.type;
  if(type==='SKIP_WAITING'){
    self.skipWaiting();
    return;
  }
  if(type==='PURGE_RUNTIME'){
    event.waitUntil(caches.delete(RUNTIME_CACHE));
    return;
  }
  if(type==='PURGE_ALL'){
    event.waitUntil(
      caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_FAMILY)).map(k=>caches.delete(k))))
    );
  }
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
  return PRIVATE_PREFIXES.some(prefix=>path===prefix.slice(0,-1) || path.startsWith(prefix));
}

function isCacheableResponse(res){
  if(!res.ok) return false;
  const control=res.headers.get('Cache-Control')||'';
  if(/(?:^|,)\s*(?:no-store|private)(?:\s*(?:=|,)|\s*$)/i.test(control)) return false;
  if(res.url){
    const finalUrl=new URL(res.url);
    if(finalUrl.origin!==self.location.origin || isPrivate(finalUrl)) return false;
  }
  return true;
}

function isMutableCode(url){
  return /\.(?:css|js|mjs|json)$/i.test(url.pathname) ||
    /(?:site\.webmanifest|manifest\.json)$/i.test(url.pathname);
}

function isFont(url){
  return /\.(?:woff2?|ttf|otf)$/i.test(url.pathname);
}

function isImage(url){
  return /\.(?:svg|webp|png|jpe?g|gif|avif|ico)$/i.test(url.pathname);
}

function isExplicitlyVersioned(url){
  if(/[.-][a-f0-9]{8,}(?:\.|-)/i.test(url.pathname)) return true;
  return ['v','ver','version','rev','hash'].some(k=>url.searchParams.has(k));
}

async function freshNetwork(req,{fallback=null,store=true}={}){
  const cache=await caches.open(RUNTIME_CACHE);
  try{
    // "reload" bypasses the browser HTTP cache and forces revalidation/fresh transfer.
    const res=await fetch(req,{cache:'reload'});
    if(isCacheableResponse(res) && store) await cache.put(req,res.clone());
    else if(res.ok) await cache.delete(req);
    return res;
  }catch(_){
    const hit=await cache.match(req);
    if(hit && isCacheableResponse(hit)) return hit;
    if(hit) await cache.delete(req);
    if(fallback){
      const shell=await caches.open(SHELL_CACHE);
      const fb=await shell.match(fallback);
      if(fb && isCacheableResponse(fb)) return fb;
      if(fb) await shell.delete(fallback);
    }
    return Response.error();
  }
}

async function cacheFirstImmutable(req){
  const cache=await caches.open(RUNTIME_CACHE);
  const hit=await cache.match(req);
  if(hit && isCacheableResponse(hit)) return hit;
  if(hit) await cache.delete(req);
  try{
    const res=await fetch(req,{cache:'reload'});
    if(isCacheableResponse(res)) await cache.put(req,res.clone());
    else if(res.ok) await cache.delete(req);
    return res;
  }catch(_){
    return Response.error();
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  // Personalized / transactional surfaces are always network-only.
  // Never replace them with a generic offline document, because that can make
  // an online production route appear falsely unavailable.
  if(isPrivate(url)){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  const isCode=/\.(?:css|js)$/i.test(url.pathname);
  const isAsset=isCode || isMutableCode(url) || isFont(url) || isImage(url);

  // Documents are network-first. If a previous copy of the exact public page
  // exists it may be used only after a real network failure; never substitute
  // the generic offline page for a production URL.
  if(req.mode==='navigate'){
    event.respondWith(freshNetwork(req,{store:true}));
    return;
  }
  if(req.destination==='document'){
    event.respondWith(freshNetwork(req,{store:true}));
    return;
  }

  // CSS/JS: network-first so a successful deploy is never hidden behind stale app-shell assets.
  // JSON/manifests follow the same mutable-code policy.
  if(isAsset && isMutableCode(url)){
    event.respondWith(freshNetwork(req,{store:true}));
    return;
  }

  // Fingerprinted/versioned media and fonts are safe to cache aggressively inside Cache Storage.
  if(isFont(url) || (isImage(url) && isExplicitlyVersioned(url))){
    event.respondWith(cacheFirstImmutable(req));
    return;
  }

  // Unversioned images remain fresh-first so replacing an image at the same URL is visible promptly.
  if(isImage(url)){
    event.respondWith(freshNetwork(req,{store:true}));
    return;
  }
});
