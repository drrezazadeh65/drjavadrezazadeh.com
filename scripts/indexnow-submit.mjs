import fs from 'node:fs';

const ORIGIN=(process.env.PROD_ORIGIN||'https://drjavadrezazadeh.com').replace(/\/$/,'');
const KEY=process.env.INDEXNOW_KEY||'5bea74dc73880cd2b2a1a35a649e62de';
const KEY_LOCATION=process.env.INDEXNOW_KEY_LOCATION||`${ORIGIN}/${KEY}.txt`;
const ENABLED=process.env.INDEXNOW_ENABLED==='1';
const ALL=process.argv.includes('--all');

const canonicalFromHtml=file=>{
  if(!fs.existsSync(file)) return null;
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) return null;
  const m=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  if(!m) return null;
  return m[1].startsWith(ORIGIN+'/')||m[1]===ORIGIN+'/'?m[1]:null;
};

const allSitemapUrls=()=>{
  const children=[];
  const root=fs.readFileSync('sitemap.xml','utf8');
  for(const m of root.matchAll(/<loc>([^<]+)<\/loc>/g)){
    const u=new URL(m[1].trim());
    const local=u.pathname.replace(/^\//,'');
    if(local.endsWith('.xml')&&fs.existsSync(local)) children.push(local);
  }
  const urls=[];
  for(const child of children){
    const xml=fs.readFileSync(child,'utf8');
    for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
      const url=m[1].trim();
      if(url.startsWith(ORIGIN+'/')||url===ORIGIN+'/') urls.push(url);
    }
  }
  return [...new Set(urls)];
};

let urls=[];
if(ALL){
  urls=allSitemapUrls();
}else{
  const files=(process.env.INDEXNOW_CHANGED_FILES||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const file of files){
    if(!file.endsWith('.html')) continue;
    const canonical=canonicalFromHtml(file);
    if(canonical) urls.push(canonical);
  }
  urls=[...new Set(urls)];
}

if(!urls.length){
  console.log('IndexNow: no eligible indexable URLs to submit.');
  process.exit(0);
}

console.log(`IndexNow: ${urls.length} eligible URL(s).`);
urls.forEach(u=>console.log(' - '+u));

if(!ENABLED){
  console.log('IndexNow network submission is disabled until production DNS/TLS is verified. Dry-run passed.');
  process.exit(0);
}

const keyResponse=await fetch(KEY_LOCATION,{redirect:'follow'});
if(!keyResponse.ok) throw new Error(`IndexNow key file unavailable at ${KEY_LOCATION}: HTTP ${keyResponse.status}`);
const keyText=(await keyResponse.text()).trim();
if(keyText!==KEY) throw new Error('IndexNow key file content does not match configured key.');

const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'content-type':'application/json; charset=utf-8','user-agent':'DrJavadRezazadeh-IndexNow/1.0'},
  body:JSON.stringify({
    host:new URL(ORIGIN).host,
    key:KEY,
    keyLocation:KEY_LOCATION,
    urlList:urls.slice(0,10000)
  })
});

if(![200,202].includes(response.status)){
  const body=(await response.text()).slice(0,1000);
  throw new Error(`IndexNow submission failed: HTTP ${response.status} ${body}`);
}
console.log(`IndexNow submission accepted with HTTP ${response.status}.`);
