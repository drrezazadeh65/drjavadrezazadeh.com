import { Resolver } from 'node:dns/promises';

const ORIGIN=(process.env.PROD_ORIGIN||'https://drjavadrezazadeh.com').replace(/\/$/,'');
const STRICT=process.argv.includes('--strict')||process.env.PRODUCTION_HEALTH_STRICT==='1';
const timeoutMs=Number(process.env.PRODUCTION_HEALTH_TIMEOUT_MS||12000);
const failures=[];
const warnings=[];

const host=new URL(ORIGIN).hostname;
const fetchWithTimeout=async (url,options={})=>{
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    return await fetch(url,{redirect:'manual',...options,signal:ctrl.signal,headers:{'user-agent':'DrJavadRezazadeh-SiteHealth/1.0',...(options.headers||{})}});
  }finally{
    clearTimeout(timer);
  }
};

const getText=async url=>{
  const res=await fetchWithTimeout(url);
  return {res,text:await res.text()};
};

let dnsReady=false;
try{
  const resolver=new Resolver({timeout:timeoutMs,tries:1});
  const dnsTimer=setTimeout(()=>resolver.cancel(),timeoutMs);
  let a,aaaa;
  try{
    [a,aaaa]=await Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)]);
  }finally{
    clearTimeout(dnsTimer);
  }
  const records=[
    ...(a.status==='fulfilled'?a.value:[]),
    ...(aaaa.status==='fulfilled'?aaaa.value:[])
  ];
  dnsReady=records.length>0;
  if(!dnsReady) warnings.push('No A/AAAA records resolved for '+host);
  else console.log('DNS: '+records.length+' address record(s) resolved for '+host+' -> '+records.join(', '));
}catch(e){
  warnings.push('DNS lookup failed: '+e.message);
}

let root;
try{
  root=await fetchWithTimeout(ORIGIN+'/');
}catch(e){
  const cause=e?.cause?.code||e?.cause?.message||e?.cause||'';
  const msg='Production origin unreachable: '+e.message+(cause?' ['+cause+']':'');
  if(STRICT) failures.push(msg); else warnings.push(msg);
}

if(!root){
  if(failures.length){
    console.error('\nProduction health failures ('+failures.length+')');
    failures.forEach(x=>console.error('✗ '+x));
  }
  if(warnings.length){
    console.warn('\nProduction health warnings ('+warnings.length+')');
    warnings.forEach(x=>console.warn('! '+x));
  }
  console.log('\nProduction health audit is in '+(STRICT?'STRICT':'WARN-UNTIL-VERIFIED')+' mode.');
  if(failures.length) process.exit(1);
  process.exit(0);
}

if(root.status!==200) failures.push('/ expected 200, got '+root.status);
const rootHtml=await root.text();
if(!rootHtml.includes(ORIGIN+'/')) failures.push('/: production origin not present in root document');
if(/github\.io/i.test(rootHtml)) failures.push('/: legacy github.io origin leaked into production HTML');

for(const route of ['/fa/','/en/','/robots.txt','/sitemap.xml','/llms.txt']){
  try{
    const {res,text}=await getText(ORIGIN+route);
    if(res.status!==200) failures.push(route+' expected 200, got '+res.status);
    if(/github\.io/i.test(text)) failures.push(route+': legacy github.io origin leaked into live response');
    if((route==='/fa/'||route==='/en/') && !text.includes('<link rel="canonical" href="'+ORIGIN+route+'"')){
      failures.push(route+': live canonical mismatch');
    }
  }catch(e){
    failures.push(route+': fetch failed: '+e.message+(e?.cause?.code?' ['+e.cause.code+']':''));
  }
}

