import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fa=readFileSync('fa/index.html','utf8');
const en=readFileSync('en/index.html','utf8');
const faRegister=readFileSync('fa/register/index.html','utf8');
const enRegister=readFileSync('en/register/index.html','utf8');
const styles=readFileSync('assets/css/home-experience-v1.css','utf8');

for (const [name,html,label,href] of [
  ['Persian',fa,'فروشگاه کتاب','../shop/'],
  ['English',en,'Bookstore','../shop/']
]) {
  assert.match(html,/home-experience-v1\.css\?v=20261013-home-v2/,name+' homepage must load the responsive experience stylesheet');
  assert.match(html,new RegExp('href="'+href+'"[^>]*>'+label),name+' homepage must expose the bookstore CTA');
  assert.match(html,/class="actions hero-pathway-cta"/,name+' homepage must group the primary pathways');
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
