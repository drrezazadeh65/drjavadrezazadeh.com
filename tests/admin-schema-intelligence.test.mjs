import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=process.cwd();
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const schema=()=>read('assets/js/operations-intelligence.js');
const identity=['fa/app/admin/index.html','en/account/admin/index.html'];

test('schema source audit is restricted to public, same-origin HTML and never sends cookies',()=>{
 const js=schema();
 assert.match(js,/const allowed=p=>/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/new URL\(res\.url\)\.origin!==location\.origin/);
 assert.match(js,/!allowed\(new URL\(res\.url\)\.pathname\)/);
 assert.match(js,/if\(html\.length>1600000\)/);
 assert.match(js,/new DOMParser\(\)\.parseFromString\(html,'text\/html'\)/);
 assert.match(js,/if\(\/noindex\/i\.test\(/);
 assert.doesNotMatch(js,/credentials:'include'/);
 assert.doesNotMatch(js,/\/api\/admin\//);
});
test('audit samples are explicitly bounded and cannot claim Google/AI measured scores',()=>{
 const js=schema();
 assert.match(js,/urls\.size>=32/);
 assert.match(js,/slice\(0,32\)/);
 assert.match(js,/Promise\.all\(\[worker\(\),worker\(\),worker\(\)\]\)/);
 assert.match(js,/internal sample-only heuristic|صرفاً برای نمونه بررسی‌شده/);
 assert.match(js,/not evidence of Google eligibility or indexing/);
 assert.match(js,/ENG-02/);
 assert.match(js,/Three proposed next priorities/);
 assert.match(js,/Future concept only; disabled with no calculations/);
 assert.doesNotMatch(js,/https?:\/\/(?:api\.openai\.com|chatgpt\.com)/);
});
test('schema audit only executes when the authenticated dashboard workspace is visible',()=>{
 const js=schema();
 assert.match(js,/document\.getElementById\('ops-workspace'\)\?\.hidden/);
 assert.match(js,/if\(running \|\|/);
 assert.match(js,/btn\.disabled=true/);
 assert.match(js,/btn\.disabled=false/);
});
test('both localized admin dashboards use auth shell and preserve existing JHELA, revenue, and social tools',()=>{
 for(const file of identity){
  const html=read(file);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/id="ops-mfa-form"/);
  assert.match(html,/<div id="ops-workspace" hidden>(?:<p\\b[^>]*>[\\s\\S]*?<\\/p>)?<section id="jr-intelligence"/);
  assert.match(html,/data-jr-score/);
  assert.match(html,/data-jr-results/);
  assert.match(html,/operations-intelligence\.js/);
  assert.match(html,/operations-keyword-master\.js/);
  assert.match(html,/operations-jhela-workstream\.js/);
  assert.match(html,/operations-revenue-planner\.mjs/);
  assert.match(html,/operations-commerce\.js/);
 }
});
test('the keyword seed map is protected and correctly classified as unmeasured',()=>{
 assert.equal(fs.existsSync(path.join(base,'assets/data/keyword-master-map-v1.json')),false);
 const doc=JSON.parse(read('api/internal/keyword-master-map-v1.json'));
 assert.equal(doc.keywords.length,13);
 assert.equal(doc.status,'EDITORIAL_SEEDS_NOT_MEASURED');
 for(const k of doc.keywords){assert.equal(k.rank,null);assert.equal(k.volume,null);}
 const js=read('assets/js/operations-keyword-master.js');
 assert.match(js,/\/api\/admin\/operations\/keyword-map/);
 assert.match(js,/if\(workspace\.hidden\)clearPrivateMap/);
});