try{
  const {res,text}=await getText(ORIGIN+'/robots.txt');
  if(res.status===200){
    if(!/User-agent:\s*OAI-SearchBot[\s\S]*?Allow:\s*\//i.test(text)) failures.push('/robots.txt: OAI-SearchBot public allow rule missing');
    if(!text.includes('Sitemap: '+ORIGIN+'/sitemap.xml')) failures.push('/robots.txt: canonical sitemap directive missing');
  }
}catch(e){
  failures.push('/robots.txt discovery-policy validation failed: '+e.message);
}

try{
  const {res,text}=await getText(ORIGIN+'/llms.txt');
  if(res.status===200){
    if(!/^#\s+Dr\. Javad Rezazadeh Yazdeli/m.test(text)) failures.push('/llms.txt: canonical entity heading missing');
    if(!text.includes(ORIGIN+'/en/')||!text.includes(ORIGIN+'/fa/')) failures.push('/llms.txt: bilingual public entry points missing');
    for(const token of ['/login/','/register/','/account/','/assessment/','/checkout/','/darkhast-moshavere/','/request-consultation/']){
      if(text.includes(ORIGIN+token)) failures.push('/llms.txt: private/transactional route leaked '+token);
    }
  }
}catch(e){
  failures.push('/llms.txt discovery validation failed: '+e.message);
}

const privateRoutes=[
  '/fa/login/',
  '/fa/register/',
  '/fa/darkhast-moshavere/',
  '/fa/shop/checkout/',
  '/en/login/',
  '/en/register/',
  '/en/request-consultation/',
  '/en/golden-talent/assessment/',
  '/en/shop/checkout/'
];
for(const route of privateRoutes){
  try{
    const {res,text}=await getText(ORIGIN+route);
    if(res.status!==200){
      failures.push(route+' expected 200 private/transactional shell, got '+res.status);
      continue;
    }
    if(/github\.io/i.test(text)) failures.push(route+': legacy github.io origin leaked into live private response');
    if(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(text)){
      failures.push(route+': private/transactional route lost noindex protection');
    }
  }catch(e){
    failures.push(route+': private-route fetch failed: '+e.message);
  }
}
console.log('Live private/noindex routes checked: '+privateRoutes.length);


try{
  const {res,text}=await getText(ORIGIN+'/5bea74dc73880cd2b2a1a35a649e62de.txt');
  if(res.status!==200) failures.push('/5bea74dc73880cd2b2a1a35a649e62de.txt expected 200, got '+res.status);
  else if(text.trim()!=='5bea74dc73880cd2b2a1a35a649e62de') failures.push('IndexNow public key mismatch on production origin');
}catch(e){
  failures.push('IndexNow public key probe failed: '+e.message);
}

const missing='/__health-intentional-404-'+Date.now()+'/';
try{
  const res=await fetchWithTimeout(ORIGIN+missing);
  if(res.status!==404) failures.push('Intentional missing route must return HTTP 404, got '+res.status);
}catch(e){
  failures.push('Intentional 404 probe failed: '+e.message);
}

try{
  const sitemap=await getText(ORIGIN+'/sitemap.xml');
  const childUrls=[...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].trim());
  if(!childUrls.length) failures.push('/sitemap.xml: no child sitemaps found');
  const pageUrls=[];
  for(const child of childUrls){
    if(!child.startsWith(ORIGIN+'/')) failures.push('/sitemap.xml: child sitemap outside production origin '+child);
    try{
      const {res,text}=await getText(child);
      if(res.status!==200){failures.push(child+': sitemap fetch status '+res.status);continue;}
      for(const m of text.matchAll(/<loc>([^<]+)<\/loc>/g)) pageUrls.push(m[1].trim());
    }catch(e){
      failures.push(child+': sitemap fetch failed: '+e.message);
    }
  }
  const unique=[...new Set(pageUrls)];
  const concurrency=8;
  let index=0;
  const worker=async()=>{
    while(index<unique.length){
      const i=index++;
      const url=unique[i];
      if(!url.startsWith(ORIGIN+'/')){failures.push('Sitemap URL outside production origin '+url);continue;}
      try{
        const {res,text}=await getText(url);
        if(res.status!==200){failures.push(url+': expected 200, got '+res.status);continue;}
        if(!text.includes('<link rel="canonical" href="'+url+'"')) failures.push(url+': live canonical does not self-identify');
        if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(text)) failures.push(url+': sitemap URL is live noindex');
      }catch(e){
        failures.push(url+': live sitemap target failed: '+e.message);
      }
    }
  };
  await Promise.all(Array.from({length:Math.min(concurrency,Math.max(1,unique.length))},()=>worker()));
  console.log('Live sitemap targets checked: '+unique.length);
}catch(e){
  failures.push('Live sitemap expansion failed: '+e.message);
}

