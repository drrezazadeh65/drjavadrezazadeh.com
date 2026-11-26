import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {classifyRoute} from '../platform/ecosystem-governance.mjs';
const origin='https://drjavadrezazadeh.com';
const maps=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-ar.xml','sitemap-jrei.xml','sitemap-news.xml','sitemap-services.xml','journal/sitemap.xml'];
const decode=v=>String(v).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&#39;',"'");
const attrs=t=>Object.fromEntries([...t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
export function projectSearchIndex(root){
 const target=path.join(root,'assets/search-index.json'),previous=JSON.parse(fs.readFileSync(target,'utf8'));
 const existing=new Map(previous.map(x=>[x.path,x]));
 const urls=new Set(maps.flatMap(f=>[...fs.readFileSync(path.join(root,f),'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim())));
 const result=[];
 for(const url of urls){
  if(url===origin+'/')continue;
  const u=new URL(url);
  if(u.origin!==origin||u.search||u.hash||!/^\/(?:fa|en|ar|publisher|journal)\/(?:[A-Za-z0-9_-]+\/)*$/.test(u.pathname))throw Error('Unexpected public search route '+url);
  if(classifyRoute(u.pathname).indexing==='NOINDEX')throw Error('Private public search route '+url);
  const rel=u.pathname.slice(1),html=fs.readFileSync(path.join(root,rel,'index.html'),'utf8');
  const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]||'';
  const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]));
  const meta=n=>metas.find(m=>m.name===n)?.content;
  const canon=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).find(m=>m.rel==='canonical')?.href;
  const lang=attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang;
  if(canon!==url||/\bnoindex\b/i.test(meta('robots')||'')||!['fa','en','ar'].includes(lang))throw Error('Unverified public search route '+url);
  const old=existing.get(rel);
  if(old&&old.lang===lang&&old.title&&old.summary){result.push(old);continue;}
  const title=decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||''),summary=decode(meta('description')||'');
  if(!title||!summary)throw Error('Search metadata missing '+url);
  const commercial=/\/(?:jrei|forge|jrei-academic)(?:\/|$)/.test(u.pathname),services=/\/services\//.test(u.pathname);
  const category=commercial?'JREI':services?({ar:'الخدمات',fa:'خدمات',en:'Services'})[lang]:({ar:'التعليم والبحث',fa:'آموزش و پژوهش',en:'Education and research'})[lang];
  result.push({lang,path:rel,title,summary,category,keywords:title+' '+summary});
 }
 fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n','utf8');
 console.log('Projected public search index: '+result.length+' canonical routes');
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)projectSearchIndex(process.cwd());
