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
  assert.match(html,/<div id="ops-workspace" hidden>/);
  assert.match(html,/<section id="jr-intelligence"/);
  assert.match(html,/id="ops-author-real-view"/);
  assert.match(html,/id="ops-auth" class="ops-panel ops-auth"/);
  assert.match(html,/id="ops-mfa-form"/);
  assert.match(html,/id="ops-commerce"/);
  assert.match(html,/id="ops-jhela-workstream"/);
  assert.match(html,/<script src="\/assets\/js\/operations-control\.js\?v=/);
  assert.match(html, /\/assets\/css\/operations-workspace-index-v1\.css\?v=20261019-admin-index-v1/);
  assert.match(html, /\/assets\/js\/operations-workspace-index-v1\.js\?v=20261020-admin-index-v3/);
  assert.match(html, /<html lang="(?:fa|en)"/);
  assert.doesNotMatch(html,/data-ops-workspace-index/,'navigation is generated under the original protected shell');
 }
});

test('navigation is a bounded local index, not a parallel administrator or finance API',()=>{
 const count=(script.match(/group:'(?:evidence|planning|commerce|publishing|social|resources)'/g)||[]).length;
 assert.equal(count,21,'bounded existing administrator navigation including independent source review');
 for(const id of ['jr-intelligence','ops-stage7-blueprint','ops-social','ops-social-composer',
  'ops-social-review','ops-social-settings','ops-free-resources','ops-jhela-workstream',
  'ops-commerce','ops-publishing-author-review','ops-organic-growth','ops-revenue-planning','ops-cards',
  'ops-reporting','ops-audit-timeline','ops-ai-visibility','ops-gsc-direct','ops-author-real-view','ops-scientific-readiness']){
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


test('owner MFA lock clears confidential admin DOM and rejects delayed async results',()=>{
 const control=read('assets/js/operations-control.js');
 assert.match(control,/dispatchEvent\(new Event\('jr:operations-locked'\)\)/);
 for(const path of [
  'assets/js/operations-jhela-reviewers.js',
  'assets/js/operations-jhela-manuscripts.js',
  'assets/js/operations-publishing-authors-v1.js'
 ]){
  const source=read(path);
  assert.match(source,/addEventListener\('jr:operations-locked'/,path);
  assert.match(source,/lockEpoch\+\+/,path);
  assert.match(source,/panel\.replaceChildren\(\)|box\.replaceChildren\(\)/,path);
  assert.match(source,/scope\.hidden\|\|epoch!==lockEpoch/,path);
  const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(check.status,0,path+' JS syntax: '+check.stderr);
 }
});


test('JHELA maturity and host readiness purge protected data and reject late MFA responses',()=>{
 const control=read('assets/js/operations-control.js');
 assert.match(control,/dispatchEvent\(new Event\('jr:operations-locked'\)\)/);
 for(const path of ['assets/js/operations-jhela-maturity.js','assets/js/operations-jhela-host-readiness.js']){
  const source=read(path);
  assert.match(source,/addEventListener\('jr:operations-locked'/,path);
  assert.match(source,/lockEpoch\+\+/,path);
  assert.match(source,/workspace\.hidden\|\|epoch!==lockEpoch/,path);
  assert.match(source,/replaceChildren\(\)/,path);
  const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(check.status,0,path+': '+check.stderr);
 }
});


test('report links only navigate into existing privileged panels and never submit actions',()=>{
 const source=read('assets/js/operations-control.js');
 const start=source.indexOf('const operationalWorkspaceByReport=Object.freeze({');
 const end=source.indexOf('function show(',start);
 assert.ok(start>=0&&end>start,'existing operational workspace map');
 const contract=source.slice(start,end);
 for(const id of ['OP-07','OP-08','OP-09','OP-10','OP-11','OP-22','OP-23','OP-24'])
  assert.match(contract,new RegExp("'"+id+"':'ops-commerce'"),id);
 assert.match(contract,/'OP-31':'ops-social'/);
 assert.match(contract,/if\(!snapshot\|\|workspace\.hidden\)return/);
 assert.match(contract,/workspace\.contains\(target\)/);
 assert.doesNotMatch(contract,/fetch\s*\(|XMLHttpRequest|\.submit\s*\(/);
 assert.match(source,/jump\.dataset\.opsWorkspaceJump=workspaceId/);
 assert.match(source,/addEventListener\('click',\(\)=>openExistingOperationalWorkspace\(workspaceId\)\)/);
 const check=spawnSync(process.execPath,['--check','assets/js/operations-control.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('commerce monitor clears separate checkout readiness and cancels pending reads on MFA lock',()=>{
 const source=read('assets/js/operations-commerce.js');
 assert.match(source,/workspace\.addEventListener\('jr:operations-locked'/);
 assert.match(source,/seq\+\+;panel\.open=false;results\.replaceChildren\(\);readiness\.replaceChildren\(\)/);
 assert.match(source,/status\.textContent='';refresh\.disabled=false/);
 const check=spawnSync(process.execPath,['--check','assets/js/operations-commerce.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});


test('both language admin shells use fresh versioned report and commerce scripts',()=>{
 for(const page of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(page);
  assert.match(html,/operations-control\.js\?v=2026102[2-4]-[a-z0-9-]+/);
  assert.match(html,/operations-commerce\.js\?v=20261020-owner-lock-v1/);
  assert.doesNotMatch(html,/operations-commerce\.js\?v=20261017-cpanel-remediation-v9/);
 }
 const audit=read('scripts/donation-cycle-audit.cjs');
 assert.match(audit,/operations-commerce\.js\?v=20261020-owner-lock-v1/);
});
