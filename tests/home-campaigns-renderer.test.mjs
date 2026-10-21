import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderCampaignPage,validateCampaignRegistry,syncCampaignPages} from '../scripts/render-home-campaigns.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'platform/home-campaigns-20261021.json'),'utf8'));
const pages=Object.fromEntries(['fa','en'].map(lang=>[lang,
  fs.readFileSync(path.join(root,lang,'index.html'),'utf8')]));

test('both homepages are deterministic projections of one approved registry',()=>{
 assert.deepEqual(syncCampaignPages({root}),[]);
 validateCampaignRegistry(registry);
 for(const lang of ['fa','en']){
  assert.equal(renderCampaignPage(pages[lang],lang,registry),pages[lang]);
  assert.equal((pages[lang].match(/data-jr-promo-key="/g)||[]).length,15);
 }
});

test('content changes and order propagate to both languages without editing page markup',()=>{
 const candidate=structuredClone(registry);
 candidate.banners.find(x=>x.id==='major').fa.title='عنوان آزمایشی بدون انتشار';
 candidate.banners.find(x=>x.id==='major').en.title='An updated public banner title';
 const a=candidate.banners.findIndex(x=>x.id==='major');
 const b=candidate.banners.findIndex(x=>x.id==='rcas');
 [candidate.banners[a],candidate.banners[b]]=[candidate.banners[b],candidate.banners[a]];
 for(const lang of ['fa','en']){
  const updated=renderCampaignPage(pages[lang],lang,candidate);
  const original=pages[lang];
  assert.notEqual(updated,original);
  assert.equal(updated.slice(0,updated.indexOf('<!-- JR_HOME_CAMPAIGN_START')),
               original.slice(0,original.indexOf('<!-- JR_HOME_CAMPAIGN_START')));
  assert.equal(updated.slice(updated.indexOf('<!-- JR_HOME_CAMPAIGN_END')),
               original.slice(original.indexOf('<!-- JR_HOME_CAMPAIGN_END')));
  const beginning=updated.indexOf('id="jr-promo-rail-'+lang+'-pathways"');
  const portion=updated.slice(beginning,updated.indexOf('</ul>',beginning));
  assert.ok(portion.indexOf('data-jr-promo-key="rcas"')<
    portion.indexOf('data-jr-promo-key="major"'));
  assert.ok(updated.includes(lang==='fa'?'عنوان آزمایشی بدون انتشار':'An updated public banner title'));
 }
});

test('untrusted content is HTML-escaped, not interpreted as markup',()=>{
 const candidate=structuredClone(registry);
 candidate.banners[0].en.title='<svg onload="alert(1)">&';
 const updated=renderCampaignPage(pages.en,'en',candidate);
 assert.ok(updated.includes('&lt;svg onload=&quot;alert(1)&quot;&gt;&amp;'));
 assert.ok(!updated.includes('<svg onload="alert(1)">'));
});

test('external URLs, duplicate identifiers and unauthorized images fail closed',()=>{
 for(const mutate of [
  x=>x.banners[0].en.href='https://external.example/path/',
  x=>x.banners[0].fa.href='/en/checkout/',
  x=>x.banners[0].image='/assets/images/../../secrets.webp',
  x=>x.banners[1].id=x.banners[0].id,
  x=>x.banners.push(structuredClone(x.banners[0]))
 ]){
  const candidate=structuredClone(registry);
  mutate(candidate);
  assert.throws(()=>validateCampaignRegistry(candidate,{verifyFiles:false}));
 }
});

test('check-only renderer never mutates HTML or imports accounts, payments or secrets',()=>{
 const script=fs.readFileSync(path.join(root,'scripts/render-home-campaigns.mjs'),'utf8');
 assert.match(script,/--check/);
 assert.match(script,/--write/);
 assert.match(script,/if\(write\)fs\.writeFileSync/);
 assert.doesNotMatch(script,/\/api\/admin|INSERT INTO|DROP TABLE|COMMERCE_ENABLED|JR_COMMUNITY_ENABLED/);
 assert.equal((script.match(/fs\.writeFileSync\(/g)||[]).length,1);
});
