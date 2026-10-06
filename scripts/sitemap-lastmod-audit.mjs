import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const origin='https://drjavadrezazadeh.com';
const failures=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const index=read('sitemap.xml');
const sitemapEntries=[...index.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/sitemap>/g)]
  .map(m=>({loc:m[1],lastmod:m[2]}));

for(const entry of sitemapEntries){
  if(!entry.loc.startsWith(origin+'/')){failures.push('sitemap index: non-production child '+entry.loc);continue;}
  const rel=new URL(entry.loc).pathname.replace(/^\//,'');
  if(!fs.existsSync(path.join(root,rel))){failures.push('sitemap index: child file missing '+rel);continue;}
  const child=read(rel);
  const dates=[...child.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map(m=>m[1]).sort();
  if(!dates.length){failures.push(rel+': child sitemap has no lastmod values');continue;}
  const max=dates[dates.length-1];
  if(entry.lastmod!==max) failures.push('sitemap.xml: '+rel+' lastmod '+entry.lastmod+' does not match child max '+max);
}

const news=read('sitemap-news.xml');
for(const m of news.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)){
  const loc=m[1],lastmod=m[2];
  if(!loc.startsWith(origin+'/')){failures.push('sitemap-news.xml: non-production URL '+loc);continue;}
  const route=new URL(loc).pathname;
  const file=path.join(root,route.replace(/^\//,'').replace(/\/$/,'')+'/index.html');
  if(!fs.existsSync(file)){failures.push('sitemap-news.xml: local news page missing '+route);continue;}
  const html=fs.readFileSync(file,'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let modified=null;
  for(const s of scripts){
    let json;try{json=JSON.parse(s[1]);}catch{continue;}
    const nodes=(json&&json['@graph'])||[json];
    const article=nodes.find(n=>n&&n['@type']==='NewsArticle');
    if(article?.dateModified){modified=article.dateModified;break;}
  }
  if(!modified) failures.push(route+': NewsArticle dateModified missing');
  else if(modified!==lastmod) failures.push(route+': sitemap lastmod '+lastmod+' does not match NewsArticle dateModified '+modified);
}

console.log('Sitemap lastmod audit: '+sitemapEntries.length+' child sitemaps plus news article freshness checked.');
if(failures.length){
  console.error('Sitemap lastmod failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Sitemap index and news freshness metadata are aligned.');
