import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const file=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const services=JSON.parse(file("assets/data/service-catalog.json")).services;
const vips=JSON.parse(file("assets/data/vip-catalog.json")).services;
const extra=JSON.parse(file("assets/data/service-value-v440.json")).services;
test("21 professional services present unique, substantial buyer-value explanations, inputs, exact checkout and semantic hero",()=>{
 assert.equal(services.length,21);
 assert.deepEqual(Object.keys(extra).sort(),services.map(x=>x.id).sort());
 const rationales=new Set();
 const arts=new Set();
 for(const s of services){
  const html=file("fa/services/"+s.id+"/index.html");
  const image=file("assets/images/services/"+s.id+".svg");
  const value=extra[s.id];
  for(const field of ["why","prepare","compare"])assert.ok(typeof value[field]==="string"&&value[field].length>85, s.id+" "+field);
  for(const line of [value.why,value.prepare,value.compare,s.boundary_fa,s.outcome_fa])assert.ok(html.includes(line),s.id+" text absent");
  assert.ok(html.includes('id="jr-value-'+s.id+'"'),s.id+" value landmark absent");
  assert.ok(html.includes("/assets/css/service-value-v440.css"),s.id+" css absent");
  assert.ok(html.includes("/fa/shop/checkout/?sku=service%3A"+s.id),s.id+" checkout absent");
  assert.ok(html.includes('rel="canonical" href="https://drjavadrezazadeh.com/fa/services/'+s.id+'/'),s.id+" canonical");
  assert.match(html,/<h1\b/);
  assert.ok(image.includes(s.title_fa),s.id+" art not subject-specific");
  rationales.add(value.why);arts.add(image);
 }
 assert.equal(rationales.size,21);assert.equal(arts.size,21);
});
test("six VIP pages have individualized rationale, informed preparation and transparent conditions",()=>{
 assert.equal(vips.length,6);
 for(const v of vips){
  const html=file("fa/vip/"+v.id+"/index.html");
  assert.ok(html.includes('id="vip-value-'+v.id+'"'),v.id);
  assert.ok(html.includes("/assets/css/vip-value-v440.css"),v.id);
  assert.ok(html.includes("/fa/shop/checkout/?sku=vip%3A"+v.id),v.id);
  assert.ok(html.includes("/fa/services/guide/"),v.id);
  assert.ok(html.includes("مرز تعهدات"),v.id);
  assert.ok(html.includes("ظرفیت، زمان‌بندی"),v.id);
  assert.ok(html.includes('rel="canonical" href="https://drjavadrezazadeh.com/fa/vip/'+v.id+'/'),v.id);
 }
});
