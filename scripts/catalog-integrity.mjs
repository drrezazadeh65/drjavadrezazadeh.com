#!/usr/bin/env node
// Read-only catalog integrity gate for the bilingual academic website.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const load = p => JSON.parse(readFileSync(join(root,p),'utf8'));
const standard = load('assets/data/service-catalog.json');
const vip = load('assets/data/vip-catalog.json');
const books = load('assets/data/book-catalog.json');
const errors = [];
const check = (ok,message) => { if (!ok) errors.push(message); };
const ids = (items,label) => {
  check(new Set(items.map(x=>x.id)).size===items.length,label+': duplicate ID');
  for(const x of items) {
    check(typeof x.id==='string' && /^[a-z0-9_-]+$/.test(x.id),label+': invalid ID');
    check(typeof x.price==='number' && Number.isSafeInteger(x.price) && x.price>0,label+': invalid price for '+x.id);
    check(typeof x.title_fa==='string' && x.title_fa.trim().length>0,label+': missing Persian title '+x.id);
  }
};
check(standard.currency==='IRT','standard: expected IRT (toman)');
check(vip.currency==='IRT','VIP: expected IRT (toman)');
check(standard.services.length===21,'standard: expected 21 services');
check(vip.services.length===6,'VIP: expected 6 services');
ids(standard.services,'standard');
ids(vip.services,'VIP');
check(books.books.length===3,'books: expected three published books');
check(new Set(books.books.map(x=>x.id)).size===3,'books: duplicate ID');
const expected = new Map([['roshanaei','سپیدی'],['tariki','تاریکی'],['bonbast','بن‌بست']]);
for(const b of books.books){
  check(expected.get(b.id)===b.title_fa,'book: unexpected title or ID '+b.id);
  check(b.publication_status==='PUBLISHED','book: unexpected publication status '+b.id);
  check(b.commerce?.currency==='IRT' && b.commerce?.price===2000000,'book: price or currency mismatch '+b.id);
  const cover=b.bibliography?.cover_image;
  check(typeof cover==='string' && cover.startsWith('/assets/images/books/') && existsSync(join(root,(cover||'').replace(/^\//,''))),'book: missing approved cover asset '+b.id);
}
// Separate inventory and commercial identity for one authentic two-volume set.
const collectibles=load('assets/data/collectible-catalog.json');
check(collectibles.books?.length===1,'collectible: owner offers one set, not two units');
const only=collectibles.books?.[0];
check(only?.id==='websters-third-1981','collectible: exact approved SKU required');
check(only?.commerce?.price===50000000&&only.commerce?.currency==='IRT','collectible: approved 50M toman amount');
check(only?.commerce?.single_copy===true&&only.commerce?.max_quantity_per_order===1,'collectible: one-copy max quantity');
check(only?.bibliography?.cover_is_illustration===true,'collectible: illustrative cover must not be passed off as photographic evidence');
const cover=only?.bibliography?.cover_image;
check(typeof cover==='string'&&existsSync(join(root,(cover||'').replace(/^\//,''))),'collectible: missing labelled promotional artwork');
for(const language of ['fa','en']){
  const rel=language+'/shop/collectibles/websters-third-1981/index.html';
  check(existsSync(join(root,rel)),'collectible: missing '+language+' landing page');
  if(existsSync(join(root,rel))){
    const html=readFileSync(join(root,rel),'utf8');
    check(html.includes('data-collectible-buy')&&html.includes('/assets/js/collectible-websters-checkout.js'),'collectible: missing secure purchase control '+language);
  }
}
for(const s of vip.services){
  check(s.detail_url===`/fa/vip/${s.id}/`,'VIP: noncanonical detail URL '+s.id);
  check(existsSync(join(root,(s.detail_url||'').replace(/^\//,''), 'index.html')),'VIP: detail page missing '+s.id);
}
for(const s of standard.services){
  check(existsSync(join(root,'fa/services',s.id,'index.html')),'standard: detail page missing '+s.id);
}
// Static page checks: protect canonical URLs, indexability, and service artwork.
const verifyPage = (url,label) => {
  const rel = url.replace(/^\//,'');
  const file = join(root,rel,'index.html');
  if (!existsSync(file)) { check(false,label+': missing detail page '+url); return; }
  const html = readFileSync(file,'utf8');
  const canonical = 'https://drjavadrezazadeh.com'+url;
  check(html.includes('rel="canonical" href="'+canonical+'"') || html.includes('href="'+canonical+'" rel="canonical"'),label+': missing or mismatched canonical '+url);
  check(/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(html),label+': missing H1 '+url);
  check(/<meta\s+name="description"\s+content="[^"]{20,}"/i.test(html),label+': missing useful meta description '+url);
  check(!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html),label+': unexpected noindex '+url);
};
for(const s of standard.services){
  verifyPage('/fa/services/'+s.id+'/','standard');
  check(existsSync(join(root,'assets/images/services',s.id+'.svg')),'standard: missing unique service artwork '+s.id);
}
for(const s of vip.services){
  verifyPage(s.detail_url,'VIP');
}
if(errors.length){ console.error('Catalog integrity FAILED:\n'+errors.map(e=>' - '+e).join('\n')); process.exitCode=1; }
else console.log('Catalog integrity passed: 21 services, 6 VIP, 3 original books + 1 separate collectible; IDs, prices, detail pages and approved cover paths checked.');
