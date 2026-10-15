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

test('service sales follow-up is consented, bounded and never presented as settled revenue',()=>{
 assert.match(lead,/serviceSalesPipeline'=>\$pipeline/);
 assert.match(lead,/consent_withdrawn_at IS NULL/);
 assert.match(lead,/expires_at>\?/);
 assert.match(lead,/state IN \('NEW','NEEDS_INFO'\)/);
 assert.match(lead,/awaitingOver24Hours/);
 assert.match(lead,/awaitingOver72Hours/);
 assert.match(lead,/needsAdditionalInformation/);
 assert.match(lead,/GROUP BY service_id/);
 assert.match(lead,/LIMIT 7/);
 assert.match(lead,/array_slice\(\$serviceRows,0,6\)/);
 assert.match(lead,/topServiceQueuesTruncated/);
 assert.match(lead,/\$counts=null;\$pipeline=null;\$leadSource='UNAVAILABLE'/);
 assert.match(lead,/netSettledToman'=>null/);
 assert.match(reportJs,/serviceSalesPipeline/);
 assert.match(reportJs,/awaitingOver24Hours/);
 assert.match(reportJs,/awaitingOver72Hours/);
 assert.match(reportJs,/document\.createElement\('details'\)/);
 assert.match(reportJs,/textContent=String\(item\.serviceId/);
 assert.match(reportJs,/requestGeneration/);
 assert.match(reportJs,/workspace\?\.hidden/);
 assert.doesNotMatch(reportJs,/localStorage|sessionStorage|innerHTML/);
});


test('bilingual consultation pages share the verified-account consent pathway without activating payments',()=>{
 const english=read('en/request-consultation/index.html');
 for(const source of [html,english]){
   assert.match(source,/data-stage14-consent-lead/);
   assert.match(source,/name="serviceId" required disabled/);
   assert.match(source,/name="consentGiven" required/);
   assert.match(source,/data-stage14-lead-mine/);
   assert.match(source,/data-stage14-lead-list/);
   assert.match(source,/\/assets\/js\/consented-lead-intake\.js/);
   assert.match(source,/noindex,follow,noarchive/);
   assert.match(source,/mailto:/);
   assert.doesNotMatch(source,/data-stage14-consent-lead[^>]*action=/);
 }
 assert.match(english,/href="\/privacy\/"/);
 assert.match(english,/href="\.\.\/login\/"/);
 assert.match(js,/const fa=document\.documentElement\.lang==='fa'/);
 assert.match(js,/service-descriptions-en\.json/);
 assert.match(js,/const titleFor=service=>fa\?service\.title_fa:englishServices/);
 assert.match(js,/consent\.checked=false/);
 assert.match(js,/data-stage14-service-summary/);
 assert.match(js,/The server received your consented enquiry/);
 assert.match(js,/The server did not confirm the request/);
 assert.match(js,/marketingOptIn:false/);
 assert.match(js,/\/api\/growth\/leads\/mine/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|sendBeacon|indexedDB|innerHTML/);
 const catalog=JSON.parse(read('assets/data/service-catalog.json'));
 const translation=JSON.parse(read('assets/data/service-descriptions-en.json'));
 assert.equal(translation.language,'en');
 assert.deepEqual(Object.keys(translation.services).sort(),
   catalog.services.map(service=>service.id).sort());
 for(const service of catalog.services.filter(s=>s.sellable===true)){
   for(const field of ['title','fit','outcome','boundary']){
     assert.ok(typeof translation.services[service.id]?.[field]==='string'&&
       translation.services[service.id][field].trim(),
       service.id+' needs official English '+field);
   }
 }
});


test('owner-only consented lead triage is MFA/CSRF protected and cannot manufacture sales',()=>{
 const operations=read('api/operations.php');
 const client=read('assets/js/operations-growth.js');
 assert.match(lead,/function stage14AdminLeadWorklist\(PDO \$pdo, \?string \$cursor=null\)/);
 assert.match(lead,/function stage14AdminLeadTransition\(PDO \$pdo/);
 assert.match(lead,/a\.email_normalized AS contact_email/);
 assert.match(lead,/l\.consent_withdrawn_at IS NULL/);
 assert.match(lead,/l\.expires_at>\?/);
 assert.match(lead,/a\.email_verified_at IS NOT NULL/);
 assert.match(lead,/a\.status='active'/);
 assert.match(lead,/ORDER BY l\.created_at ASC,l\.id ASC LIMIT 21/);
 assert.match(lead,/state IN \('NEW','NEEDS_INFO','QUALIFIED'\)/);
 assert.match(lead,/FOR UPDATE/);
 assert.match(lead,/operationsAudit\(\$pdo,\$actorId,'growth_lead_state_changed'/);
 assert.match(lead,/lead_stale_or_not_consenting/);
 assert.match(lead,/expectedState/);
 assert.doesNotMatch(lead,/mark_as_paid|gatewayCharge|sendMarketingEmail/);
 const protect=operations.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const worklist=operations.indexOf("'/admin/operations/growth/leads'");
 const transition=operations.indexOf("'/admin/operations/growth/leads/transition'");
 assert.ok(protect>=0&&worklist>protect&&transition>worklist);
 const scoped=operations.slice(worklist-60,transition+1550);
 assert.match(scoped,/SUPER_ADMIN/);
 assert.match(scoped,/operationsMutationAllowed\(/);
 assert.match(scoped,/rateAllowed\(/);
 assert.match(scoped,/csrf_forbidden/);
 assert.match(client,/stage14-owner-lead-worklist-v1/);
 assert.match(client,/stage14-lead-transition-v1/);
 assert.match(client,/\/api\/admin\/operations\/session/);
 assert.match(client,/X-CSRF-Token/);
 assert.match(client,/email-draft|mailto:/i);
 assert.match(client,/MutationObserver/);
 assert.match(client,/leadList\.replaceChildren\(\)/);
 assert.match(client,/document\.hidden/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|sendBeacon|innerHTML/);
 assert.match(client,/No email, booking or payment/);
});


test('worklist pagination keeps every consenting lead reachable without weakening MFA or exposing contact in cursors',()=>{
 const operations=read('api/operations.php');
 const ui=read('assets/js/operations-growth.js');
 const mysql=read('tests/stage14-lead-triage-mysql.php');
 assert.match(lead,/function stage14AdminLeadWorklist\(PDO \$pdo, \?string \$cursor=null\)/);
 assert.match(lead,/l\.created_at>\? OR \(l\.created_at=\? AND l\.id>\?\)/);
 assert.match(lead,/ORDER BY l\.created_at ASC,l\.id ASC LIMIT 21/);
 assert.match(lead,/\$hasMore=count\(\$rows\)>20/);
 assert.match(lead,/nextCursor/);
 assert.match(lead,/validUuid\(\$parts\[2\]\)/);
 assert.match(operations,/\$_GET\['cursor'\]\?\?null/);
 assert.match(operations,/invalid_lead_cursor/);
 assert.match(ui,/encodeURIComponent\(cursor\)/);
 assert.match(ui,/moreLeads\.addEventListener/);
 assert.match(ui,/leadCursor=null/);
 assert.match(ui,/if\(error\.message==='OWNER_MFA'\)/);
 assert.match(ui,/clearSensitive\(\)/);
 assert.match(mysql,/for\(\$i=0;\$i<25;\$i\+\+\)/);
 assert.match(mysql,/count\(\$seen\)===27/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|sendBeacon|innerHTML/);
});


test('customer-owned lead history is keyset paginated so consent withdrawal remains reachable',()=>{
 const dashboard=read('assets/js/customer-consultation-leads.js');
 assert.match(lead,/\$cursor=\$_GET\['cursor'\]\?\?null/);
 assert.match(lead,/fail\('invalid_lead_cursor',400\)/);
 assert.match(lead,/validUuid\(\$parts\[2\]\)/);
 assert.match(lead,/account_id=\? AND expires_at>\?/);
 assert.match(lead,/created_at<\? OR \(created_at=\? AND id<\?\)/);
 assert.match(lead,/ORDER BY created_at DESC,id DESC LIMIT 21/);
 assert.match(lead,/\$more=count\(\$rows\)>20/);
 assert.match(lead,/array_slice\(\$rows,0,20\)/);
 assert.match(lead,/nextCursor/);
 assert.match(js,/Show older enquiries/);
 assert.match(js,/leadCursor=data\.nextCursor/);
 assert.match(js,/encodeURIComponent\(next\)/);
 assert.match(js,/\/api\/growth\/leads\/withdraw/);
 assert.match(js,/document\.addEventListener\('visibilitychange'/);
 assert.match(dashboard,/QUALIFIED:say\(/);
 assert.match(dashboard,/NEEDS_INFO:say\(/);
 assert.match(dashboard,/data\.nextCursor/);
 assert.match(dashboard,/publicTitles\(\)/);
 assert.match(dashboard,/vip-descriptions-en\.json/);
 assert.match(read('en/account/index.html'),/href="\/en\/request-consultation\/#secure-consented-lead"/);
 assert.match(read('fa/customer-dashboard/index.html'),/href="\/fa\/darkhast-moshavere\/#secure-consented-lead"/);
 for(const source of [js,dashboard]){
   assert.doesNotMatch(source,/localStorage|sessionStorage|sendBeacon|indexedDB|innerHTML/);
 }
});
