#!/usr/bin/env node
/**
 * Immutable public URL contract for drjavadrezazadeh.com.
 *
 * This is a forward-only source guard, NOT a sitemap regeneration tool.
 * Preserve existing published route files, sitemap <loc> entries, canonical
 * page URLs and established redirects. New public URLs are additive.
 * Internal hyperlinks, navigation, page content and hreflang can be updated
 * freely to improve information architecture, provided established URLs remain.
 * A genuine emergency URL migration requires an owner-approved exception.
 *
 * Baseline is a pinned, committed source snapshot. Never move the baseline
 * forward merely to make a prohibited URL change pass.
 */
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline='7be460975057801f5eff35ad7f2b8aeb316b2054';
const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
const errors=[];
const oldFiles=git(['ls-tree','-r','--name-only',baseline]).trim().split('\n').filter(Boolean);
try {git(['merge-base','--is-ancestor',baseline,'HEAD']);}
catch {console.error('URL GUARD: frozen baseline must be an ancestor of HEAD.');process.exit(1);}
const escapeHtml=value=>value.replace(/&amp;/g,'&');
const canonicals=(body)=>{
  const values=new Set();
  for(const tag of body.match(/<link\b[^>]*>/gi)||[]){
    const rel=tag.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    if(!rel || !rel[2].split(/\s+/).some(token=>token.toLowerCase()==='canonical')) continue;
    const href=tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if(href&&href[2])values.add(escapeHtml(href[2]));
  }
  return values;
};
const locations=(body)=>{
  const values=new Set();
  for(const match of body.matchAll(/<loc\b[^>]*>\s*([^<]+?)\s*<\/loc>/gi))values.add(escapeHtml(match[1].trim()));
  return values;
};
const redirectRules=(body)=>{
  const values=new Set();
  for(const line of body.split(/\r?\n/)){
    const l=line.trim();
    if (/^(?:RewriteRule|Redirect(?:Match)?)\s+/i.test(l)) values.add(l);
  }
  return values;
};
function assertPreserved(file,label,oldSet,newSet){
 for(const value of oldSet){
  if(!newSet.has(value))errors.push(file+': removed/changed '+label+' '+JSON.stringify(value).slice(0,320));
 }
}
for (const path of oldFiles){
 if(!(/\.(?:html?|php|xml)$/i.test(path)||path==='.htaccess'))continue;
 const was=git(['show',baseline+':'+path]);
 const disk=resolve(root,path);
 if(!existsSync(disk)){errors.push('Deleted/renamed existing public source: '+path);continue;}
 const now=readFileSync(disk,'utf8');
 if(path==='.htaccess')assertPreserved(path,'rewrite/redirect rule',redirectRules(was),redirectRules(now));
 if(/\.(?:html?|php)$/i.test(path))assertPreserved(path,'canonical URL',canonicals(was),canonicals(now));
 if(/\.xml$/i.test(path))assertPreserved(path,'sitemap URL',locations(was),locations(now));
}
if(errors.length){
 console.error('IMMUTABLE URL VIOLATION: an established public URL, canonical or redirect changed. Internal hyperlinks remain editable.');
 for(const error of errors.slice(0,150))console.error(' - '+error);
 if(errors.length>150)console.error(' ... and '+(errors.length-150)+' additional violations.');
 process.exit(1);
}
console.log('Published URL contract preserved; internal navigation changes are permitted. Baseline: '+baseline+'.');
