#!/usr/bin/env node
/**
 * Immutable public URL contract for drjavadrezazadeh.com.
 *
 * This is a forward-only source guard, NOT a sitemap regeneration tool.
 * Existing HTML/PHP route files, sitemap URL entries, page links,
 * canonical/hreflang destinations and redirect rules are immutable.
 * New files/links are permitted; changing or removing old destinations is not.
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
const hrefs=(body)=>{
  const values=new Set();
  for(const tag of body.match(/<(?:a|area|link)\b[^>]*>/gi)||[]){
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
 if(/\.(?:html?|php)$/i.test(path))assertPreserved(path,'link target',hrefs(was),hrefs(now));
 if(/\.xml$/i.test(path))assertPreserved(path,'sitemap URL',locations(was),locations(now));
}
if(errors.length){
 console.error('IMMUTABLE URL VIOLATION: existing public paths and destinations cannot be changed.');
 for(const error of errors.slice(0,150))console.error(' - '+error);
 if(errors.length>150)console.error(' ... and '+(errors.length-150)+' additional violations.');
 process.exit(1);
}
console.log('Immutable URL contract preserved against pinned baseline '+baseline+'.');
