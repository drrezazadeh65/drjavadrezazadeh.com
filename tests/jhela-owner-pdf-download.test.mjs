import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const native=read('api/jhela-native-editorial.php');
const ops=read('api/operations.php');
const js=read('assets/js/operations-jhela-manuscripts.js');
test('owner-only confidential PDF is guarded by fresh MFA and super-admin membership',()=>{
 const fresh=ops.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const route=ops.indexOf("if ($path === '/admin/operations/jhela/manuscripts/file' && $verb === 'GET')");
 assert.ok(fresh>=0&&route>fresh);
 assert.ok(ops.slice(route,route+500).includes("'SUPER_ADMIN'"));
 assert.ok(ops.slice(route,route+500).includes('rateAllowed('));
 assert.ok(ops.includes('jhelaOwnerDownload($pdo,'));
 assert.ok(native.includes("jhelaOwnerFilePermission($pdo)"));
 assert.ok(native.includes("jhelaPrivateRoot(jhelaConfig()['privateDir'])"));
 assert.ok(js.includes("canDownloadFiles=d.canDownloadFiles===true"));
});
test('download never trusts author filename or exposes private paths',()=>{
 for(const check of ['jhelaPrivateRoot(', 'realpath($path)!==$path','is_link($path)',
 "hash_file('sha256',$path)",'hash_equals($hash,$actual)',
 "preg_match('/^[a-f0-9]{48}",".pdf$/D',$rel)",'filesize($path)!==$bytes',
 "header('Content-Disposition: attachment;",'X-Content-Type-Options: nosniff',
 "header('Cache-Control: no-store","operationsAudit($pdo,"])
  assert.ok(native.includes(check),'missing download guard: '+check);
 assert.ok(!js.includes('private_file_rel'));
 assert.ok(!js.includes('original_filename'));
 assert.ok(js.includes("encodeURIComponent(m.id)"));
});
