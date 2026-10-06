import dns from 'node:dns/promises';

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
  const [a,aaaa]=await Promise.allSettled([dns.resolve4(host),dns.resolve6(host)]);
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

for(const route of ['/fa/','/en/','/robots.txt','/sitemap.xml']){
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
