import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('social route is nested after admin role/session/TOTP elevation and has GET-only access',()=>{
  const ops=read('api/operations.php');
  assert.match(ops,/require_once __DIR__\.'\/operations-social\.php';/);
  const roles=ops.indexOf('operationsAdmin($pdo,$account,$configuration)');
  const mfa=ops.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
  const social=ops.indexOf("if ($path === '/admin/operations/social' && $verb === 'GET')");
  assert.ok(roles>=0 && mfa>roles && social>mfa,'Role and MFA must precede social GET');
  assert.equal(ops.includes("'/admin/operations/social' && $verb === 'POST'"),false);
  const dispatch=read('api/index.php');
  assert.match(dispatch,/str_starts_with\(\$path, '\/admin\/operations'\) operationsRoute/);
});
test('collector is bootstrapped, read-only, and never exports credentials or fake results',()=>{
 const php=read('api/operations-social.php');
 assert.match(php,/!defined\('BERTINA_API_BOOTSTRAPPED'\)/);
 assert.match(php,/schema_unavailable/);
 assert.match(php,/enabledForAutomaticPublication'\s*=>false/);
 for(const prohibited of ['access_token','refresh_token','token_secret','totp_secret','private_key'])
   assert.equal(php.includes(prohibited),false,prohibited);
 assert.equal(php.includes('INSERT INTO'),false);
 assert.equal(php.includes('UPDATE social_'),false);
});
test('social readiness appears only within the protected admin workspace, in both locales',()=>{
 for(const file of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(file);
  const root=html.indexOf('id="ops-workspace"');
  const panel=html.indexOf('id="ops-social"');
  assert.ok(root!==-1 && panel>root, file);
  assert.match(html,/id="ops-workspace" hidden/);
  assert.match(html,/id="ops-social-status"/);
  assert.match(html,/operations-social\.js\?v=/);
  assert.match(html,/noindex,nofollow/);
 }
});
test('client never publishes, stores secrets, or reports unavailable data as zero',()=>{
 const js=read('assets/js/operations-social.js');
 assert.match(js,/\/api\/admin\/operations\/social/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/workspace\.hidden/);
 assert.equal(js.includes('localStorage'),false);
 assert.equal(js.includes('innerHTML'),false);
 assert.equal(js.includes("method:'POST'"),false);
 assert.equal(js.includes('providerPostId:'),false);
});
