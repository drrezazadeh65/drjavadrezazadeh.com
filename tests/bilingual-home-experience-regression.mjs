import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fa=readFileSync('fa/index.html','utf8');
const en=readFileSync('en/index.html','utf8');
const faRegister=readFileSync('fa/register/index.html','utf8');
const enRegister=readFileSync('en/register/index.html','utf8');
const styles=readFileSync('assets/css/home-experience-v1.css','utf8');
const legacyShop=readFileSync('shop/index.html','utf8');

for (const [name,html,label,href] of [
  ['Persian',fa,'فروشگاه کتاب','./shop/'],
  ['English',en,'Bookstore','./shop/']
]) {
  assert.match(html,/home-experience-v1\.css\?v=20261022-direct-study-actions-v5/,name+' homepage must load the responsive experience stylesheet');
  assert.match(html,new RegExp('href="'+href+'"[^>]*>'+label),name+' homepage must expose the bookstore CTA');
  assert.match(html,/class="actions hero-pathway-cta"/,name+' homepage must group the primary pathways');
}
// Preserve the old bookmarked /shop/ route as a safe discoverable handoff, not a
// duplicate indexable canonical or a forced redirect into the wrong language.
assert.match(legacyShop,/<meta name="robots" content="noindex,follow/,'legacy storefront retains noindex');
assert.match(legacyShop,/rel="canonical" href="https:\/\/drjavadrezazadeh\.com\/shop\/"/,'preserve historical self canonical');
assert.match(legacyShop,/href="\.\.\/fa\/shop\/"[^>]*>ورود به فروشگاه رسمی فارسی<\/a>/,'legacy shop hands buyers to the current Persian storefront');
assert.match(legacyShop,/href="\.\.\/en\/shop\/"[^>]*>English Bookstore<\/a>/,'legacy shop supports English buyers');
// A homepage buyer must reach the canonical locale storefront directly, and every
// existing standard/VIP detail offer in no more than two static link clicks.
const standard=JSON.parse(readFileSync('assets/data/service-catalog.json','utf8')).services;
const vip=JSON.parse(readFileSync('assets/data/vip-catalog.json','utf8')).services;
assert.equal(standard.length,21);
assert.equal(vip.length,6);
for(const [locale,home] of [['fa',fa],['en',en]]){
  assert.match(home,/href="\.\/shop\/"/,'canonical locale storefront missing from '+locale+' home');
  assert.doesNotMatch(home,/href="\.\.\/shop\/"/,'legacy noindex storefront must not intercept '+locale+' homepage');
  assert.match(home,/href="\.\/services\/"/,'priced service catalogue missing from '+locale+' home');
  assert.match(home,/href="\.\/vip\/"/,'VIP catalogue missing from '+locale+' home');
  const serviceHub=readFileSync(locale+'/services/index.html','utf8');
  const vipHub=readFileSync(locale+'/vip/index.html','utf8');
  for(const s of standard){
    assert.ok(serviceHub.includes('/'+locale+'/services/'+s.id+'/'),'two-click service detail missing: '+locale+'/'+s.id);
  }
  for(const s of vip){
    assert.ok(vipHub.includes('href="./'+s.id+'/"'),'two-click VIP detail missing: '+locale+'/'+s.id);
  }
}
for (const [name,html] of [['Persian',faRegister],['English',enRegister]]) {
  const mobile=html.match(/<input[^>]*name="mobile"[^>]*>/);
  assert.ok(mobile,name+' registration must retain an optional service contact field');
  assert.doesNotMatch(mobile[0],/\brequired\b/,name+' registration phone must be optional');
}
assert.match(faRegister,/شماره موبایل اختیاری/,'Persian registration must explain that phone is optional');
assert.match(enRegister,/Mobile number \(optional;/,'English registration must explain that phone is optional');
assert.match(styles,/\.hero-pathway-cta/,'Homepage CTA styles must be present');
assert.match(styles,/@media\s*\(max-width:\s*680px\)/,'Phone layout rules must be present');
assert.match(styles,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'Reduced-motion behavior must be present');
console.log('PASS: bilingual homepage pathways, responsive experience stylesheet, and optional registration phone');
