import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignored=new Set(['.git','node_modules']);
const files=[];
const failures=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) files.push(full);
  }
}
walk(root);

// Inspect the complete JSON-LD object tree, not just top-level @graph nodes.
// A nested Service.offers object is still a public commercial claim.
function flattenSchema(data){
  if(Array.isArray(data)) return data.flatMap(flattenSchema);
  if(!data||typeof data!=='object') return [];
  return [data,...Object.values(data).flatMap(flattenSchema)];
}
function hasType(obj,type){
  const t=obj?.['@type'];
  return Array.isArray(t)?t.includes(type):t===type;
}

let checked=0;
for(const file of files){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
  checked++;
  const objs=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{ objs.push(...flattenSchema(JSON.parse(m[1]))); }
    catch{ continue; }
  }
  for(const obj of objs){
    if(hasType(obj,'Offer')||hasType(obj,'AggregateOffer')){
      failures.push(rel+': Offer/AggregateOffer schema is prohibited before a real sellable offer exists');
    }
    if(hasType(obj,'Service')&&Object.prototype.hasOwnProperty.call(obj,'offers')){
      failures.push(rel+': Service.offers is prohibited until service booking and payment are independently verified');
    }
    if(hasType(obj,'Product')&&('offers' in obj||'price' in obj||'priceCurrency' in obj||'availability' in obj)){
      failures.push(rel+': Product schema contains commercial offer fields before gateway/offer activation');
    }
    for(const key of ['price','priceCurrency','priceValidUntil','availability','acceptedPaymentMethod']){
      if(Object.prototype.hasOwnProperty.call(obj,key)){
        failures.push(rel+': structured data exposes '+key+' before verified commerce activation');
      }
    }
  }
}

const catalogPath=path.join(root,'platform','book-catalog.json');
if(fs.existsSync(catalogPath)){
  try{
    const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
    const entries=Array.isArray(catalog)?catalog:(catalog.books||catalog.items||[]);
    for(const item of entries){
      if(item&&item.sellable===true) failures.push('platform/book-catalog.json: sellable=true before commerce activation');
    }
  }catch{
    failures.push('platform/book-catalog.json: invalid JSON');
  }
}

// Browser cart, book checkout and service/VIP purchase buttons must all fail closed.
// The deployed Worker may advertise a legacy generic checkout flag without category readiness.
const bookClient=fs.readFileSync(path.join(root,'assets/js/book-store.js'),'utf8');
for(const [needle,why] of [
 ['health.capabilities?.books===true','missing explicit live book-payment capability'],
 ['checkout.disabled=!bookPaymentReady','book cart payment must start disabled'],
 ['btn.disabled=!bookPaymentReady','book checkout payment must start disabled'],
 ['bookPaymentReady=await verifyBookPaymentCapability()','book controls must wait for a fresh readiness check'],
 ['bookCoverUrl(book)','book cover source must be constrained to owned media paths'],
 ['escapeHtml(book.title_fa)','dynamic book title must be HTML-escaped']
]){
 if(!bookClient.includes(needle))failures.push('assets/js/book-store.js: '+why);
}
if(bookClient.includes('checkout.disabled=false')||bookClient.includes('finally{button.disabled=false}'))
 failures.push('assets/js/book-store.js: unverified or failed payment may not re-enable controls');
const donationPage=fs.readFileSync(path.join(root,'fa','support-talented-students','index.html'),'utf8');
if(!/<meta\\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(donationPage))
 failures.push('fa/support-talented-students/index.html: donation preview must remain noindex until independently approved');
if(!/button[^>]*disabled/i.test(donationPage))
 failures.push('fa/support-talented-students/index.html: donation payment control must remain disabled before launch evidence');
if(/\/donations\/create/.test(donationPage))
 failures.push('fa/support-talented-students/index.html: preview must not call donation creation API before launch evidence');

const serviceClient=fs.readFileSync(path.join(root,'assets/js/commerce-checkout.js'),'utf8');
if(!serviceClient.includes('channel===true')||serviceClient.includes('channel===undefined'))
 failures.push('assets/js/commerce-checkout.js: missing service-specific fail-closed checkout capability');

console.log('Commerce schema safety audit: '+checked+' indexable pages checked.');
if(failures.length){
  console.error('Commerce schema safety failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('No unverified Offer/Product pricing schema or premature sellable state detected.');
