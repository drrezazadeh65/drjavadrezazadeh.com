import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const api=read('api/index.php');
const lead=read('api/growth-stage14.php');
const sql=read('docs/BERTINA_ORGANIC_GROWTH_SCHEMA.sql');
const admin=read('api/operations.php');
const js=read('assets/js/consented-lead-intake.js');
const html=read('fa/darkhast-moshavere/index.html');
const reportJs=read('assets/js/operations-growth.js');
test('direct include and unauthenticated intake remain denied',()=>{
 assert.match(lead,/!defined\('BERTINA_API_BOOTSTRAPPED'\)/);
 assert.match(lead,/sessionAccount\(\$pdo\)/);
 assert.match(lead,/email_verified_at/);
 assert.match(lead,/\('verified_login_required',401\)/);
 assert.match(api,/require_once __DIR__\.'\/growth-stage14.php'/);
});
test('consent is explicit, scoped, versioned, auditable and withdrawable',()=>{
 assert.match(lead,/consentGiven'\]\?\?null\)!==true/);
 assert.match(lead,/CONSULTATION_CONTACT/);
 assert.match(lead,/stage14-consultation-v1/);
 assert.match(lead,/growth_lead_consent_events/);
 assert.match(lead,/\/growth\/leads\/withdraw/);
 assert.match(lead,/AND account_id=\? FOR UPDATE/);
 assert.match(lead,/marketing_opt_in_is_separate/);
});
test('transport forbids cross-site writes and no student data is collected',()=>{
 assert.match(lead,/requirePostOrigin\(\)/);
 assert.match(lead,/HTTP_SEC_FETCH_SITE/);
 assert.match(lead,/rateAllowed\(/);
 for (const column of ['email','phone','student_name','assessment_response','payment_reference','document']) {
   assert.ok(!new RegExp('^\\s*'+column+'\\s', 'mi').test(sql),column+' must not be stored in the lead record');
 }
 assert.match(sql,/account_id/);
 assert.match(sql,/UNIQUE KEY uq_growth_lead_account_service_month/);
 assert.match(sql,/expires_at/);
});
test('first-party form retains fallback and does not collect PII',()=>{
 assert.match(html,/data-stage14-consent-lead/);
 assert.match(html,/mailto:/);
 assert.match(html,/noindex,follow,noarchive/);
 assert.match(js,/\/api\/growth\/leads/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/consentGiven:true/);
 assert.match(js,/marketingOptIn:false/);
 assert.match(js,/\/api\/growth\/leads\/withdraw/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|sendBeacon|indexedDB/);
 assert.doesNotMatch(html,/data-stage14-consent-lead[^>]*action=/);
});
test('MFA is required before admin growth route or metrics',()=>{
 const fresh=admin.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const growth=admin.indexOf("'/admin/operations/growth'");
 assert.ok(fresh>=0&&growth>fresh);
 assert.match(admin,/stage14AdminGrowthSnapshot\(\$pdo\)/);
 assert.match(lead,/netSettledToman'=>null/);
 assert.match(lead,/UNVERIFIED_BANK_SETTLEMENT_COVERAGE/);
 assert.match(reportJs,/data-ops-growth-refresh/);
 assert.match(reportJs,/credentials:'same-origin'/);
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
   const source=read(p);
   assert.ok(source.indexOf('data-ops-growth-refresh')>source.indexOf('id="ops-workspace"'));
   assert.match(source,/noindex,nofollow,noarchive/);
 }
});
test('retention job is CLI only, dry run by default and off unless approved',()=>{
 const script=read('scripts/stage14-lead-retention.php');
 assert.match(script,/PHP_SAPI !== 'cli'/);
 assert.match(script,/JR_STAGE14_RETENTION_ENABLED/);
 assert.match(script,/in_array\('--purge'/);
 assert.match(script,/stage14_retention_dry_run/);
 assert.match(script,/DELETE FROM growth_lead_requests/);
});

test('public aggregate health reports non-personal capability and guest is denied before optional consent schema checks',()=>{
 assert.match(lead,/\$path==='\/growth\/health' && \$verb==='GET'/);
 assert.match(lead,/service'=>'consultation_interest'/);
 assert.match(lead,/paymentOrBookingImplied'=>false/);
 assert.match(lead,/consentSchema'=>\$schema/);
 const start=lead.indexOf('function stage14LeadRoute(');
 const scope=lead.slice(start,lead.indexOf('if ($path===\'/growth/leads/mine\'',start));
 assert.ok(scope.indexOf('$account=stage14LeadAccount($pdo)')>0);
 assert.ok(scope.indexOf('$account=stage14LeadAccount($pdo)')<scope.lastIndexOf('if (!stage14LeadSchemaReady($pdo))'));
 assert.doesNotMatch(scope,/password|customer_email|raw_token/);
});
