import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('native JHELA owner queue and screening require protected MFA and CSRF',()=>{
 const php=read('api/operations.php'),native=read('api/jhela-native-editorial.php');
 const auth=php.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const queue=php.indexOf("if ($path === '/admin/operations/jhela/manuscripts' && $verb === 'GET')");
 const screen=php.indexOf("if ($path === '/admin/operations/jhela/manuscripts/screen' && $verb === 'POST')");
 assert.ok(auth>=0&&queue>auth&&screen>queue);
 assert.equal(php.split("if ($path === '/admin/operations/jhela/manuscripts' && $verb === 'GET')").length,2);
 assert.ok(php.slice(screen,screen+1000).includes("'SUPER_ADMIN'"));
 assert.ok(php.slice(screen,screen+1000).includes('operationsMutationAllowed($_SERVER'));
 assert.ok(php.includes('jhelaOwnerManuscripts($pdo)'));
 assert.ok(php.includes('jhelaOwnerScreen($pdo,$accountId,jsonBody())'));
 assert.ok(native.includes('jhelaSchemaReady($pdo)'));
 assert.ok(native.includes('FOR UPDATE'));
 assert.ok(native.includes('jhelaEvent($pdo,$id,$next,$publicMessage)'));
 assert.ok(native.includes('operationsAudit($pdo,$ownerId'));
 assert.ok(native.includes("m['account_id']===$ownerId"));
 assert.ok(!native.includes('m.private_file_rel'));
 assert.ok(!native.includes('SELECT private_file_rel'));
});
test('native preliminary transitions require verified PDF, author-facing reason, and no acceptance',()=>{
 const s=read('api/jhela-native-editorial.php');
 assert.ok(s.includes("['UNDER_SCREENING','NEEDS_INFORMATION']"));
 assert.ok(s.includes("jhelaStr($body['message']??null,20,500"));
 assert.ok(s.includes("manuscript_sha256"));
 assert.ok(s.includes("file_bytes"));
 assert.ok(s.includes("AUTHOR_INFORMATION_RECEIVED"));
 assert.ok(!s.includes("'ACCEPTED'"));
 assert.ok(!s.includes("'PUBLISHED'"));
});
test('exactly one native owner panel and one safe script are present in each admin locale',()=>{
 const js=read('assets/js/operations-jhela-manuscripts.js');
 assert.ok(js.includes('textContent'));
 assert.ok(!js.includes('innerHTML'));
 assert.ok(js.includes('/api/admin/operations/jhela/manuscripts/screen'));
 assert.ok(js.includes('jhela-native-owner-screening-v1'));
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const s=read(p);
  assert.equal((s.match(/data-jhela-manuscript-owner/g)||[]).length,1);
  assert.equal((s.match(/<script src="\/assets\/js\/operations-jhela-manuscripts\.js/g)||[]).length,1);
  assert.ok(s.includes('data-jhela-owner-ms-refresh'));
 }
 for(const p of ['journal/dashboard/index.html','journal/fa/dashboard/index.html'])
  assert.ok(!read(p).includes('operations-jhela-manuscripts.js'));
});
test('isolated operations MySQL fixture includes the native editorial module',()=>{
 assert.ok(read('tests/operations-mysql.php').includes("'jhela-native-editorial.php'"));
});

test('pre-review desk decline requires reason, owner MFA and immutable author-visible event',()=>{
 const s=read('api/jhela-native-editorial.php');
 const start=s.indexOf('function jhelaOwnerScreen(');
 const end=s.indexOf('function jhelaOwnerHostReadiness(');
 const body=s.slice(start,end);
 assert.ok(body.includes("'DESK_DECLINED'"));
 assert.ok(body.includes('desk_decision_reason_required'));
 assert.ok(body.includes("jhelaStr($body['message']??null,40,1000"));
 assert.ok(body.includes("'UNDER_SCREENING'=>['NEEDS_INFORMATION','DESK_DECLINED']"));
 assert.ok(body.includes('jhelaEvent($pdo,$id,$next,$publicMessage)'));
 assert.ok(body.includes('operationsAudit($pdo,$ownerId'));
 assert.ok(!body.includes("'ACCEPTED'"));
 assert.ok(!body.includes("'PUBLISHED'"));
 const js=read('assets/js/operations-jhela-manuscripts.js');
 assert.ok(js.includes("screen(m,'DESK_DECLINED',reason.value)"));
 assert.ok(js.includes("if(m.status==='UNDER_SCREENING')"));
 const author=read('assets/js/jhela-author-workspace.js');
 assert.ok(author.includes('DESK_DECLINED:t('));
});
