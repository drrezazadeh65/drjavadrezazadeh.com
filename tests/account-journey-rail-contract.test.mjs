import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(p,'utf8');
const css=read('assets/css/jr-account-journey-rail-v1.css');
const pages=[
 ['fa','orders','fa/app/account/orders/index.html'],
 ['fa','appointments','fa/app/account/appointments/index.html'],
 ['fa','reports','fa/app/account/reports/index.html'],
 ['en','orders','en/account/orders/index.html'],
 ['en','appointments','en/account/appointments/index.html'],
 ['en','reports','en/account/reports/index.html']
];
test('all six existing private routes have bilingual account navigation, not fake entitlement',()=>{
 for(const [lang,kind,file] of pages){
  const html=read(file);
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive/,'noindex is preserved '+file);
  assert.match(html,/data-resource="(?:orders|appointments|reports)"/);
  assert.ok(html.includes('data-jr-account-journey'),'rail must be present '+file);
  assert.match(html,/jr-account-journey-rail-v1\.css\?v=20261019-account-route-v1/);
  const nav=html.match(/<nav class="jr-account-route-rail"[\s\S]*?<\/nav>/);
  assert.ok(nav,'standalone accessible rail '+file);
  assert.equal((nav[0].match(/data-jr-route-link="/g)||[]).length,5,'five genuine routes in '+file);
  assert.equal((nav[0].match(/aria-current="page"/g)||[]).length,1,'one current route '+file);
  assert.match(nav[0],new RegExp('data-jr-route-link="'+kind+'" href="[^"]+" aria-current="page"'));
  assert.ok(nav[0].includes('href="/'+lang+'/services/"'),'catalogue stays reachable');
  assert.ok(nav[0].includes('href="/'+lang+(lang==='fa'?'/customer-dashboard/':'/account/')+'"'),'unified dashboard stays reachable');
  for(const other of ['orders','appointments','reports']){
   const url=lang==='fa'?'/fa/app/account/'+other+'/':'/en/account/'+other+'/';
   assert.ok(nav[0].includes('href="'+url+'"'),'genuine private destination '+url);
  }
  const main=html.indexOf('<main id="main"');
  const firstSection=html.indexOf('<section',main);
  assert.ok(html.indexOf('data-jr-account-journey',main)<firstSection,'rail precedes substantive content');
  assert.match(nav[0],/class="jr-route-truth"/);
  assert.doesNotMatch(nav[0],/<(?:form|input|script)\b/,'navigation must not collect or write data');
 }
});
test('existing private transactional and scientific logic stays in place',()=>{
 for(const lang of ['fa','en']){
  const prefix=lang==='fa'?'fa/app/account':'en/account';
  const orders=read(prefix+'/orders/index.html');
  assert.match(orders,/account-order-history\.js\?v=/,'real private order history retained');
  assert.match(orders,/data-resource="orders"/);
  const appointments=read(prefix+'/appointments/index.html');
  assert.match(appointments,/consultation-appointments\.js\?v=/,'server-verified appointment viewer retained');
  assert.match(appointments,/data-consultation-results/);
  const reports=read(prefix+'/reports/index.html');
  assert.match(reports,/data-resource="reports"/);
  assert.match(reports,/role-boundary-section/);
 }
 const en=read('en/account/orders/index.html');
 assert.doesNotMatch(en,/Commerce Preview|Private Account Preview/);
 assert.match(en,/Verified-email order history/);
 const fa=read('fa/app/account/appointments/index.html');
 assert.doesNotMatch(fa,/بدون نوبت واقعی/);
});
test('rail remains premium, keyboard-operable and confined to existing private pages',()=>{
 for(const selector of ['.account-subpage .jr-account-route-rail','.jr-route-links','aria-current="page"',':focus-visible','max-width:390px','prefers-reduced-motion:reduce','@media print']){
  assert.ok(css.includes(selector),'missing visual/accessibility rule: '+selector);
 }
 assert.match(css,/min-height:48px/);
 assert.match(css,/overflow-x:auto/,'horizontal mobile navigation stays accessible');
 assert.match(css,/--jr-rail-gold:#e4c989/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:\/\//,'no new network fonts or media');
});
