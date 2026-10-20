import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('scientific readiness is bilingual, admin-gated and preserves existing public endpoints',()=>{
 const php=read('api/golden-talent.php');
 const js=read('assets/js/operations-scientific-readiness-v1.js');
 for(const name of ['rcasStart','baharReadiness','scientificContinuity','protectedSystem'])
  assert.ok(php.includes("'"+name+"'=>")||php.includes("'"+name+"' =>"),name);
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  assert.match(html,/id="ops-scientific-readiness"/);
  assert.match(html,/id="ops-workspace" hidden/);
  assert.match(html,/operations-scientific-readiness-v1\.js/);
  assert.match(html,/operations-scientific-readiness-v1\.css/);
  assert.match(html,/noindex,nofollow,noarchive/);
 }
 assert.match(read('assets/js/operations-workspace-index-v1.js'),/ops-scientific-readiness/);
 const build=read('scripts/build-public-site.mjs');
 assert.match(build,/assets\/js\/operations-scientific-readiness-v1\.js/);
 assert.match(build,/assets\/css\/operations-scientific-readiness-v1\.css/);
 for(const name of ['RCAS','Golden Talent','BAHAR','Studio'])assert.ok(js.includes(name),name);
 assert.match(js,/\/api\/admin\/operations\/session/);
 assert.match(js,/session\.mfaRequired!==false/);
 assert.match(js,/\/api\/golden-talent\/health/);
 assert.match(js,/data\.readOnly!==true/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/jr:operations-locked/);
 assert.match(js,/workspace\.hidden/);
 assert.match(js,/visibilitychange/);
 assert.doesNotMatch(js,/method:'POST'|localStorage|sessionStorage|innerHTML/);
 const checked=spawnSync(process.execPath,['--check','assets/js/operations-scientific-readiness-v1.js'],{encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
});
