/* JHELA founding-intake source security and bilingual customer experience gate.
 * No migration is executed; no private manuscript or account data is used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const php=read('api/jhela-intake.php');
const api=read('api/index.php');
const owner=read('api/operations.php');
const sql=read('database/unified/004c_jhela_founding_intake.sql');
const js=read('assets/js/jhela-author-workspace.js');
test('first-party intake endpoints are connected to existing verified email-session system',()=>{
 assert.ok(api.includes("require_once __DIR__.'/jhela-intake.php';"));
 assert.ok(api.includes("jhelaIntakeRoute($path, $verb);"));
 assert.ok(api.indexOf("jhelaIntakeRoute($path, $verb)")>api.indexOf("$path=route();$verb=method();"));
 assert.ok(php.includes('sessionAccount($pdo)'));
 assert.ok(php.includes("empty($a['email_verified_at'])"));
 assert.ok(php.includes("($a['status']??'')!=='active'"));
 assert.ok(php.includes("($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN"));
 assert.ok(php.includes("rateAllowed($pdo,'jhela_'.$path,$accountId,14,900)"));
 for(const endpoint of ['intake/health','reviewers','workspace','profile','reviewer/apply','manuscripts/create','manuscripts/upload'])
   assert.ok(php.includes("'/journal/"+endpoint+"'"),'route missing '+endpoint);
});
test('private JHELA workspace is unavailable until trusted TLS and schema readiness are confirmed',()=>{
 const method=php.slice(php.indexOf('function jhelaIntakeRoute('));
 const readiness=method.indexOf('$ready=jhelaReadiness($pdo);');
 const workspace=method.indexOf("if($path==='/journal/workspace'&&$verb==='GET'){");
 const guarded=method.indexOf("if(!$ready['profile'])fail('journal_profile_unavailable',503);",workspace);
 const response=method.indexOf('jhelaPrivateHome($pdo,$a);',workspace);
 assert.ok(readiness>=0&&readiness<workspace,'readiness must precede private workspace route');
 assert.ok(workspace>=0&&guarded>workspace&&guarded<response,'workspace response requires readiness guard');
 assert.ok(php.includes("'trustedTLS'=>($site['public_tls_confirmed']??false)===true"));
});
test('manuscript PDFs have isolated storage, content verification, AV, private checksum and ownership',()=>{
 for(const check of ["getenv('JR_JHELA_INTAKE_ENABLED')","getenv('JR_JHELA_PRIVATE_STORAGE')","getenv('JR_JHELA_AV_BINARY')",
 'realpath($raw)','is_uploaded_file','move_uploaded_file',"new finfo(FILEINFO_MIME_TYPE)","'%PDF-'","'sha256'",
 'proc_open(','@chmod($target,0600)','@unlink($target)','AND account_id=?',
 'PRELIMINARY_RECEIVED',"status='AWAITING_FILE'"])
  assert.ok(php.includes(check),'secure file invariant missing '+check);
 assert.ok(php.includes('public_tls_confirmed'));
 assert.ok(!php.includes('file_get_contents($_FILES'));
 assert.ok(!php.includes('mkdir('),'storage is provisioned by trusted operator, never by upload request');
});
test('academic public reviewer directory requires independent approval and explicit opt-in',()=>{
 assert.ok(php.includes("status='APPROVED' AND profile_public_consent=1 AND privacy_consent=1"));
 assert.ok(php.includes('approved_at IS NOT NULL AND approved_by IS NOT NULL'));
 assert.ok(php.includes("status='PENDING',"));
 assert.ok(php.includes("approved_at=NULL,approved_by=NULL"));
 assert.ok(owner.includes("'/admin/operations/jhela/reviewers'"));
 assert.ok(owner.includes("'/admin/operations/jhela/reviewers/decision'"));
 assert.ok(owner.includes('operationsMutationAllowed('));
 assert.ok(owner.includes("if (!$fresh) fail('admin_mfa_required',403)"));
 assert.ok(owner.includes("jhela_reviewer_'.strtolower($decision)"));
 assert.ok(owner.includes("SELECT account_id,privacy_consent,status FROM jhela_reviewer_candidates WHERE id=? FOR UPDATE"));
});
test('author payment status is a read-only sourced state, never a fictional payment gateway',()=>{
 assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS jhela_finance_records'));
 assert.ok(php.includes("state'=>'NOT_INVOICED'"));
 assert.ok(php.includes("'onlinePaymentsEnabled'=>false"));
 assert.ok(php.includes("'apcPayableBeforeAcceptance'=>false"));
 assert.ok(php.includes("'submissionFeeCHF'=>0"));
 assert.ok(!/paymentUrl|gatewayPost|bitpay/i.test(php));
 assert.ok(!/api\/commerce\/create|fetch\(['"]https?:/.test(js));
});
test('all journal applicant data stores have constrained account ownership and workflow history',()=>{
 for(const table of ['jhela_author_profiles','jhela_intake_manuscripts','jhela_intake_events','jhela_reviewer_candidates','jhela_finance_records'])
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS '+table));
 assert.ok(sql.includes('FOREIGN KEY(account_id) REFERENCES customer_accounts(id)'));
 assert.ok(sql.includes('manuscript_sha256 CHAR(64)'));
 assert.ok(sql.includes('ojs_external_id VARCHAR(100)'),'legacy DB column remains for backward-compatible historical records');
 assert.ok(php.includes("WHERE account_id=? ORDER BY created_at DESC LIMIT 100"));
 assert.ok(php.includes("SELECT event_kind,public_message,created_at"));
 assert.ok(!js.includes('innerHTML')&&!js.includes('localStorage')&&!js.includes('sessionStorage'));
 assert.ok(!/ojs|open journal systems/i.test(php),'native API must not expose retired platform terminology');
});
test('public bilingual inaugural call and academic reviewer/author workspaces are semantically ready',()=>{
 for(const [p,language] of [['journal/submission/index.html','en'],['journal/fa/submission/index.html','fa'],
 ['journal/reviewer-registration/index.html','en'],['journal/fa/reviewer-registration/index.html','fa']]){
  const html=read(p);
  assert.ok(html.includes('data-jhela-workspace'),p);
  assert.ok(html.includes('jhela-author-workspace.js'),p);
  assert.ok(html.includes('jhela-intake.css'),p);
  assert.ok(html.includes('data-jhela-private'),p);
  assert.ok(html.includes('data-jhela-signin'),p);
  assert.ok(html.includes('name="robots" content="noindex')||html.includes('name="robots" content="index'));
  assert.ok(html.includes(language==='fa'?'lang="fa" dir="rtl"':'lang="en"'));
 }
 for(const p of ['journal/submission/index.html','journal/fa/submission/index.html']){
  const html=read(p);
  assert.ok(html.includes('data-jhela-article-form'));
  assert.ok(html.includes('data-jhela-articles'));
  assert.ok(html.includes('data-jhela-profile'));
  assert.ok(html.includes('data-jhela-not-ready'));
  assert.ok(html.includes('name="originalityConfirmed"'));
 }
 for(const p of ['journal/reviewer-registration/index.html','journal/fa/reviewer-registration/index.html']){
  const html=read(p);
  assert.ok(html.includes('data-jhela-review-form'));
  assert.ok(html.includes('name="publicProfileConsent"'));
  assert.ok(html.includes('name="privacyConsent"'));
  assert.ok(html.includes('data-jhela-directory'));
 }
});
test('academic owner UI remains inside separate protected MFA workspace',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  const access=html.indexOf('id="ops-workspace" hidden');
  const section=html.indexOf('data-jhela-reviewer-owner');
  assert.ok(access>=0&&section>access);
  assert.ok(html.includes('operations-jhela-reviewers.js'));
 }
 const client=read('assets/js/operations-jhela-reviewers.js');
 assert.ok(client.includes("'/api/admin/operations/session'"));
 assert.ok(client.includes("'/api/admin/operations/jhela/reviewers/decision'"));
 assert.ok(client.includes("'X-CSRF-Token':csrf"));
 assert.ok(!client.includes('innerHTML'));
});

// Later explicit owner authorization replaces the historical calendar pause.
test('native manuscript intake is authorised but fails closed without explicit host readiness',()=>{
 assert.ok(!php.includes('JHELA_MANUSCRIPT_SUBMISSIONS_SUSPENDED'));
 assert.ok(php.includes("'manuscriptIntake'=>$upload&&$c['intake']"));
 const route=php.slice(php.indexOf('function jhelaIntakeRoute('));
 assert.ok(route.includes("!jhelaConfig()['intake']"));
 assert.ok(php.includes("$site=cfg();"));
 assert.ok(php.includes("$site['jhela_intake_enabled']"));
 assert.ok(php.includes("$site['jhela_private_storage']"));
 assert.ok(route.includes("fail('manuscript_intake_disabled',503);"));
 assert.ok(route.indexOf("fail('manuscript_intake_disabled',503);")<route.indexOf('$pdo=db();'));
 assert.ok(route.includes("if(!$ready['manuscriptIntake'])fail('manuscript_intake_not_ready',503);"));
 assert.ok(route.includes("if(!$ready['reviewerIntake'])fail('reviewer_intake_not_ready',503);"));
 assert.ok(!js.includes('manuscriptSubmissionsPaused=true'));
 assert.ok(js.includes('manuscriptIntakeReady=h.manuscriptIntake===true;'));
 assert.ok(read('journal/submission/index.html').includes('Submission availability is verified in real time'));
 assert.ok(read('journal/fa/submission/index.html').includes('وضعیت دریافت امن مقاله به‌صورت زنده بررسی می‌شود'));
});
