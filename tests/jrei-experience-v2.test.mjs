import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {projectExperience} from '../scripts/jrei-experience-v2.mjs';
function withoutStructuredData(html){return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,(_,raw)=>{JSON.parse(raw);return '';});}
test('99 commercial JREI routes and nine independent product landings preserve canonical links, H1, prices, anchors and readiness',()=>{let count=0;for(const l of ['fa','en','ar']){const base=l+'/jrei/';const list=[base+'index.html',base+'pricing/index.html',base+'order/index.html',base+'seo/index.html',l+'/jrei-academic/index.html',l+'/forge/index.html',...fs.readdirSync(base+'catalog').map(s=>base+'catalog/'+s+'/index.html').filter(f=>fs.existsSync(f))];assert.equal(list.length,36);for(const f of list){const s=fs.readFileSync(f,'utf8'),out=projectExperience(f,s);if(s.includes('data-jrei-launch="coming-soon"')){assert.equal(out,s);assert.doesNotMatch(out,/jrei-experience-v2\.css|data-jx-studio|class="jx-nav"/);}else assert.match(out,/jrei-experience-v2\.css/);for(const m of s.matchAll(/(?:href="[^"]+"|\bid="[^"]+"|<h1\b[^>]*>[\s\S]*?<\/h1>|<p class="(?:price|note|notice)"[^>]*>[\s\S]*?<\/p>)/g))assert.ok(out.includes(m[0]),f+' '+m[0].slice(0,90));assert.equal(projectExperience(f,out),out);if(s.includes('data-jrei-launch="coming-soon"'))assert.doesNotMatch(withoutStructuredData(out),/<(?:script|form)\b/i);else{assert.match(out,/class="jx-scene"/);assert.match(out,/jrei-experience-v2\.js/);assert.doesNotMatch(out,/<form\b/i);}if(f===base+'index.html')assert.equal((out.match(/data-jx-domain="/g)||[]).length,30);count++;}}assert.equal(count,108);});test('unrelated pages untouched and motion reducible',()=>{assert.equal(projectExperience('fa/akhbar/index.html','x'),'x');assert.match(fs.readFileSync('assets/css/jrei-experience-v2.css','utf8'),/prefers-reduced-motion:reduce/);});

test('scenario studio is localized, explicit about simulated workflows, and linked to real catalogue routes',()=>{for(const l of ['fa','en','ar']){const f=l+'/jrei/index.html',out=projectExperience(f,fs.readFileSync(f,'utf8'));assert.equal((out.match(/class="jx-case"/g)||[]).length,5);assert.match(out,/jx-studio-disclaimer/);assert.match(out,/data-jx-theme="core"/);assert.match(out,/jx-pipeline/);for(const slug of ['education','research','coding','search-visibility','enterprise'])assert.ok(out.includes('href="/'+l+'/jrei/catalog/'+slug+'/"'));for(const sub of ['jrei-academic','forge','jrei/seo']){const route=l+'/'+sub+'/index.html',launch=projectExperience(route,fs.readFileSync(route,'utf8'));assert.equal(launch,fs.readFileSync(route,'utf8'));assert.doesNotMatch(withoutStructuredData(launch),/data-jx-studio|<(?:script|form)\b/i);}}});

test('browser-side proposal is localized, private by design and links only to existing service routes',()=>{for(const l of ['fa','en','ar']){const src=fs.readFileSync(l+'/jrei/index.html','utf8'),out=projectExperience(l+'/jrei/index.html',src);assert.match(out,/data-jx-demo hidden/);assert.equal((out.match(/data-jx-demo-choice="/g)||[]).length,3);assert.match(out,/data-jx-run/);assert.match(out,/45898459730/);for(const route of ['bahar/','golden-talent/','jrei-academic/','jrei/order/'])assert.ok(fs.existsSync(l+'/'+route+'index.html'));assert.match(projectExperience(l+'/jrei/catalog/research/index.html',fs.readFileSync(l+'/jrei/catalog/research/index.html','utf8')),/jx-delivery/);}assert.doesNotMatch(fs.readFileSync('assets/js/jrei-experience-v2.js','utf8'),/fetch\(|localStorage|sessionStorage|XMLHttpRequest/);});

test('rule-based proposal has 11 localized work rules and crawlable buyer FAQs',()=>{for(const l of ['fa','en','ar']){const route=l+'/jrei/index.html',out=projectExperience(route,fs.readFileSync(route,'utf8'));assert.equal((out.match(/data-jx-rule="/g)||[]).length,11);assert.equal((out.match(/data-jx-rule-output="/g)||[]).length,3);assert.match(out,/class="jx-buyer"/);assert.match(out,/class="jx-value"/);}});

test('local licensed Persian font and warm non-green commercial palette',()=>{const css=fs.readFileSync('assets/css/jrei-experience-v2.css','utf8');assert.match(css,/font-family:"JREI Persian"/);assert.ok(fs.existsSync('assets/fonts/vazirmatn-variable-a501289a8559.woff2'));assert.doesNotMatch(css,/#(?:8be6dc|92e7dc|a9e6b3|bce9e4|173f4c|84dacf)\b/i);});

import {catalogMap,projectPremium} from '../scripts/jrei-premium-cards-v1.mjs';
test('Premium galleries preserve all original links, anchors, prices, descriptions and local art in three languages',()=>{for(const l of ['fa','en','ar']){const base=l+'/jrei/',home=fs.readFileSync(base+'index.html','utf8'),map=catalogMap(l,home);for(const part of ['index.html','order/index.html','pricing/index.html',...Array.from(map.keys(),s=>'catalog/'+s+'/index.html')]){const file=base+part,src=fs.readFileSync(file,'utf8'),out=projectPremium(l,file,projectExperience(file,src),map);assert.match(out,/data-jp-premium="v1"/);for(const match of src.matchAll(/href="[^"]+"|\bid="[^"]+"|<p class="price">[\s\S]*?<\/p>/g))assert.ok(out.includes(match[0]),file+' '+match[0].slice(0,120));for(const img of out.matchAll(/<img src="(\/assets\/images\/jrei-premium\/[^"]+)" /g)){assert.ok(fs.existsSync(img[1].slice(1)));assert.ok(fs.statSync(img[1].slice(1)).size<(img[1].endsWith('.webp')?60000:4096));}if(part==='order/index.html'){assert.equal((out.match(/<li id="[^"]+" class="jp-card"/g)||[]).length,87);assert.match(out,/<ul class="orderlist jp-grid jp-featured-grid"><li id="automation"/);for(const [slug,v] of map){assert.ok(out.includes(v.desc));assert.ok(out.includes('href="/'+base+'catalog/'+slug+'/"'));}assert.match(out,/<li id="contracts" class="jp-card"/);}assert.equal(projectPremium(l,file,out,map),out);}}});

test('all 30 commercial services use actual high-detail WebP artwork',()=>{for(const l of ['fa','en','ar']){const base=l+'/jrei/',src=fs.readFileSync(base+'order/index.html','utf8'),map=catalogMap(l,fs.readFileSync(base+'index.html','utf8')),out=projectPremium(l,base+'order/index.html',projectExperience(base+'order/index.html',src),map);for(const [slug,n] of [["architecture",1],["language",2],["memory",3],["adaptive-context",4],["knowledge",5],["agents",6],["coding",7],["education",8],["assessment",9],["talent",10],["research",11],["academic-writing",12],["data",13],["vision",14],["audio",15],["documents",16],["web",17],["search",18],["search-visibility",19],["marketing",20],["news",21],["automation",22],["desktop",23],["distributed",24],["local-ai",25],["security",26],["recovery",27],["plugins",28],["api",29],["enterprise",30]]){const card=out.match(new RegExp('<li id="'+slug+'"[^>]*>[\\s\\S]*?</li>'))?.[0];assert.ok(card);assert.ok(card.includes('data-jp-art="3d"'));const file='assets/images/jrei-premium/service-'+String(n).padStart(2,'0')+'.webp';assert.ok(card.includes('/'+file));const buf=fs.readFileSync(file);assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');assert.ok(buf.length>15000&&buf.length<60000);}}});

import {bundleFaHomeStyles} from '../scripts/release-bundle-fa-home-styles.mjs';
import os from 'node:os';import path from 'node:path';
test('Persian home first paint and stylesheet bundling retain source content and all links',()=>{
 const src=fs.readFileSync('fa/index.html','utf8');
 assert.ok(src.indexOf('document.documentElement.classList.add("js")')<src.indexOf('rel="stylesheet"'));
 assert.match(src,/data-jr-native-mobile="1"/);
 assert.equal((src.match(/class="tablet-menu-trigger"/g)||[]).length,1);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jr-fa-home-'));
 try{fs.mkdirSync(path.join(root,'fa'));fs.mkdirSync(path.join(root,'assets/css'),{recursive:true});
  for(const m of src.matchAll(/href="(?:\.\.\/|\/)?assets\/css\/([^"?]+\.css)(?:\?[^"]*)?"/g)){const f=m[1];fs.copyFileSync('assets/css/'+f,path.join(root,'assets/css',f))}
  const page=src.replace('</head>','<link rel="stylesheet" href="/assets/css/assistant.css?v=test"></head>').replace('</body>','<script defer src="/assets/js/assistant.js?v=test"></script></body>');
  fs.writeFileSync(path.join(root,'fa/index.html'),page);
  const report=bundleFaHomeStyles(root);const out=fs.readFileSync(path.join(root,'fa/index.html'),'utf8');
  assert.equal(report.reducedRequests,8);assert.equal(report.groups.length,2);
  assert.equal((out.match(/rel="stylesheet"/g)||[]).length,(page.match(/rel="stylesheet"/g)||[]).length-8);
  assert.match(out,/data-jr-assistant="1"/);assert.match(out,/data-jr-assistant-style="1"/);
  assert.equal(out.slice(out.indexOf('<main '),out.indexOf('</main>')),page.slice(page.indexOf('<main '),page.indexOf('</main>')));
  for(const g of report.groups)assert.ok(fs.statSync(path.join(root,'assets/css',g.alias)).size===g.bytes);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

// Fail closed if any independent landing is accidentally projected in a future release.
test('nine product landings keep original distinct palette, logos, hero illustrations and source HTML',()=>{
 const css=fs.readFileSync('assets/jrei-launch/style.css','utf8');
 for(const [route,cls,deep] of [['forge','forge','#14283f'],['jrei-academic','academic','#103e31'],['jrei/seo','seo','#073e43']]){
  assert.ok(css.includes('body.'+cls+'{--deep:'+deep));
  for(const l of ['fa','en','ar']){const f=l+'/'+route+'/index.html',s=fs.readFileSync(f,'utf8');assert.equal(projectExperience(f,s),s);assert.ok(s.includes('/assets/jrei-launch/'+cls+'-logo.svg'));assert.ok(s.includes('/assets/jrei-launch/'+cls+'-hero.svg'));assert.ok(s.includes('href="/assets/jrei-launch/style.css"'));assert.ok(s.includes('data-jrei-launch="coming-soon"'));}
 }
});

import {verifyProductPage} from '../scripts/jrei-independent-product-guard.mjs';
test('final independent product guard accepts metadata but rejects commercial styles, altered logos and content',()=>{
 for(const [route,product] of [['forge','forge'],['jrei-academic','academic'],['jrei/seo','seo']])for(const lang of ['fa','en','ar']){
  const rel=lang+'/'+route+'/index.html',original=fs.readFileSync(rel,'utf8');
  const enriched=original.replace('</head>','<script type="application/ld+json">{}</script></head>');
  assert.equal(verifyProductPage(rel,original,enriched,product),true);
  assert.throws(()=>verifyProductPage(rel,original,enriched.replace('</head>','<link rel="stylesheet" href="/assets/css/jrei-experience-v2.css"></head>'),product),/commercial design/);
  assert.throws(()=>verifyProductPage(rel,original,enriched.replace(product+'-hero.svg','other-hero.svg'),product));
  assert.throws(()=>verifyProductPage(rel,original,enriched.replace('<h1>','<h1>changed '),product));
 }
});

test('independent product studios retain six original and six additional capability cards, native FAQ and premium artwork',()=>{for(const l of ['fa','en','ar'])for(const [route,p] of [['forge','forge'],['jrei-academic','academic'],['jrei/seo','seo']]){const src=fs.readFileSync(l+'/'+route+'/index.html','utf8');assert.equal((src.match(/class="feature"/g)||[]).length,6);assert.equal((src.match(/class="workspace-card"/g)||[]).length,6);assert.equal((src.match(/<details>/g)||[]).length,3);assert.ok(src.includes(p+'-studio-v1.css'));assert.ok(src.includes(p+'-hero.webp'));assert.ok(src.includes(p+'-showcase.webp'));for(const suffix of ['hero','showcase']){const b=fs.readFileSync('assets/images/jrei-launch/'+p+'-'+suffix+'.webp');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<100000);}}});
