import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('owner only journal endpoint is protected by existing MFA, rate limit and private no-store',()=>{
 const router=read('api/operations.php'),helper=read('api/operations-jhela.php');
 const auth=router.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const journal=router.indexOf("if ($path === '/admin/operations/jhela/maturity'");
 assert.ok(auth>=0&&journal>auth);
 assert.ok(router.slice(journal,journal+400).includes("rateAllowed($pdo,'operations_jhela_maturity_read'"));
 assert.ok(router.includes("require_once __DIR__.'/operations-jhela.php';"));
 assert.ok(router.includes("header('Cache-Control: no-store, private, max-age=0')"));
 assert.match(helper,/if \(!defined\('BERTINA_API_BOOTSTRAPPED'\)\)/);
 assert.match(helper,/__DIR__\.'\/internal'/);
 assert.match(helper,/PHP_SAPI === 'cli'/);
 assert.ok(!/exec\s*\(|curl_exec|shell_exec/.test(helper));
});
test('JHELA source projection strips sensitive evidence and proprietary server records',()=>{
 const builder=read('scripts/build-public-site.mjs');
 const start=builder.indexOf('const journalProjectionDefinitions='),end=builder.indexOf('const failures=[];',start);
 assert.ok(start>0&&end>start);
 const projection=builder.slice(start,end);
 assert.match(projection,/api','internal/);
 assert.match(projection,/stageRecords\\.map\\(p=>\\(\\{id:p\\.id,status:p\\.status,claimsAllowed:p\\.claimsAllowed,evidence:\\[\\]\\}\\)\\)/);
 assert.match(projection,/no.*static public-package projection/);
 const deny=read('api/internal/.htaccess');
 assert.match(deny,/Require all denied/);
 const platform=JSON.parse(read('platform/jhela-gate-evidence-ledger-v1.json'));
 assert.ok(platform.stageRecords.every(s=>s.status==='UNVERIFIED'&&s.evidence.length===0));
});
test('journal owner status controls are bilingual, limited to MFA workspace and do not cache or fabricate outcomes',()=>{
 const js=read('assets/js/operations-jhela-maturity.js');
 assert.match(js,/workspace\\.contains\\(shell\\)/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/cache:'no-store'/);
 assert.match(js,/scientificMilestones\\.length!==10/);
 assert.match(js,/verifiedIndexClaims\\?\\.length!==0/);
 for(const forbidden of ['localStorage','sessionStorage','innerHTML','manuscriptBody','reviewerEmail']) assert.ok(!js.includes(forbidden));
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  assert.ok(html.includes('id="ops-jhela-maturity"'));
  assert.ok(html.indexOf('id="ops-jhela-maturity"')>html.indexOf('<div id="ops-workspace" hidden>'));
  assert.ok(html.includes('data-jhela-maturity-refresh'));
  assert.ok(html.includes('data-jhela-maturity-results'));
  assert.ok(html.includes('/assets/js/operations-jhela-maturity.js'));
 }
});