// Live Knowledge Hub WebP image probes: a committed file is NOT proof of public delivery.
// The sitemap is requested from production so stale deploys and CDN 404s are reported.
try{
  const {res,text:xml}=await getText(ORIGIN+'/sitemap-fa.xml');
  if(res.status!==200) failures.push('Live photographic audit: /sitemap-fa.xml returned '+res.status);
  else{
    const slugs=[...xml.matchAll(/<loc>https:\/\/drjavadrezazadeh\.com\/fa\/rahnamaha\/([a-z0-9-]+)\/<\/loc>/g)].map(x=>x[1]);
    if(slugs.length!==45||new Set(slugs).size!==45)
      failures.push('Live photographic audit: expected 45 unique article slugs; found '+slugs.length);
    else{
      const media=slugs.flatMap(slug=>[
        '/assets/images/knowledge/'+slug+'-featured.webp',
        '/assets/images/knowledge/'+slug+'-og.webp'
      ]);
      let next=0,verified=0;
      const check=async()=>{
        while(next<media.length){
          const resource=media[next++];
          try{
            const response=await fetchWithTimeout(ORIGIN+resource);
            if(response.status!==200){
              failures.push('Live WebP '+resource+': expected 200, got '+response.status);
              continue;
            }
            const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
            if(type!=='image/webp'){
              failures.push('Live WebP '+resource+': unexpected content-type '+(type||'(missing)'));
              continue;
            }
            const bytes=new Uint8Array(await response.arrayBuffer());
            const marker=String.fromCharCode(...bytes.slice(0,4))+' '+String.fromCharCode(...bytes.slice(8,12));
            if(bytes.length<2000||marker!=='RIFF WEBP'){
              failures.push('Live WebP '+resource+': non-WebP body or truncated asset, bytes='+bytes.length);
              continue;
            }
            verified++;
          }catch(e){
            failures.push('Live WebP '+resource+': '+e.message);
          }
        }
      };
      await Promise.all(Array.from({length:6},check));
      console.log('Live Knowledge Hub media checked: '+verified+'/'+media.length+' valid WebP files (45 featured + 45 OG).');
    }
  }
}catch(e){
  failures.push('Live Knowledge Hub WebP audit failed: '+e.message);
}

try{
  const httpOrigin=ORIGIN.replace(/^https:/,'http:');
  const res=await fetchWithTimeout(httpOrigin+'/');
  if(res.status>=300&&res.status<400){
    const loc=res.headers.get('location')||'';
    if(!loc.startsWith(ORIGIN)) warnings.push('HTTP apex redirect does not point directly to HTTPS canonical origin: '+loc);
  }else{
    warnings.push('HTTP apex did not redirect to HTTPS; status '+res.status);
  }
}catch(e){
  warnings.push('HTTP-to-HTTPS redirect probe failed: '+e.message);
}

try{
  const www=ORIGIN.replace('://','://www.');
  const res=await fetchWithTimeout(www+'/');
  if(res.status>=300&&res.status<400){
    const loc=res.headers.get('location')||'';
    if(!loc.startsWith(ORIGIN)) warnings.push('www redirect does not point directly to apex: '+loc);
  }else{
    warnings.push('www host did not return a redirect to apex; status '+res.status);
  }
}catch(e){
  warnings.push('www host unavailable or TLS not ready: '+e.message);
}

if(failures.length){
  console.error('\nProduction health failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nProduction health warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
console.log('\nProduction health audit complete for '+ORIGIN+'; mode='+(STRICT?'STRICT':'WARN-UNTIL-VERIFIED')+', dnsReady='+dnsReady+'.');
if(failures.length) process.exit(1);
