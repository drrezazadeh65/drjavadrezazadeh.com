import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('assets/css/jr-ecosystem-design-v2.css','utf8');
for(const p of ["fa/index.html","en/index.html","fa/golden-talent/index.html","en/golden-talent/index.html"]){
 const html=fs.readFileSync(p,'utf8');
 assert.ok(html.includes('href="/assets/css/jr-ecosystem-design-v2.css?v=20261015-r1"'),p);
 assert.equal((html.match(/jr-ecosystem-design-v2\.css/g)||[]).length,1,p+' single link');
 assert.match(html,/rel="canonical"/,p+' keeps canonical');
}
assert.match(css,/--jr2-gold/);
assert.match(css,/min-width:701px/);
assert.match(css,/max-width:700px/);
assert.match(css,/max-width:360px/);
assert.match(css,/prefers-reduced-motion:reduce/);
for(const p of ['fa/index.html','en/index.html']){
 const html=fs.readFileSync(p,'utf8');
 assert.match(html,/class="portrait-shell"/,p+' photograph surface');
 assert.match(html,/mobile-app-v431\.css/,p+' existing app dock');
}
for(const p of ["fa/shop/index.html","en/shop/index.html","fa/akhbar/index.html","en/news-insights/index.html","fa/support-talented-students/index.html","en/support-talented-students/index.html"]){const html=fs.readFileSync(p,'utf8');assert.ok(html.includes('href="/assets/css/jr-ecosystem-design-v2.css?v=20261015-r1"'),p+' identity layer');}
for(const p of ['fa/shop/index.html','en/shop/index.html']){const html=fs.readFileSync(p,'utf8');assert.match(html,/data-cart-count/,p+' cart preserved');assert.match(html,/bookstore-talent-approved-scene-20261011/,p+' approved scene preserved');}
for(const p of ["fa/assessments/golden-talent/index.html","en/golden-talent/assessment/index.html","fa/app/student/bahar/index.html","en/golden-talent/dashboard/bahar/index.html","fa/customer-dashboard/index.html","en/account/index.html","journal/index.html","journal/fa/index.html"]){const html=fs.readFileSync(p,'utf8');assert.ok(html.includes('href="/assets/css/jr-ecosystem-design-v2.css?v=20261015-r1"'),p+' shared design');}
console.log('PASS: bilingual academic home and Golden Talent share one mobile/tablet-first visual layer.');
