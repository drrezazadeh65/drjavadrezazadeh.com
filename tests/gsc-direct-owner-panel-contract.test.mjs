import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');

test('both admin languages expose a GSC panel only in the existing protected workspace',()=>{
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);
  const start=html.indexOf('id="ops-workspace" hidden');
  const panel=html.indexOf('id="ops-gsc-direct"');
  assert.ok(start>=0&&panel>start,path);
  assert.match(html, /data-gsc-direct-refresh/);
  assert.match(html, /operations-gsc-direct\.js\?v=20261020-owner-gsc-v3/);
  assert.match(html, /operations-control\.js\?v=/);
  assert.match(html, /id="ops-ai-visibility"/,'original SEO/GEO/AEO panel preserved');
 }
});

test('owner-only server route follows MFA and keeps unknown data explicitly null',()=>{
 const php=read('api/operations.php');
 const mfa=php.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const endpoint=php.indexOf("if ($path === '/admin/operations/gsc-direct' && $verb === 'GET')");
 assert.ok(mfa>=0&&endpoint>mfa,'route must follow session+MFA verification');
 const snippet=php.slice(endpoint,endpoint+850);
 assert.match(snippet,/SUPER_ADMIN/);
 assert.match(snippet,/rateAllowed\(/);
 assert.match(snippet,/gsc_private_snapshot_path/);
 assert.doesNotMatch(snippet,/jsonBody\(|\bPOST\b/);
 const joint=php.indexOf("if ($path === '/admin/operations/search-intelligence' && $verb === 'GET')");
 assert.ok(joint>mfa,'unified route must be MFA-protected');
 assert.match(php.slice(joint,joint+750),/SUPER_ADMIN/);
 const helper=read('api/operations-gsc-direct.php');
 assert.match(helper,/BERTINA_API_BOOTSTRAPPED/);
 assert.match(helper,/provenanceAttested'=>false/);
 assert.match(helper,/apiLiveNow'=>false/);
 assert.match(helper,/realpath\(dirname\(__DIR__\)\)/);
 assert.match(helper,/str_starts_with\(\$real,\$public\.DIRECTORY_SEPARATOR\)/);
});

test('GSC private UI clears data on logout and never sends credentials or talks to Google',()=>{
 const js=read('assets/js/operations-gsc-direct.js');
 assert.match(js,/jr:operations-locked/);
 assert.match(js,/request\.abort\(\)/);
 assert.match(js,/workspace\.hidden/);
 assert.match(js,/results\.replaceChildren\(\)/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/\/api\/admin\/operations\/search-intelligence/);
 assert.match(js,/showGa4\(body\.ga4/);
 for(const forbidden of [/innerHTML/,/localStorage/,/sessionStorage/,/window\.open/,/www\.googleapis\.com/,/searchconsole\.googleapis\.com/])
  assert.doesNotMatch(js,forbidden);
 const result=spawnSync(process.execPath,['--check','assets/js/operations-gsc-direct.js'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
