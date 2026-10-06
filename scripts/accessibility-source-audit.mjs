import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignoreDirs=new Set(['.git','node_modules']);
const htmlFiles=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile() && ent.name.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(root);

const routeFor=file=>{
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  if(rel==='index.html') return '/';
  if(rel.endsWith('/index.html')) return '/'+rel.slice(0,-'index.html'.length);
  return '/'+rel;
};
const getAttr=(tag,name)=>{
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'));
  return m?m[2]:null;
};
const strip=(s='')=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const hasAttr=(tag,name)=>new RegExp('\\b'+name+'(?:\\s*=|\\s|>|$)','i').test(tag);
const failures=[];
const warnings=[];
let indexableCount=0;

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robotsTag=(html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0];
  const robots=getAttr(robotsTag,'content')||'';
  const isIndexable=!/\bnoindex\b/i.test(robots);
  if(!isIndexable) continue;
  indexableCount++;

  const mainCount=(html.match(/<main\b/gi)||[]).length;
  if(mainCount!==1) failures.push(route+': expected exactly one <main>, found '+mainCount);

  const ids=[...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map(m=>m[2]).filter(Boolean);
  const seen=new Set();
  for(const id of ids){
    if(seen.has(id)) failures.push(route+': duplicate id="'+id+'"');
    seen.add(id);
  }

  for(const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)){
    const tag=m[0].slice(0,m[0].indexOf('>')+1);
    const body=strip(m[1]);
    const aria=(getAttr(tag,'aria-label')||'').trim();
    const labelledby=(getAttr(tag,'aria-labelledby')||'').trim();
    const title=(getAttr(tag,'title')||'').trim();
    if(!body && !aria && !labelledby && !title) failures.push(route+': button lacks an accessible name');
  }

  for(const tag of html.match(/<iframe\b[^>]*>/gi)||[]){
    if(!(getAttr(tag,'title')||'').trim()) failures.push(route+': iframe missing title');
  }

  for(const tag of html.match(/<(?:input|select|textarea)\b[^>]*>/gi)||[]){
    const name=(tag.match(/^<([a-z]+)/i)||[])[1]||'control';
    const type=(getAttr(tag,'type')||'').toLowerCase();
    if(name==='input' && ['hidden','submit','button','reset','image'].includes(type)) continue;
    const id=(getAttr(tag,'id')||'').trim();
    const aria=(getAttr(tag,'aria-label')||'').trim();
    const labelledby=(getAttr(tag,'aria-labelledby')||'').trim();
    if(aria||labelledby) continue;
    if(id){
      const escaped=id.replace(/[|\\{}()[\]^$+*?.-]/g,'\\$&');
      const labelRe=new RegExp('<label\\b[^>]*for=["\\\']'+escaped+'["\\\'][^>]*>','i');
      if(labelRe.test(html)) continue;
    }
    warnings.push(route+': form control may lack an explicit accessible label: '+tag.slice(0,120));
  }

  for(const tag of html.match(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)||[]){
    const rel=(getAttr(tag,'rel')||'').toLowerCase().split(/\s+/);
    if(!rel.includes('noopener')) failures.push(route+': target="_blank" link missing rel="noopener"');
  }

  for(const tag of html.match(/<[^>]+\btabindex\s*=\s*(["'])(.*?)\1[^>]*>/gi)||[]){
    const value=Number(getAttr(tag,'tabindex'));
    if(Number.isFinite(value) && value>0) failures.push(route+': positive tabindex is prohibited');
  }

  for(const tag of html.match(/<(?:video|audio)\b[^>]*>/gi)||[]){
    if(hasAttr(tag,'autoplay') && !hasAttr(tag,'muted')) failures.push(route+': autoplay media must not start with sound');
  }

  const skipLink=/class=["'][^"']*\bskip(?:-|_)link\b[^"']*["']/i.test(html) || /href=["']#(?:main|main-content|content)["'][^>]*>[^<]*(?:skip|پرش)/i.test(html);
  if(!skipLink) failures.push(route+': missing required skip-to-content link');
}

if(failures.length){
  console.error('\nAccessibility source failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nAccessibility source warnings ('+warnings.length+')');
  warnings.slice(0,80).forEach(x=>console.warn('! '+x));
  if(warnings.length>80) console.warn('! ... '+(warnings.length-80)+' additional warnings omitted');
}
console.log('\nAccessibility source audit: '+indexableCount+' indexable pages checked.');
if(failures.length) process.exit(1);
