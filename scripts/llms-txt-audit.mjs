import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const origin='https://drjavadrezazadeh.com';
const failures=[];
const txt=fs.readFileSync(path.join(root,'llms.txt'),'utf8');

if(!/^#\s+\S/m.test(txt)) failures.push('llms.txt: H1 title missing');
if(!/^>\s+\S/m.test(txt)) failures.push('llms.txt: blockquote summary missing');

const forbidden=[
  ['TEST','LY'].join(''),
  ['Human','ability'].join(''),
  ['Teacher',' Human','ization'].join(''),
  ['teacher','-human','ization'].join(''),
  ['human','ability'].join(''),
  '/login/',
  '/register/',
  '/account/',
  '/assessment/',
  '/assessments/',
  '/checkout/',
  '/darkhast-moshavere/',
  '/request-consultation/'
];
for(const token of forbidden){
  if(txt.toLowerCase().includes(token.toLowerCase())) failures.push('llms.txt exposes forbidden/private token: '+token);
}

const urls=[...txt.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g)].map(m=>m[1]);
if(urls.length<10) failures.push('llms.txt: too few public resource links');
if(new Set(urls).size!==urls.length) failures.push('llms.txt: duplicate resource links');

for(const raw of urls){
  let u;
  try{u=new URL(raw);}catch{failures.push('llms.txt: invalid URL '+raw);continue;}
  if(u.origin!==origin) failures.push('llms.txt: non-production origin '+raw);
  if(u.protocol!=='https:') failures.push('llms.txt: non-HTTPS URL '+raw);
  if(u.search||u.hash) failures.push('llms.txt: tracking/query/hash not allowed '+raw);

  const route=u.pathname;
  const staticAllowed=new Set(['/sitemap.xml','/sitemap-fa.xml','/sitemap-en.xml','/sitemap-core.xml','/sitemap-news.xml','/feed.xml','/robots.txt']);
  if(staticAllowed.has(route)) continue;

  const rel=route==='/'?'index.html':route.replace(/^\/+/,'').replace(/\/$/,'')+'/index.html';
  const full=path.join(root,rel);
  if(!fs.existsSync(full)){failures.push('llms.txt: linked local page missing '+route);continue;}
  const html=fs.readFileSync(full,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) failures.push('llms.txt: links to noindex page '+route);
  const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if(canonical&&canonical!==raw) failures.push('llms.txt: canonical mismatch '+raw+' -> '+canonical);
}

for(const rel of ['index.html','fa/index.html','en/index.html','fa/rahnamaha/index.html','en/news-insights/index.html']){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  if(!html.includes('rel="describedby"')||!html.includes(origin+'/llms.txt')) failures.push(rel+': missing llms.txt describedby discovery link');
}

console.log('llms.txt audit: '+urls.length+' public machine-readable entry points checked.');
if(failures.length){
  console.error('llms.txt failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('llms.txt contains only public production-canonical resources and excludes private/confidential areas.');
