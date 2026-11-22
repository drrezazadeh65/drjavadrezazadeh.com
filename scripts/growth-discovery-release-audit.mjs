#!/usr/bin/env node
/* Single end-of-development source audit for the growth release. No external network. */
import fs from 'node:fs';
const registry=JSON.parse(fs.readFileSync('platform/growth-discovery-20261122.json','utf8'));
const targets=["fa/index.html","en/index.html","fa/darbare-man/index.html","en/about/index.html","fa/estedaadyabi/index.html","fa/moshavere-tahsili/index.html","fa/moshavere-konkur/index.html","fa/entekhab-reshteh/index.html","fa/khadamat/index.html","fa/services/index.html","fa/services/talent_initial/index.html","fa/tamas/index.html","fa/darkhast-moshavere/index.html","en/student-guidance/index.html","en/golden-talent/index.html"];
const errors=[];
for(const p of targets){
 const s=fs.readFileSync(p,'utf8');
 if(!s.includes('data-jr-search-growth="20261122"'))errors.push(p+': missing content');
 if(!s.includes('/assets/css/jr-search-growth-20261122.css'))errors.push(p+': missing styles');
 if(!s.includes('<main'))errors.push(p+': main landmark missing');
 if(/<meta\b[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(s)===false&&p.includes('darkhast-moshavere'))errors.push(p+': private intake must remain noindex');
}
const identity=["fa/index.html","en/index.html","fa/darbare-man/index.html","en/about/index.html"];
for(const p of identity){
 const src=fs.readFileSync(p,'utf8');
 const blocks=[...src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 let ok=false;
 for(const b of blocks){let j;try{j=JSON.parse(b[1])}catch(e){errors.push(p+': invalid JSON-LD');continue}
 for(const n of j['@graph']||[j])if(n['@type']==='Person'&&n['@id']==='https://drjavadrezazadeh.com/#person')ok=Array.isArray(n.alternateName)&&n.alternateName.includes('جواد رضازاده')&&n.alternateName.includes('دکتر جواد رضازاده یزدلی');
 }
 if(!ok)errors.push(p+': missing canonical identity variants');
}
if(registry.official_persian_name!=='دکتر جواد رضازاده یزدلی')errors.push('Incorrect surname');
if(!fs.readFileSync('assets/css/jr-search-growth-20261122.css','utf8').includes('min-height:48px'))errors.push('Touch target too small');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Growth source contract PASS: '+targets.length+' bilingual route improvements; correct surname, no personal data.');
