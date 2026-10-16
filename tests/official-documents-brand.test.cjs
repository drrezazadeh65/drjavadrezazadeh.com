/* Guard the canonical Persian identity in every static official-document preview. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const templates=['donation-receipt-fa.html','official-letterhead-fa.html','service-invoice-fa.html'];
const assets=['identity/references/persian-symbol-gold.png','identity/references/persian-wordmark-gold.png'];
for(const asset of assets){
 assert.ok(fs.existsSync(path.join(root,asset)), 'Missing approved identity asset: '+asset);
 assert.ok(fs.statSync(path.join(root,asset)).size>1000, 'Empty identity asset: '+asset);
}
for(const name of templates){
 const file=path.join(root,'identity/templates',name);
 const html=fs.readFileSync(file,'utf8');
 assert.match(html,/<html\s+lang="fa"\s+dir="rtl"/);
 assert.match(html,/name="robots"\s+content="[^"]*noindex/);
 assert.ok(html.includes('../tokens.css')&&html.includes('../document.css'),name+': missing shared styles');
 assert.ok(html.includes('jr-document--official'),name+': missing shared stationery');
 for(const asset of assets){
  const relative='../references/'+path.basename(asset);
  assert.ok(html.includes(relative),name+': missing '+relative);
 }
 assert.ok(/پیش.?نمایش|قالب نمایشی/.test(html),name+': missing preview disclosure');
 assert.ok(!/<script\b/i.test(html),name+': preview must not execute JavaScript');
 console.log('PASS '+name);
}
const live=fs.readFileSync(path.join(root,'assets/js/student-sponsorship-dashboard.js'),'utf8');
const page=fs.readFileSync(path.join(root,'fa/customer-dashboard/index.html'),'utf8');
assert.ok(live.includes('/identity/references/persian-symbol-gold.png'));
assert.ok(live.includes('/identity/references/persian-wordmark-gold.png'));
assert.ok(live.includes("order.state==='paid'&&order.paymentVerified===true"),'Receipt must be gated by paid state and verified payment claim');
assert.ok(live.includes('if(verified){'),'Receipt must only render in verified branch');
assert.ok(page.includes('customer-dashboard-v1.css?v=20261015-a4-print-flow-v2'),'Dashboard must load latest A4 print stylesheet');
assert.ok(page.includes('student-sponsorship-dashboard.js?v=20261015-persian-receipt-lockup-v1'),'Dashboard must load branded receipt renderer');
const favicon=fs.readFileSync(path.join(root,'favicon.svg'),'utf8');
assert.ok(favicon.includes('data:image/png;base64,'),'SVG favicon must be self-contained for browser compatibility');
assert.ok(!/href="\/(?!\/)/.test(favicon),'SVG favicon must not depend on external images');
const customerCss=fs.readFileSync(path.join(root,'assets/css/customer-dashboard-v1.css'),'utf8');
assert.ok(customerCss.includes('.jr-receipt-print-target{box-sizing:border-box!important;position:absolute!important'),'Printed receipt must be positioned independently of dashboard flow');
assert.ok(!customerCss.includes('.jr-receipt-print-target{box-sizing:border-box!important;position:relative!important'),'Printed receipt must not re-enter dashboard flow');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const cacheStamp=worker.match(/^const CACHE_VERSION='(jr-site-(?:bertina-[a-f0-9]{40}|20[0-9]{6}-[a-z0-9-]+))';$/m);
assert.ok(cacheStamp,'PWA cache must have a valid source-version or immutable release-SHA identifier');
assert.notEqual(cacheStamp[1],'jr-site-20261015-persian-brand-favicon-v1','PWA cache cannot regress to pre-brand favicon version');
assert.ok(worker.includes("'/favicon.svg'"),'Service worker must precache the canonical favicon');
const workerCacheEntries=[...worker.matchAll(/^\s*'\/(?:favicon\.(?:ico|png|svg)|assets\/images\/pwa-icon-[^']+)'/gm)].map(m=>m[0].trim().slice(1,-1));
for(const asset of workerCacheEntries){
 const file=path.join(root,asset.slice(1));
 assert.ok(fs.existsSync(file),'Service worker precache asset missing: '+asset);
 assert.ok(fs.statSync(file).size>100,'Service worker precache asset empty: '+asset);
}
for(const privatePath of ["'/api/'","'/fa/customer-dashboard/'","'/fa/app/'","'/en/account/'","'/fa/services/checkout/'"]){
 assert.ok(worker.includes(privatePath),'Sensitive route must remain excluded from offline cache: '+privatePath);
}
assert.ok(worker.includes("fetch(req,{cache:'no-store'})"),'Private requests must use network-only no-store fetch');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'site.webmanifest'),'utf8'));
const iconFiles=new Set(manifest.icons.map(icon=>icon.src.replace(/^\.\//,'')));
for(const required of ['assets/images/pwa-icon-192.png','assets/images/pwa-icon-512.png','assets/images/pwa-icon-maskable-512.png']){
 assert.ok(iconFiles.has(required),'Missing approved PWA icon in manifest: '+required);
 assert.ok(fs.statSync(path.join(root,required)).size>1000,'PWA icon file is missing or empty: '+required);
}
for(const shortcut of manifest.shortcuts||[]){
 assert.ok(/^\.\/[a-z0-9/_-]+\/$/i.test(shortcut.url),'PWA shortcut must be a safe site-relative directory URL');
 const target=path.join(root,shortcut.url.slice(2),'index.html');
 assert.ok(fs.existsSync(target),'PWA shortcut target does not exist: '+shortcut.url);
 assert.ok(fs.statSync(target).size>100,'PWA shortcut target is empty: '+shortcut.url);
}
const css=fs.readFileSync(path.join(root,'identity/document.css'),'utf8');
assert.ok(css.includes('@page')&&css.includes('A4'),'Shared document stylesheet must support A4');
assert.ok(css.includes('.jr-document__header')&&css.includes('.jr-document__footer'));
console.log('PASS official stationery: '+templates.length+' templates, approved assets, A4 rules');
