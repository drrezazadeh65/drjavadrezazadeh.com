import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('platform/home-campaigns-20261021.json'));
const ids=['golden','major','rcas','consult','family','exam','research','editing','teacher','institution','language','shop','journal','news','support'];
test('campaign registry contains exactly fifteen unique, grouped and image-backed real offers',()=>{
 assert.equal(catalog.banners.length,15);
 assert.deepEqual([...catalog.banners.map(x=>x.id)].sort(),[...ids].sort(),
   'All approved campaign identities remain, while order may evolve');
 assert.equal(new Set(catalog.banners.map(x=>x.id)).size,15);
 assert.equal(catalog.banners.filter(x=>x.group==='spotlight').length,1);
 for(const [g,count] of Object.entries({pathways:5,professional:5,discover:4})){
  assert.equal(catalog.banners.filter(x=>x.group===g).length,count);
 }
 assert.equal(catalog.policy.autoplay,false);
 assert.equal(catalog.policy.personalization,false);
 assert.equal(catalog.policy.external_tracking,false);
 const media=new Set();
 for(const banner of catalog.banners){
  assert.ok(banner.image.startsWith('/assets/images/'));
  assert.ok(existsSync(path.join(root,banner.image.slice(1))),'image must exist: '+banner.image);
  assert.ok(!media.has(banner.image),'each banner needs a distinct approved scene: '+banner.image);
  media.add(banner.image);
  for(const locale of ['fa','en']){
   const item=banner[locale];
   for(const field of ['title','eyebrow','summary','cta','alt','href']){
    assert.ok(typeof item[field]==='string'&&item[field].trim().length>=4,locale+' '+banner.id+' missing '+field);
   }
   assert.ok(item.href.startsWith('/'+locale+'/') || (locale==='fa'&&item.href==='/journal/fa/') ||(locale==='en'&&item.href==='/journal/'),'no cross-locale promotion: '+item.href);
   assert.ok(existsSync(path.join(root,item.href.slice(1),'index.html')),'missing campaign target '+item.href);
   assert.ok(!item.href.includes('?'),'campaign links must be clean destinations');
  }
 }
});
for(const locale of ['fa','en']){
 test(locale+' homepage has full, crawlable campaign copy, exactly fifteen valid same-tab links and lazy local media',()=>{
  const html=read(locale+'/index.html');
  assert.ok(html.includes('JR_HOME_CAMPAIGN_START'));
  assert.ok(html.includes('JR_HOME_CAMPAIGN_END'));
  const start=html.indexOf('<!-- JR_HOME_CAMPAIGN_START');
  const end=html.indexOf('<!-- JR_HOME_CAMPAIGN_END',start);
  assert.ok(start>0&&end>start,'campaign content must be static inside main');
  const fragment=html.slice(start,end);
  assert.ok(html.indexOf('<main')<start&&html.indexOf('</main>')>end);
  assert.equal((fragment.match(/data-jr-promo-key="/g)||[]).length,15);
  assert.equal((fragment.match(/class="jr-campaign-card"/g)||[]).length,14);
  assert.equal((fragment.match(/loading="lazy"/g)||[]).length,15);
  assert.equal((fragment.match(/decoding="async"/g)||[]).length,15);
  assert.equal((fragment.match(/width="(?:1600|1672)" height="(?:900|941)" loading="lazy"/g)||[]).length,15);
  assert.equal((fragment.match(/data-jr-promo-group="/g)||[]).length,3);
  assert.equal((fragment.match(/data-jr-promo-rail(?!-)/g)||[]).length,3);
  assert.equal((fragment.match(/data-jr-promo-step="/g)||[]).length,6);
  assert.ok(html.includes('home-campaigns-v1.css?v=20261021-banners-v1'));
  assert.ok(html.includes('home-campaigns-v1.js?v=20261021-banners-v1'));
  for(const b of catalog.banners){
   const offer=b[locale],item='data-jr-promo-key="'+b.id+'"';
   assert.ok(fragment.includes(item),'missing banner '+b.id);
   const at=fragment.indexOf(item);
   const window=fragment.slice(Math.max(0,at-150),at+1100);
   assert.ok(window.includes('href="'+offer.href+'"'),'banner link mismatch '+b.id);
   assert.ok(window.includes('src="'+b.image+'"'),'banner image mismatch '+b.id);
   assert.ok(window.includes(offer.title),'banner title mismatch '+b.id);
   assert.ok(window.includes(offer.cta),'banner CTA mismatch '+b.id);
  }
  assert.ok(!/<iframe\b|data-autoplay|autoplay=/.test(fragment),'no ad network embed or autoplay');
 });
}
test('banner JS is progressive only; CSS respects RTL and motion preferences',()=>{
 const js=read('assets/js/home-campaigns-v1.js');
 const css=read('assets/css/home-campaigns-v1.css');
 assert.ok(js.includes('scrollIntoView('));
 assert.ok(js.includes('prefers-reduced-motion'));
 assert.ok(!/localStorage|sessionStorage|fetch\(|setInterval|analytics|dataLayer|postMessage/.test(js));
 assert.ok(css.includes('scroll-snap-type:x mandatory'));
 assert.ok(css.includes('text-align:start'));
 assert.ok(css.includes('html[dir="rtl"]'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('focus-visible'));
});
