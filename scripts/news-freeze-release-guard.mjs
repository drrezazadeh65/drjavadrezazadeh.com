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
try{changes=execFileSync('git',['diff','--name-only','-z',live,target],{encoding:'utf8',maxBuffer:10*1024*1024}).split('\0').filter(Boolean);}
catch(e){console.error('NEWS_FREEZE_GUARD_UNABLE_TO_VERIFY_LIVE_DELTA');process.exit(2);}
const protectedPath=p=>/(^|\/)(news|akhbar|news-insights|news-intelligence)(\/|\.|-|$)/i.test(p)||
 /(?:^|\/)sitemap-news\.xml$/.test(p)||p==='feed.xml'||
 /(?:^|\/)[^/]*(?:news|akhbar)[^/]*\.(?:js|mjs|css|json|php|yml|yaml|xml)$/i.test(p);
const hits=changes.filter(protectedPath);
if(hits.length){console.error('NEWS_FREEZE_GUARD_BLOCKED: '+hits.join(', '));process.exit(1)}
console.log('NEWS_FREEZE_GUARD_PASSED: '+changes.length+' total changed files, zero news-related files changed.');
