import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=file=>fs.readFileSync(file,'utf8');
const api=read('api/operations.php');
const publishing=read('api/publishing.php');
const client=read('assets/js/operations-author-real-view-v1.js');

test('admin author viewer reuses real author projection without a second finance calculation',()=>{
 assert.match(publishing,/function jrPublishingAuthorDashboardProjection\(PDO \$pdo,array \$rows\): array/);
 assert.match(publishing,/\$out=jrPublishingAuthorDashboardProjection\(\$pdo,\$rows\)/);
 assert.match(api,/jrPublishingAuthorDashboardProjection\(\$pdo,\[\$target\]\)/);
 for(const evidence of ['publishing_sale_allocation_entries','commerce_payment_claims',
  'publishing_author_settlements','publishing_author_contracts',
  'publishing_notification_outbox','commerce_refund_requests'])
  assert.ok(publishing.includes(evidence),'canonical projection missing '+evidence);
});

test('owner role and fresh MFA precede every real author data route',()=>{
 const account=api.indexOf('$account = sessionAccount($pdo)');
 const membership=api.indexOf('operationsAdmin($pdo,$account,$configuration)');
 const mfa=api.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const endpoint=api.indexOf("if ($path === '/admin/operations/author-view' && $verb === 'GET')");
 assert.ok(account>=0&&membership>account&&mfa>membership&&endpoint>mfa);
 const segment=api.slice(endpoint,endpoint+3600);
 assert.match(segment,/'SUPER_ADMIN'/);
 assert.match(segment,/jrPublishingSchemaReady\(\$pdo\)/);
 assert.match(segment,/rateAllowed\(\$pdo,'operations_author_real_view'/);
 assert.match(segment,/validUuid\(\$authorId\)/);
 assert.match(segment,/publishing_author_accounts/);
 assert.match(segment,/l\.approved_at IS NOT NULL AND l\.revoked_at IS NULL/);
 assert.match(segment,/ca\.status='active' AND ca\.email_verified_at IS NOT NULL/);
 assert.match(segment,/\$pdo->prepare\(\$authorSql\." AND a\.id=\? LIMIT 1"\)/);
 assert.match(segment,/operationsAudit\(\$pdo,\$accountId,'author_view_open'/);
 assert.match(segment,/impersonation'=>false/);
 assert.match(segment,/roleMutation'=>false/);
 assert.match(segment,/readOnly'=>true/);
 assert.doesNotMatch(segment,/password_hash|totp_secret|email_address|provider_trans_id/);
});

test('both localized admin shells keep existing MFA gate and live author projection private',()=>{
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);
  assert.match(html,/id="ops-workspace" hidden/);
  assert.match(html,/id="ops-author-dashboard-preview"/);
  assert.match(html,/id="ops-author-real-view"/);
  assert.match(html,/data-real-author-picker hidden/);
  assert.match(html,/data-real-author-content hidden/);
  assert.match(html,/operations-author-real-view-v1\.js/);
  assert.match(html,/operations-author-real-view-v1\.css/);
  assert.match(html,/noindex,nofollow,noarchive/);
 }
 const build=read('scripts/build-public-site.mjs');
 assert.match(build,/assets\/js\/operations-author-real-view-v1\.js/);
 assert.match(build,/assets\/css\/operations-author-real-view-v1\.css/);
});

test('private browser view is read-only, clears on lock/MFA timeout/tab hiding and does not persist data',()=>{
 for(const feature of [
  "/api/admin/operations/session","/api/admin/operations/author-view",
  "jr:operations-locked","workspace.hidden","mfaRequired!==false",
  "mfaExpiresIn","visibilitychange","pagehide","MutationObserver",
  "cache:'no-store'","credentials:'same-origin'","role','tablist",
  "readOnly!==true","impersonation!==false","mount.replaceChildren()"
 ]) assert.ok(client.includes(feature),'missing '+feature);
 assert.doesNotMatch(client,/\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest)\b/);
 assert.doesNotMatch(client,/method:'POST'|method:'PUT'|method:'PATCH'|method:'DELETE'/);
 assert.doesNotMatch(client,/\/api\/publishing\/author\/overview/);
 assert.doesNotMatch(client,/\binnerHTML\s*=/);
 const cmd=spawnSync(process.execPath,['--check','assets/js/operations-author-real-view-v1.js'],{encoding:'utf8'});
 assert.equal(cmd.status,0,cmd.stderr);
 const css=read('assets/css/operations-author-real-view-v1.css');
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
});
