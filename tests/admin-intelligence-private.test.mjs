import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('keyword strategy is not publicly downloadable',()=>{
 assert.equal(fs.existsSync(path.join(root,'assets/data/keyword-master-map-v1.json')),false);
 const privatePath='api/internal/keyword-master-map-v1.json';
 assert.ok(fs.existsSync(path.join(root,privatePath)));
 assert.match(read('api/internal/.htaccess'),/Require all denied/i);
});
test('keyword endpoint follows verified account, membership, and fresh MFA',()=>{
 const src=read('api/operations.php');
 const account=src.indexOf('$account = sessionAccount($pdo)');
 const member=src.indexOf('operationsAdmin($pdo,$account,$configuration)');
 const fresh=src.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const endpoint=src.indexOf("if ($path === '/admin/operations/keyword-map'");
 assert.ok(account>=0&&member>account&&fresh>member&&endpoint>fresh);
 assert.match(src.slice(endpoint,endpoint+1300),/internal\/keyword-master-map-v1\.json/);
 assert.match(src.slice(endpoint,endpoint+1300),/rateAllowed/);
 assert.match(src.slice(endpoint,endpoint+1300),/respond\(\$map\)/);
});
test('owner keyword map is bounded, editorial and has no fake provider metrics',()=>{
 const map=JSON.parse(read('api/internal/keyword-master-map-v1.json'));
 assert.equal(map.schema,'jr-keyword-master-map-v1');
 assert.equal(map.status,'EDITORIAL_SEEDS_NOT_MEASURED');
 assert.equal(map.keywords.length,13);
 const owners=new Set();
 for(const kw of map.keywords){
  assert.match(kw.id,/^KW-\d{3}$/);
  assert.match(kw.canonical,/^\/(?:fa|en|journal)\//);
  assert.ok(!owners.has(kw.canonical),'duplicate canonical owner');
  owners.add(kw.canonical);
  assert.ok(fs.existsSync(path.join(root,kw.canonical.slice(1),'index.html')),kw.canonical+' missing');
  assert.equal(kw.rank,null);assert.equal(kw.volume,null);assert.equal(kw.competitorEvidence,null);
 }
});
test('browser loads keywords only after workspace appears and clears on lock',()=>{
 const src=read('assets/js/operations-keyword-master.js');
 assert.match(src,/MutationObserver/);
 assert.match(src,/workspace\.hidden/);
 assert.match(src,/if\(workspace\.hidden\)clearPrivateMap\(\)/);
 assert.match(src,/if\(active!==generation\|\|workspace\.hidden\)return/);
 assert.match(src,/credentials:'same-origin'/);
 assert.match(src,/\/api\/admin\/operations\/keyword-map/);
 assert.doesNotMatch(src,/\/assets\/data\/keyword-master-map-v1\.json/);
});
test('two language dashboards keep MFA, privacy, schema and JHELA workstreams',()=>{
 for(const pathname of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const src=read(pathname);
  assert.match(src,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(src,/id="ops-mfa-form"/);
  assert.match(src,/<div id="ops-workspace" hidden>/);
  assert.match(src,/<section id="jr-intelligence"/);
  assert.match(src,/operations-intelligence\.js/);
  assert.match(src,/operations-keyword-master\.js/);
  assert.match(src,/operations-jhela-workstream\.js/);
 }
});

import './operations-author-real-view.test.mjs';
