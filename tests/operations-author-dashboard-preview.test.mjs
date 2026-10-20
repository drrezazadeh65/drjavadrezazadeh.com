import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(path.resolve(process.cwd(),p),'utf8');

test('both administrator shells expose a dedicated author dashboard preview deep link',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  assert.match(html,/id="ops-workspace" hidden/);
  assert.match(html,/id="ops-author-dashboard-preview"/);
  assert.match(html,/href="#ops-author-dashboard-preview"/);
  assert.match(html,/data-author-design-content hidden/);
  assert.match(html,/operations-author-dashboard-preview-v1\.js/);
  assert.match(html,/operations-author-dashboard-preview-v1\.css/);
  assert.match(html,/noindex,nofollow/);
 }
});

test('preview is strictly MFA-gated and makes no author-role or payment changes',()=>{
 const js=read('assets/js/operations-author-dashboard-preview-v1.js');
 assert.match(js,/workspace\.hidden/);
 assert.match(js,/\/api\/admin\/operations\/session/);
 assert.match(js,/result\.mfaRequired===true/);
 assert.match(js,/jr:operations-locked/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/role','tablist/);
 assert.match(js,/href=|\.href=/);
 assert.doesNotMatch(js,/\/api\/publishing\/author\/overview/);
 assert.doesNotMatch(js,/\/api\/commerce\/create/);
 assert.doesNotMatch(js,/fetch\([^)]*method:'POST'/);
 assert.doesNotMatch(js,/localStorage|sessionStorage/);
});

test('visual-only financial cards display placeholders rather than fictitious order totals',()=>{
 const js=read('assets/js/operations-author-dashboard-preview-v1.js');
 assert.match(js,/Financial values show dashes/);
 assert.match(js,/Verified purchases/);
 assert.match(js,/settlement/i);
 assert.match(js,/no actual financial data loaded/);
 const css=read('assets/css/operations-author-dashboard-preview-v1.css');
 assert.match(css,/\.jr-ap-grid/);
 assert.match(css,/@media\(max-width:480px\)/);
});

test('admin quick index and deployment include the preview',()=>{
 assert.match(read('assets/js/operations-workspace-index-v1.js'),/ops-author-dashboard-preview/);
 const build=read('scripts/build-public-site.mjs');
 assert.match(build,/assets\/js\/operations-author-dashboard-preview-v1\.js/);
 assert.match(build,/assets\/css\/operations-author-dashboard-preview-v1\.css/);
});
