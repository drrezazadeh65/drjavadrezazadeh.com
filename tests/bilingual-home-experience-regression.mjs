import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fa=readFileSync('fa/index.html','utf8');
const en=readFileSync('en/index.html','utf8');
const register=readFileSync('fa/register/index.html','utf8');
const styles=readFileSync('assets/css/home-experience-v1.css','utf8');

for (const [name,html,label,href] of [
  ['Persian','fa','فروشگاه کتاب','../shop/'],
  ['English','en','Bookstore','../shop/']
]) {
  assert.match(html,/home-experience-v1\.css\?v=20261013-home-v1/,name+' homepage must load the responsive experience stylesheet');
  assert.match(html,new RegExp('href="'+href.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"[^>]*>'+label),name+' homepage must expose the bookstore CTA');
  assert.match(html,/class="hero-pathway-cta"/,name+' homepage must keep the conversion actions grouped in the hero');
}
assert.match(register,/name="mobile"[^>]*type="tel"[^>]*(?:autocomplete="tel"[^>]*)(?![^>]*required)/,'Registration phone must be optional');
assert.match(register,/شماره تلفن اختیاری|موبایل اختیاری/,'Persian registration must explain that phone is optional');
assert.match(styles,/\.hero-pathway-cta/,'Homepage CTA styles must be present');
assert.match(styles,/@media\s*\(max-width:\s*680px\)/,'Phone layout rules must be present');
assert.match(styles,/@media\s*\(prefers-reduced-motion:\s*reduce\)/,'Reduced-motion behavior must be present');
console.log('PASS: bilingual homepage pathways, responsive experience stylesheet, and optional registration phone');
