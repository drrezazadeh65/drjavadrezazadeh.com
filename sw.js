/* JR Cache Standard v2.2 — encoded-route safe, response-aware, release-fresh */
const CACHE_VERSION='jr-site-20261022-education-mobile-rcas-v2';
const CACHE_FAMILY='jr-site-';
const SHELL_CACHE=CACHE_VERSION+'-shell';
const RUNTIME_CACHE=CACHE_VERSION+'-runtime';
const OFFLINE_URL='/offline.html';

const CORE=[
  OFFLINE_URL,
  '/favicon.ico',
  '/favicon.png',
  '/favicon.svg',
  '/assets/images/pwa-icon-192.png',
  '/assets/images/pwa-icon-512.png',
  '/assets/images/pwa-icon-maskable-512.png',
  // New PUBLIC, non-personal educational shell only. Private dashboards,
  // passwords, uploaded workbooks and admin API responses are NEVER precached.
  '/fa/masir-man/','/en/my-path/','/fa/bahar/','/en/bahar/',
  // Static public RCAS introductions only. Never precache either assessment form.
  '/fa/rcas/','/en/rcas/','/assets/css/jr-rcas-public-landing-v1.css',
  '/assets/css/jr-bahar-public-v1.css',
  '/assets/js/jr-bahar-public-v1.js',
  '/assets/js/jr-bahar-compass-v1.js',
  '/assets/js/jr-need-router-v1.js',
  '/assets/js/jr-journey-pwa-v1.js'
];

const PUBLIC_LEARNING_SHELL=new Set(CORE.filter(url=>
  url.startsWith('/fa/')||url.startsWith('/en/')||url.startsWith('/assets/')));

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
  let path=url.pathname;
  // Decode each URL component defensively. An encoded slash, repeated slash,
  // or double-encoded private segment must not bypass the no-store policy.
  try{
    for(let i=0;i<3;i++){
      const decoded=decodeURIComponent(path);
      if(decoded===path)break;
      path=decoded;
    }
  }catch(_){return null;}
  if(/%(?:[0-9a-f]{2})|\x00/i.test(path)) return null;
  path=path.replace(/\\/g,'/').replace(/\/{2,}/g,'/');
  // Never cache ambiguous traversal-like paths.
  if(/(?:^|\/)\.{1,2}(?:\/|$)/.test(path))return null;
  if(path.startsWith(scopePath)){
    const rest=path.slice(scopePath.length);
    return '/'+rest.replace(/^\/+/, '');
  }
  return path;
}

function isPrivate(url){
  const path=localPath(url);
  if(path===null)return true; // Fail closed when a path cannot be normalized.
  return PRIVATE_PREFIXES.some(prefix=>path===prefix.slice(0,-1) || path.startsWith(prefix));
}

function isCacheableResponse(res,req=null){
  // Never preserve partial, authenticated, cookie-sensitive or attachment
  // responses in a shared offline cache, even when their original URL is public.
  if(!res.ok || res.status!==200)return false;
  const control=res.headers.get('Cache-Control')||'';
  if(/(?:^|,)\s*(?:no-store|private)(?:\s*(?:=|,)|\s*$)/i.test(control))return false;
  if(res.headers.has('Set-Cookie')||res.headers.has('Set-Cookie2'))return false;
  if(/(?:^|,)\s*(?:\*|cookie|authorization)\s*(?:,|$)/i.test(res.headers.get('Vary')||''))return false;
  if(/\battachment\b/i.test(res.headers.get('Content-Disposition')||''))return false;
  if(req?.headers?.has?.('Authorization')||req?.cache==='no-store')return false;
  if(res.url){
    try{
      const finalUrl=new URL(res.url);
      if(finalUrl.origin!==self.location.origin || isPrivate(finalUrl))return false;
    }catch(_){return false;}
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

function isContentFingerprinted(url){
  // Query-string versions and ordinary font filenames are mutable aliases:
  // only a content-derived filename digest justifies cache-first delivery.
  return /(?:^|[._-])[a-f0-9]{12,64}(?=\.[a-z0-9]+$)/i.test(url.pathname);
}

// Cache Storage is best-effort. A full disk, private-browsing restriction,
// corrupt cache entry or quota error may not turn a successful online fetch
// into an offline fallback or a failed document request.
async function runtimeCache(){
  try{return await caches.open(RUNTIME_CACHE);}catch(_){return null;}
}
async function updateCache(cache,req,res,store=true){
  if(!cache)return;
  try{
    if(store && isCacheableResponse(res,req))await cache.put(req,res.clone());
    else await cache.delete(req);
  }catch(_){
    try{await cache.delete(req);}catch(_){}
  }
}
async function readSafeCache(cache,req){
  if(!cache)return null;
  try{
    const hit=await cache.match(req);
    if(hit && isCacheableResponse(hit,req))return hit;
    if(hit)await cache.delete(req);
  }catch(_){}
  return null;
}
async function freshNetwork(req,{fallback=null,store=true,httpCache='reload'}={}){
  let res;
  try{
    // Public mutable content stays fresh online, regardless of cache failures.
    res=await fetch(req,{cache:httpCache});
  }catch(_){
    const cache=await runtimeCache();
    const hit=await readSafeCache(cache,req);
    if(hit)return hit;
    if(fallback){
      try{
        const shell=await caches.open(SHELL_CACHE);
        const fb=await readSafeCache(shell,fallback);
        if(fb)return fb;
      }catch(_){}
    }
    return Response.error();
  }
  await updateCache(await runtimeCache(),req,res,store);
  return res;
}

async function cacheFirstImmutable(req){
  const cache=await runtimeCache();
  const hit=await readSafeCache(cache,req);
  if(hit)return hit;
  let res;
  try{res=await fetch(req,{cache:'reload'});}
  catch(_){return Response.error();}
  await updateCache(cache,req,res);
  return res;
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
    event.respondWith(freshNetwork(req,{
      store:true,
      // Offline fallback is ONLY the exact already precached public URL.
      // Never mask a real 404 or substitute an unrelated app document.
      fallback:PUBLIC_LEARNING_SHELL.has(url.pathname)?url.pathname:null
    }));
    return;
  }
  if(req.destination==='document'){
    event.respondWith(freshNetwork(req,{store:true}));
    return;
  }

  // CSS/JS: network-first so a successful deploy is never hidden behind stale app-shell assets.
  // JSON/manifests follow the same mutable-code policy.
  if(isAsset && isMutableCode(url)){
    event.respondWith(freshNetwork(req,{
      store:true,
      fallback:PUBLIC_LEARNING_SHELL.has(url.pathname)?url.pathname:null
    }));
    return;
  }

  // Only content-fingerprinted media and fonts may use cache-first storage.
  if((isFont(url) || isImage(url)) && isContentFingerprinted(url)){
    event.respondWith(cacheFirstImmutable(req));
    return;
  }

  // Mutable media/fonts use conditional HTTP validation (ETag/Last-Modified).
  // An unchanged origin can return 304 without retransferring the whole asset;
  // a replacement at the same URL is still fetched freshly.
  if(isImage(url) || isFont(url)){
    event.respondWith(freshNetwork(req,{store:true,httpCache:'no-cache'}));
    return;
  }
});
