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
// Preserve the three legacy poetry titles exactly; a new one-off collectible
// is an additional SKU with its own price, stock contract and honest image.
const expected=new Map([['roshanaei','سپیدی'],['tariki','تاریکی'],['bonbast','بن‌بست']]);
const collectibleId='websters-third-1981';
check(books.books.length===4,'books: expected three original poetry books plus the collectible');
check(new Set(books.books.map(x=>x.id)).size===books.books.length,'books: duplicate ID');
for(const b of books.books){
  const collectible=b.id===collectibleId;
  if(!collectible)check(expected.get(b.id)===b.title_fa,'book: unexpected title or ID '+b.id);
  check(b.publication_status==='PUBLISHED','book: unexpected publication status '+b.id);
  if(collectible){
    check(b.commerce?.currency==='IRT' && b.commerce?.price===50000000,'collectible: agreed owner price/currency mismatch');
    check(b.commerce?.single_copy===true && b.commerce?.max_quantity_per_order===1,'collectible: one-set inventory contract mismatch');
    check(b.bibliography?.cover_is_illustration===true,'collectible: artwork must be labelled an illustration');
    verifyLater();
  }else{
    check(b.commerce?.currency==='IRT' && b.commerce?.price===2000000,'book: price or currency mismatch '+b.id);
  }
  const cover=b.bibliography?.cover_image;
  check(typeof cover==='string' && cover.startsWith('/assets/images/books/') && existsSync(join(root,(cover||'').replace(/^\//,''))),'book: missing approved cover asset '+b.id);
}
function verifyLater(){
  for(const language of ['fa','en']){
    const file=join(root,language,'shop','collectibles',collectibleId,'index.html');
    check(existsSync(file),'collectible: missing '+language+' product page');
    if(existsSync(file)){
      const page=readFileSync(file,'utf8');
      check(page.includes('data-collectible-buy')&&page.includes('collectible-websters-checkout.js'),'collectible: secure stock-checked CTA not linked on '+language);
    }
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
else console.log('Catalog integrity passed: 21 services, 6 VIP, 4 books (including one collectible); IDs, prices, detail pages and approved cover paths checked.');
