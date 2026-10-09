import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const page=p=>fs.readFileSync(path.join(root,p),"utf8");
const book=load("assets/data/book-catalog.json");
const service=load("assets/data/service-catalog.json");
const vip=load("assets/data/vip-catalog.json");

test("three approved books retain price, physical format and original on-disk artwork",()=>{
 assert.equal(book.books.length,3);
 assert.deepEqual(book.books.map(b=>b.title_fa).sort(),["بن‌بست","تاریکی","سپید"].sort());
 for(const b of book.books){
  assert.equal(b.commerce.price,2000000,b.id);
  assert.equal(b.commerce.currency,"IRT",b.id);
  assert.equal(b.commerce.shipping_required,true,b.id);
  assert.equal(b.commerce.sellable,true,b.id);
  assert.equal(b.commerce.inventory_state,"IN_STOCK",b.id);
  assert.ok(b.commerce.formats_confirmed.includes("PRINT"),b.id);
  const cover=b.bibliography.cover_image;
  assert.ok(cover?.startsWith("/assets/images/books/"),b.id);
  assert.ok(fs.existsSync(path.join(root,cover)),b.id+" original cover file missing");
  for(const field of ["isbn","publisher","publication_year"]){
   assert.equal(b.bibliography[field],null,b.id+" must not invent "+field);
  }
 }
});

for(const [kind,catalog,expected] of [["service",service,21],["vip",vip,6]]){
 test("all "+expected+" "+kind+" catalogue entries lead to complete checkout and canonical detail pages",()=>{
  assert.equal(catalog.currency,"IRT");
  assert.equal(catalog.services.length,expected);
  const ids=new Set();
  for(const item of catalog.services){
   assert.ok(!ids.has(item.id),"duplicate "+kind+" id: "+item.id);ids.add(item.id);
   assert.equal(item.sellable,true,item.id);
   assert.ok(Number.isSafeInteger(item.price)&&item.price>0,item.id);
   if(kind==="vip")assert.equal(item.checkout_enabled,true,item.id);
   const route="/fa/"+(kind==="service"?"services":"vip")+"/"+item.id+"/";
   const html=page(route.slice(1)+"index.html");
   const canonical='href="https://drjavadrezazadeh.com'+route+'"';
   assert.ok(html.includes(canonical),route+" canonical mismatch");
   assert.equal((html.match(/<h1\b/gi)||[]).length,1,route+" must have exactly one H1");
   assert.ok(/<img\b/i.test(html),route+" requires at least one image");
   assert.ok(/<img\b[^>]*\balt=["'][^"']*["']/i.test(html),route+" image needs alt");
   const checkout="/fa/shop/checkout/?sku="+kind+"%3A"+item.id;
   assert.ok(html.includes(checkout),route+" checkout action absent");
   assert.ok(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*index/i.test(html),route+" index status must be explicit");
  }
 });
}
