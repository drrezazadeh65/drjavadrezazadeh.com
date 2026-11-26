#!/usr/bin/env node
// News-freeze fail-closed guard for the 2026-11-22 site-growth owner release.
// The entire site may publish as one existing action only when news code/config
// is exactly unchanged between the live release fingerprint and target commit.
import {execFileSync} from 'node:child_process';
const [live,target]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(live||'')||!/^[a-f0-9]{40}$/.test(target||'')){
 console.error('NEWS_FREEZE_GUARD_MISSING_IMMUTABLE_SHA');process.exit(2);
}
let changes;
try{changes=execFileSync('git',['diff','--no-renames','--name-only','-z',live,target],{encoding:'utf8',maxBuffer:10*1024*1024}).split('\0').filter(Boolean);}
catch(e){console.error('NEWS_FREEZE_GUARD_UNABLE_TO_VERIFY_LIVE_DELTA');process.exit(2);}
export const protectedPath=p=>/(^|\/)(news|akhbar|news-insights|news-intelligence)(\/|\.|-|$)/i.test(p)||
 /(?:^|\/)sitemap-news\.xml$/.test(p)||p==='feed.xml'||
 /(?:^|\/)[^/]*(?:news|akhbar)[^/]*\.(?:js|mjs|css|json|php|yml|yaml|xml)$/i.test(p);
// These two files only IMPLEMENT the freeze guard; they are not newsroom
// pages, feeds, source collectors, queue logic, publishing configuration or data.
// Their own changes must not be falsely classified as a news publication delta.
const releaseGuardFiles=new Set(['scripts/news-freeze-release-guard.mjs',
  '.github/workflows/growth-news-freeze-live-check.yml']);
// Exact static commercial catalogue pages only; never exempt a directory,
// newsroom route, engine, publisher, feed, configuration or news asset.
const commercialCataloguePages=new Set([
 'ar/jrei/catalog/news/index.html',
 'en/jrei/catalog/news/index.html',
 'fa/jrei/catalog/news/index.html'
]);
// A test-only runner pin is not a newsroom change. Allow ONLY these exact
// workflow/job pairs and only the single expected line substitution, verified
// against both immutable Git blobs. No path-wide exemption or other diff.
const qaRunnerPins=new Map([
 ['.github/workflows/jrei-news-isolated-acceptance.yml','source'],
 ['.github/workflows/newsletter-preferences-qa.yml','dashboard-browser']
]);
function isExactQARunnerPin(p){
 const job=qaRunnerPins.get(p);
 if(!job)return false;
 try{
  const read=(rev)=>execFileSync('git',['show',rev+':'+p],{encoding:'utf8',maxBuffer:1024*1024});
  const mode=(rev)=>execFileSync('git',['ls-tree',rev,'--',p],{encoding:'utf8'}).split(' ')[0];
  if(mode(live)!=='100644'||mode(target)!=='100644')return false;
  const before=read(live),after=read(target);
  const oldLine='  '+job+':\n    runs-on: ubuntu-latest\n';
  const newLine='  '+job+':\n    runs-on: ubuntu-24.04\n';
  return before.split(oldLine).length===2 && before.replace(oldLine,newLine)===after;
 }catch{return false;}
}
const hits=changes.filter(p=>!releaseGuardFiles.has(p)&&!commercialCataloguePages.has(p)&&protectedPath(p)&&!isExactQARunnerPin(p));
if(hits.length){console.error('NEWS_FREEZE_GUARD_BLOCKED: '+hits.join(', '));process.exit(1)}
console.log('NEWS_FREEZE_GUARD_PASSED: '+changes.length+' total changed files, zero protected news changes; exact CI-only runner pins permitted.');
