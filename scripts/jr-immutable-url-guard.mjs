#!/usr/bin/env node
/**
 * GOV-004 / SEO-URL-001 — Published Public URL Permanence Law.
 * Reference: docs/governance/FROZEN_PUBLIC_URL_PERMANENCE_POLICY_20261022.md
 *
 * No tests, network calls, sitemap writes, or public URL edits here.
 * CI gate protects every canonical <loc> ever added to the source sitemaps
 * since the frozen baseline; baseline public route files and established
 * canonicals; and existing PERMANENT redirect mappings.
 *
 * Internal links, hreflang corrections, designs, content, new URLs,
 * metadata and truthful <lastmod> changes are intentionally ALLOWED.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline='7be460975057801f5eff35ad7f2b8aeb316b2054';
const errors=[];
const git=(args)=>execFileSync('git',args,{
  cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']
});
const splitLines=value=>value.trim()?value.trim().split(/\r?\n/).filter(Boolean):[];
const trackedAt=revision=>new Set(splitLines(git(['ls-tree','-r','--name-only',revision])));
const xmlDecode=value=>value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
const sitemapLocations=text=>{
  // A sitemap index holds sitemap FILE locations, not published page URLs.
  if(!/<urlset(?:\s|>)/i.test(text))return new Set();
  const entries=new Set();
  for(const match of text.matchAll(/<loc(?:\s[^>]*)?>\s*([^<]+)\s*<\/loc>/gi)){
    const value=xmlDecode(match[1].trim());
    if(value)entries.add(value);
  }
  return entries;
};
const canonicalLocations=text=>{
  const entries=new Set();
  for(const tag of text.match(/<link\b[^>]*>/gi)||[]){
    const rel=tag.match(/\brel\s*=\s*(["'])(.*?)\1/i);
    if(!rel || !rel[2].split(/\s+/).some(x=>x.toLowerCase()==='canonical'))continue;
    const href=tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if(href && href[2])entries.add(xmlDecode(href[2]));
  }
  return entries;
};
const noindex=text=>/<meta\b[^>]*\bname\s*=\s*(["'])robots\1[^>]*\bnoindex\b/i.test(text)
  || /<meta\b[^>]*\bcontent\s*=\s*(["'])[^"']*\bnoindex\b[^"']*\1[^>]*\bname\s*=\s*(["'])robots\2/i.test(text);
const permanentRedirects=text=>{
  const rules=new Set();
  for(const line of text.split(/\r?\n/)){
    const value=line.trim();
    if(/^Redirect(?:Match)?\s+(?:permanent|301|308)\s+/i.test(value)
       || (/^RewriteRule\s+/i.test(value) && /\[\s*[^]*?\bR\s*=\s*(?:301|308)\b/i.test(value))){
      rules.add(value.replace(/\s+/g,' '));
    }
  }
  return rules;
};
const fromGit=(revision,path)=>{
  try{return git(['show',revision+':'+path]);}
  catch{return null;}
};
const checkSet=(label,original,current)=>{
  for(const value of original)if(!current.has(value)){
    errors.push(label+': missing or modified '+JSON.stringify(value).slice(0,320));
  }
};

try {git(['merge-base','--is-ancestor',baseline,'HEAD']);}
catch {console.error('URL PERMANENCE: frozen baseline missing or not ancestor; release blocked.');process.exit(1);}

const baseFiles=trackedAt(baseline);
const headFiles=trackedAt('HEAD');
const sitemapNames=new Set(
  [...baseFiles,...headFiles].filter(path=>
    /(^|\/)sitemap[^/]*\.xml$/i.test(path) || /(^|\/)sitemaps?\/[^/]+\.xml$/i.test(path))
);
const historicallyPublished=new Set();
const currentLocations=new Set();

// Each distinct Git revision of each sitemap is an immutable publication
// registry entry. Protect intermediate additions even if later commits removed
// them. Git history is deliberately pinned to the original owner baseline.
for(const path of [...sitemapNames].sort()){
  const revisions=new Set([baseline,...splitLines(git([
    'log','--format=%H',baseline+'..HEAD','--',path
  ]))]);
  for(const rev of revisions){
    const historical=fromGit(rev,path);
    if(historical!==null)for(const url of sitemapLocations(historical))historicallyPublished.add(url);
  }
  const disk=resolve(root,path);
  if(existsSync(disk)){
    for(const url of sitemapLocations(readFileSync(disk,'utf8')))currentLocations.add(url);
  }
}
checkSet('published canonical sitemap URL',historicallyPublished,currentLocations);

// Protect route files present at the frozen baseline if they are public HTML
// and declare a canonical. Do not mistake noindex private dashboards for
// indexable pages. Anchors and nav links inside these pages remain editable.
for(const path of baseFiles){
  if(!/\.html?$/i.test(path))continue;
  const before=fromGit(baseline,path);
  if(before===null || noindex(before))continue;
  const canonical=canonicalLocations(before);
  if(canonical.size===0)continue;
  const disk=resolve(root,path);
  if(!existsSync(disk)){errors.push('deleted established public route file: '+path);continue;}
  const now=readFileSync(disk,'utf8');
  checkSet(path+' canonical',canonical,canonicalLocations(now));
}

// New sitemap URLs retain protection by the historical registry above; a
// new route's canonical must agree with its published sitemap <loc> entry.
// Do not infer backend routing from filename alone.
const redirectFile='.htaccess';
const oldRedirects=fromGit(baseline,redirectFile);
if(oldRedirects!==null){
  const path=resolve(root,redirectFile);
  if(!existsSync(path))errors.push('removed established redirect configuration: '+redirectFile);
  else checkSet('permanent redirect',permanentRedirects(oldRedirects),permanentRedirects(readFileSync(path,'utf8')));
}

if(errors.length){
  console.error('SEO URL PERMANENCE VIOLATION — publication blocked pending a separately authorized exception.');
  for(const entry of errors.slice(0,120))console.error(' - '+entry);
  if(errors.length>120)console.error(' ... plus '+(errors.length-120)+' further changes.');
  process.exit(1);
}
console.log('Published canonical URLs and existing redirects preserved since '+baseline+'; content and internal links remain editable.');
