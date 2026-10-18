import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('host readiness is read-only and never exposes paths, tokens or manuscript contents',()=>{
 const api=read('api/jhela-native-editorial.php');
 const start=api.indexOf('function jhelaOwnerHostReadiness(');
 assert.ok(start>0);
 const body=api.slice(start);
 for(const key of ['motherDatabase','trustedTls','privateStorageWritable','antivirusExecutable','manuscriptIntakeEnabled'])assert.ok(body.includes("'"+key+"'"));
 assert.ok(body.includes("'antivirusCleanSampleVerified'=>false"));
 assert.ok(body.includes("'endToEndReceiptVerified'=>false"));
 assert.ok(!body.includes("'privateDir'=>"));
 assert.ok(!body.includes("'antivirus'=>"));
 assert.ok(!body.includes("'auth_pepper'=>"));
});
test('only fresh-MFA SUPER_ADMIN may request host readiness',()=>{
 const ops=read('api/operations.php');
 const route=ops.indexOf("if ($path === '/admin/operations/jhela/host-readiness'");
 const fresh=ops.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 assert.ok(route>fresh);
 const slice=ops.slice(route,route+550);
 assert.ok(slice.includes("'SUPER_ADMIN'"));
 assert.ok(slice.includes('rateAllowed'));
 assert.ok(slice.includes('jhelaOwnerHostReadiness($pdo)'));
});
test('bilingual admin panels render only sanitized diagnostic booleans',()=>{
 const js=read('assets/js/operations-jhela-host-readiness.js');
 assert.ok(js.includes('/api/admin/operations/jhela/host-readiness'));
 assert.ok(js.includes('textContent'));
 assert.ok(!js.includes('innerHTML'));
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);
  assert.ok(html.includes('data-jhela-host-readiness'));
  assert.ok(html.includes('operations-jhela-host-readiness.js'));
 }
});
