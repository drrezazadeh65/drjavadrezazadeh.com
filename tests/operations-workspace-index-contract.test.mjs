import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const script=read('assets/js/operations-workspace-index-v1.js');
const css=read('assets/css/operations-workspace-index-v1.css');

test('existing authenticated operational workflows stay private and unchanged',()=>{
 for(const [lang,path] of [
  ['fa','fa/app/admin/index.html'],
  ['en','en/account/admin/index.html']
 ]){
  const html=read(path);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/<div id="ops-workspace" hidden><section id="jr-intelligence"/);
  assert.match(html,/id="ops-auth" class="ops-panel ops-auth"/);
  assert.match(html,/id="ops-mfa-form"/);
  assert.match(html,/id="ops-commerce"/);
  assert.match(html,/id="ops-jhela-workstream"/);
  assert.match(html,/<script src="\/assets\/js\/operations-control\.js\?v=/);
  assert.match(html, /\/assets\/css\/operations-workspace-index-v1\.css\?v=20261019-admin-index-v1/);
  assert.match(html, /\/assets\/js\/operations-workspace-index-v1\.js\?v=20261019-admin-index-v1/);
  assert.match(html, /<html lang="(?:fa|en)"/);
  assert.doesNotMatch(html,/data-ops-workspace-index/,'navigation is generated under the original protected shell');
 }
});

test('navigation is a bounded local index, not a parallel administrator or finance API',()=>{
 const count=(script.match(/group:'(?:evidence|planning|commerce|publishing|social|resources)'/g)||[]).length;
 assert.equal(count,15,'explicit bounded list of existing admin sections, including late-rendered reports');
 for(const id of ['jr-intelligence','ops-stage7-blueprint','ops-social','ops-social-composer',
  'ops-social-review','ops-social-settings','ops-free-resources','ops-jhela-workstream',
  'ops-commerce','ops-publishing-author-review','ops-organic-growth','ops-revenue-planning','ops-cards',
  'ops-reporting','ops-audit-timeline']){
  assert.ok(script.includes("id:'"+id+"'"),id);
 }
 assert.match(script,/workspace\.prepend\(nav\)/);
 assert.match(script,/function indexedItems\(\)\{return groups\.map\(entry=>\{/);
 assert.match(script,/const items=indexedItems\(\)/);
 assert.match(script,/if\(workspace.hidden\)return;/);
 assert.match(script,/observer\.observe\(workspace,\{attributes:true,attributeFilter:\['hidden'\]\}\)/);
 assert.match(script,/if\(x\.target\.matches\('details'\)\)x\.target\.open=true/);
 assert.match(script,/focusTarget\(x\.target\)/);
 for(const dangerous of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\blocalStorage\b/,/\bsessionStorage\b/,
   /\bsendBeacon\b/,/\bwindow\.location\.assign\s*\(/,/\bdocument\.cookie\b/,/admin_role\s*=/]){
  assert.doesNotMatch(script,dangerous);
 }
 const check=spawnSync(process.execPath,['--check','assets/js/operations-workspace-index-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('premium, accessible and mobile-first shell is constrained to the private dashboard',()=>{
 assert.match(css,/\.ops #ops-workspace \.ops-workspace-index/);
 assert.match(css,/max-height:min\(72dvh,690px\)/);
 assert.match(css,/@media\(max-width:750px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /:focus-visible/);
 assert.match(css, /@media print/);
 assert.match(css, /min-height:48px/);
 assert.match(css,/--wi-gold:#d4af37/);
});
