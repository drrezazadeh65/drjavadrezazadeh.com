import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const php=fs.readFileSync('api/operations.php','utf8');
const js=fs.readFileSync('assets/js/operations-control.js','utf8');
const fa=fs.readFileSync('fa/app/admin/index.html','utf8');
const en=fs.readFileSync('en/account/admin/index.html','utf8');
test('owner MFA lasts a work session rather than expiring during navigation',()=>{
 assert.match(php,/const OPERATIONS_MFA_TTL = 43200;/);
 assert.match(php,/operationsMfaFresh\(\$pdo,\$sessionHash,\$accountId,nowTs\(\),\$credentialHash\)/);
 assert.match(php,/\$now\+OPERATIONS_MFA_TTL/);
 assert.match(php,/operationsTotpCounter/);
 assert.match(php,/mfa_replayed/);
 assert.match(php,/UPDATE customer_auth_sessions SET revoked_at/);
 assert.match(php,/operationsMutationAllowed/);
});
test('switching tabs does not invalidate the owner dashboard or MFA',()=>{
 assert.doesNotMatch(js,/if\(document\.hidden\)lock\(/);
 assert.match(js,/visibilitychange[^;]*\{if\(!document\.hidden\)void load\(\);\}/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/\/session/);
 assert.match(js,/admin_mfa_required/);
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'operations-control.js'}));
});
test('both localized owner panels rely on the same real server MFA session',()=>{
 for(const html of [fa,en]){
  assert.match(html,/\/assets\/js\/operations-control\.js\?v=/);
  assert.match(html,/ops-mfa-form/);
 }
});
