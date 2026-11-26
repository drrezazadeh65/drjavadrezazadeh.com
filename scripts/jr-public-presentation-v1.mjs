// Public presentation metadata: project only canonical, sitemap-listed public pages.
import fs from 'node:fs';
import path from 'node:path';
const origin='https://drjavadrezazadeh.com';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const decode=v=>String(v).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&#39;',"'");
const attrs=t=>Object.fromEntries([...t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
export function projectPublicPresentation(out,files){
 const maps=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-ar.xml','sitemap-jrei.xml','sitemap-news.xml','sitemap-services.xml','journal/sitemap.xml'];
 const urls=new Set(maps.flatMap(f=>[...fs.readFileSync(path.join(out,f),'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim())));
 const image=origin+'/assets/images/javad-rezazadeh-yazdeli-portrait-2026.webp';
 if(!fs.existsSync(path.join(out,'assets/images/javad-rezazadeh-yazdeli-portrait-2026.webp')))throw Error('Missing approved site identity image');
 let enhanced=0;
 for(const file of files){
  const rel=path.relative(out,file).replaceAll(path.sep,'/'),p=rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');
  if(!urls.has(origin+p))continue;
  let html=fs.readFileSync(file,'utf8');
  const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]||'';
  const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]));
  const meta=(key,val)=>metas.find(m=>m[key]===val)?.content;
  if(/\bnoindex\b/i.test(meta('name','robots')||''))continue;
  const canon=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).find(m=>m.rel==='canonical')?.href;
  if(canon!==origin+p)continue;
  const title=head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),desc=meta('name','description');
  if(!title||!desc)continue;
  let tags='';
  for(const [k,v] of Object.entries({'og:type':'website','og:title':decode(title),'og:description':decode(desc),'og:url':canon,'og:image':image})){
   if(!meta('property',k))tags+='<meta property="'+k+'" content="'+esc(v)+'">';
  }
  if(!meta('name','twitter:card'))tags+='<meta name="twitter:card" content="summary">';
  if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(head)){
   const l=attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang;
   if(l&&['fa','en','ar'].includes(l)){
    const schema={"@context":"https://schema.org","@type":"WebPage","@id":canon+"#webpage",url:canon,name:decode(title),description:decode(desc),inLanguage:l,isPartOf:{"@id":origin+"/#website"}};
    tags+='<script type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>';
   }
  }
  if(tags){html=html.replace(/<\/head\s*>/i,m=>tags+m);fs.writeFileSync(file,html,'utf8');enhanced++;}
 }
 return enhanced;
}
