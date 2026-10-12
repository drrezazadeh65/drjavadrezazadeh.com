/**
 * News-first discovery supplement. Only approved public article namespaces
 * from the site's own news sitemap are eligible for enrichment.
 */
const ROOT='https://drjavadrezazadeh.com';
const MAP=ROOT+'/sitemap-news.xml';
const safeNewsUrl=s=>{
 try{
  const u=new URL(s);
  return u.origin===ROOT && /^\/(?:fa\/akhbar|en\/news)\/[^?#]+\/?$/.test(u.pathname)
    && !u.username && !u.password;
 }catch{return false;}
};
const htmlDecode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
 .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
 .replace(/<[^>]*>/g,'').trim();
const xmlValue=(content,name)=>htmlDecode((String(content).match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]);
export function parseNewsSitemap(xml){
 return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/gi)]
 .map(([,body])=>({url:xmlValue(body,'loc'),lastmod:xmlValue(body,'lastmod')}))
 .filter(x=>safeNewsUrl(x.url)).slice(0,30);
}
const meta=(html,name)=>{
 for(const tag of String(html).match(/<meta\b[^>]*>/gi)||[]){
  const prop=(tag.match(/(?:name|property)=["']([^"']+)["']/i)||[])[1];
  if(prop!==name)continue;
  return htmlDecode((tag.match(/content=["']([^"']+)["']/i)||[])[1]);
 }
 return '';
};
export function articleInfo(html,url,lastmod){
 const title=meta(html,'og:title')||
   htmlDecode((String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1])||
   htmlDecode((String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
 const description=meta(html,'og:description')||meta(html,'description');
 const robots=String(html).match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0]||'';
 if(/\bnoindex\b/i.test(robots))return null;
 const canonicalTag=String(html).match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]||'';
 const can=(canonicalTag.match(/href=["']([^"']+)["']/i)||[])[1];
 if(!can || new URL(can).origin!==ROOT || new URL(can).pathname!==new URL(url).pathname)return null;
 if(!title || !description)return null;
 return {title,url,description,published:lastmod,source:'news'};
}
export async function enrichNews(sitemapXml,fetcher=fetch){
 const entries=parseNewsSitemap(sitemapXml)
 .sort((a,b)=>Date.parse(b.lastmod||0)-Date.parse(a.lastmod||0)).slice(0,10);
 const ready=[];
 for(const entry of entries){
  try{
   const r=await fetcher(entry.url,{redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!r.ok)continue;
   const h=await r.text();
   const info=articleInfo(h,entry.url,entry.lastmod);
   if(info)ready.push(info);
  }catch{/* skip temporarily unreachable pages; never publish unverified data */}
 }
 return ready;
}
export async function mergeNews(rssItems,fetcher=fetch){
 let additional=[];
 try{
  const r=await fetcher(MAP,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(r.ok)additional=await enrichNews(await r.text(),fetcher);
 }catch{/* RSS remains useful if news sitemap is unavailable */}
 const seen=new Set();
 return [...additional,...rssItems].filter(x=>{
  const key=new URL(x.url).origin+new URL(x.url).pathname;
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
