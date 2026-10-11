// Reversion Service Worker in deployed package, without modifying Git source.
import fs from 'node:fs';
import path from 'node:path';
const sha=(process.env.GITHUB_SHA||'').trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Full GitHub commit SHA required');
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
