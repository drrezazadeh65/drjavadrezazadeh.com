import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const feedPath=path.join(root,'feed.xml');
const failures=[];
const origin='https://drjavadrezazadeh.com';

if(!fs.existsSync(feedPath)){
  console.error('Missing feed.xml');
  process.exit(1);
}
const xml=fs.readFileSync(feedPath,'utf8');
if(!/<rss\b[^>]*version=["']2\.0["']/i.test(xml)) failures.push('feed.xml must be RSS 2.0');
if(!xml.includes('<atom:link href="'+origin+'/feed.xml" rel="self" type="application/rss+xml"')) failures.push('feed.xml missing canonical atom:self link');

const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
if(items.length<1) failures.push('feed.xml must contain at least one item');
const seen=new Set();

for(const [i,item] of items.entries()){
  const tag=name=>item.match(new RegExp('<'+name+'(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]?.trim()||'';
  const title=tag('title');
  const link=tag('link');
  const guid=tag('guid');
  const pubDate=tag('pubDate');
  const description=tag('description');

  if(!title) failures.push('item '+(i+1)+': missing title');
  if(!description) failures.push('item '+(i+1)+': missing description');
  if(!link.startsWith(origin+'/')) failures.push('item '+(i+1)+': link outside production origin');
  if(guid!==link) failures.push('item '+(i+1)+': guid must equal canonical item link');
  if(seen.has(link)) failures.push('item '+(i+1)+': duplicate link '+link);
  seen.add(link);
  if(Number.isNaN(Date.parse(pubDate))) failures.push('item '+(i+1)+': invalid pubDate');

  if(link.startsWith(origin+'/')){
    const route=new URL(link).pathname;
    const file=route==='/'?'index.html':route.replace(/^\/+/,'')+'index.html';
    const full=path.join(root,file);
    if(!fs.existsSync(full)){
      failures.push('item '+(i+1)+': linked route missing '+route);
    }else{
      const html=fs.readFileSync(full,'utf8');
      if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) failures.push('item '+(i+1)+': RSS item points to noindex page '+route);
      if(!html.includes('<link rel="canonical" href="'+link+'"')) failures.push('item '+(i+1)+': RSS item canonical mismatch '+route);
    }
  }
}

for(const rel of ['fa/akhbar/index.html','fa/rahnamaha/index.html','en/news-insights/index.html']){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  if(!html.includes('type="application/rss+xml"')||!html.includes(origin+'/feed.xml')) failures.push(rel+': missing feed discovery link');
}

console.log('RSS audit: '+items.length+' public feed items checked.');
if(failures.length){
  console.error('RSS failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('RSS feed, canonical item routes and discovery links are consistent.');
