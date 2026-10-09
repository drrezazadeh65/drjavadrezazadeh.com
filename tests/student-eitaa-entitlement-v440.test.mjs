import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const base=new URL("../",import.meta.url);
const site=path.fileURLToPath(base);
const noDirs=new Set([".git","node_modules"]);
function walk(dir,fn){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(noDirs.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,fn);else if(e.isFile())fn(p)}}
test("third-party Eitaa support identity does not leak through static HTML before verified service purchase",()=>{
 const exposed=[];
 walk(site,p=>{if(!p.endsWith(".html"))return;const s=fs.readFileSync(p,"utf8");
  if(/(?:eitaa\.com\/DrRezazadeh65|eitaa\.com\/DrRezazadeh|@DrRezazadeh65)/i.test(s))exposed.push(path.relative(site,p))
 });
 assert.deepEqual(exposed,[],"Public HTML must never expose student-support Eitaa ID: "+exposed.join(", "));
});
test("student Eitaa access is derived server-side from verified bank-paid eligible service, not UI claims",()=>{
 const worker=fs.readFileSync(path.join(site,"payment-api/commerce-routes.js"),"utf8");
 const standalone=fs.readFileSync(path.join(site,"payment-api/worker-single-file-candidate.js"),"utf8");
 for(const s of [worker,standalone]){
  assert.match(s,/studentEitaaEligible\(row\)/);
  assert.match(s,/row\?\.state!=="paid"/);
  assert.match(s,/!row\.provider_trans_id/);
  assert.match(s,/await authorisedReceipt\(request,row\)/);
  assert.match(s,/STUDENT_SUPPORT_SKUS/);
  assert.match(s,/student_support_eitaa:/);
 }
});
