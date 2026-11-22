// Reversion Service Worker in deployed package, without modifying Git source.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const sha=(process.env.GITHUB_SHA||'').trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Full GitHub commit SHA required');
// Owner's 2026-11-22 news freeze: manual deployment aborts BEFORE package
// creation/upload if source would change the publicly deployed news subsystem.
// This is in the existing build chain, not in the permanently frozen workflow.
if(process.env.GITHUB_EVENT_NAME==='workflow_dispatch'){
  let liveSource;
  try {
    liveSource=execFileSync('curl',['--fail','--silent','--show-error','--location',
      '--max-time','25','--header','Cache-Control: no-cache',
      'https://drjavadrezazadeh.com/sw.js'],{encoding:'utf8',timeout:28000});
  }catch(e){throw Error('NEWS_FREEZE_LIVE_REVISION_UNAVAILABLE');}
  const live=liveSource.match(/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m)?.[1];
  if(!live)throw Error('NEWS_FREEZE_LIVE_REVISION_UNVERIFIED');
  execFileSync(process.execPath,['scripts/news-freeze-release-guard.mjs',live,sha],
    {stdio:'inherit',timeout:30000});
}
const root=path.resolve('.public-site');
const swFile=path.join(root,'sw.js');
const original=fs.readFileSync(swFile,'utf8');
const updated=original.replace(/^const CACHE_VERSION='[^']+';/m,"const CACHE_VERSION='jr-site-bertina-"+sha+"';");
if(original===updated || !updated.includes("jr-site-bertina-"+sha))throw Error('Service Worker fingerprint failure');
fs.writeFileSync(swFile,updated);
for(const locale of ['fa','en']){
 const file=path.join(root,locale,'shop','index.html');
 const html=fs.readFileSync(file,'utf8');
 if(!html.includes('id="store-mission-title"')||!html.includes('id="publish-for-talent"'))throw Error(locale+' mission missing');
 const next=html.replace('</head>','<meta name="jr-deploy-revision" content="'+sha+'"></head>');
 if(html===next)throw Error(locale+' revision missing');
 fs.writeFileSync(file,next);
}
console.log('Bertina artifact cache family bumped and storefront revision stamped: '+sha);
