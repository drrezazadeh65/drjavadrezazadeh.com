import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(x,'utf8');
const api=read('api/manual-usdt.php');
const receiptSQL=read('database/bertina/022_manual_usdt_bsc.sql');
const js=read('assets/js/manual-usdt-payment.js');
const admin=read('assets/js/operations-manual-usdt.js');
const customer=read('assets/js/manual-usdt-account.js');
const opts=JSON.parse(read('platform/manual-usdt-bsc.json'));

test('manual method defaults OFF and never auto-activates a service',()=>{
 assert.match(api,/JR_MANUAL_USDT_ENABLED/);
 assert.match(api,/JR_MANUAL_USDT_SCHEMA_APPROVED/);
 assert.match(api,/manualApprovalOnly'=>true/);
 assert.match(api,/automaticEntitlement'=>false/);
 assert.match(api,/commerceOrderChanged'=>false/);
 assert.match(api,/serviceAccessAutomatic'=>false/);
 assert.match(api,/providerSettlementVerified'=>false/);
 assert.doesNotMatch(api,/UPDATE commerce_orders SET state='paid'/);
});
test('manual proof submissions require verified account, authenticated origin and consent',()=>{
 for(const frag of ["sessionAccount($pdo)","email_verified_at","HTTP_ORIGIN","HTTP_SEC_FETCH_SITE","HTTP_X_JR_USDT_CSRF",
  "hash_equals(jrUsdtCsrf($account),$posted)","privacy_consent_required","rateAllowed($pdo,'manual_usdt_claim'"])
  assert.ok(api.includes(frag),frag);
 assert.match(api,/\/\^0x\[a-fA-F0-9\]\{64\}\$\/D/);
 assert.match(api,/order_not_eligible/);
 assert.match(api,/official_order_or_invoice_required/);
 assert.match(api,/official_quote_required/);
});
test('private proof upload is outside public_html and size/type constrained',()=>{
 assert.match(api,/dirname\(dirname\(__DIR__\)\)/);
 assert.match(api,/\.jr-usdt-receipts/);
 assert.match(api,/is_uploaded_file/);
 assert.match(api,/size>2097152/);
 assert.match(api,/move_uploaded_file/);
 assert.match(api,/receipt_mime/);
 assert.match(api,/Content-Security-Policy: sandbox/);
});
test('owner receives SMTP claim reference, while financial states remain separate',()=>{
 assert.match(api,/sendLocalMail\(JR_USDT_ADMIN_EMAIL/);
 assert.match(api,/email_notice_status/);
 assert.match(api,/Manual/); 
 assert.match(api,/receiptStored/);
 assert.match(api,/manuallyReviewed'=>true/);
});
test('hash and amount checks remain explicit and only human decision can approve',()=>{
 assert.match(api,/chain56Checked/);
 assert.match(api,/tokenContractChecked/);
 assert.match(api,/receiverChecked/);
 assert.match(api,/amountChecked/);
 assert.match(api,/confirmationsChecked/);
 assert.match(api,/operationsMutationAllowed/);
 assert.match(api,/manualOwnerVerificationRequired'=>true/);
 assert.match(api,/under_review','needs_information','rejected/);
});
test('additive SQL enforces unique hash and a private moderation audit trail',()=>{
 assert.match(receiptSQL,/CREATE TABLE IF NOT EXISTS manual_usdt_claims/);
 assert.match(receiptSQL,/CREATE TABLE IF NOT EXISTS manual_usdt_audit/);
 assert.match(receiptSQL,/UNIQUE KEY uq_manual_usdt_tx_hash/);
 assert.match(receiptSQL,/FOREIGN KEY \(account_id\) REFERENCES customer_accounts\(id\)/);
 assert.match(receiptSQL,/status ENUM\('submitted'/);
 assert.doesNotMatch(receiptSQL,/DROP TABLE|DELETE FROM|TRUNCATE TABLE/i);
});
test('public payment pages contain no enabled receiving address or secrets',()=>{
 for(const lang of ['fa','en']){
  const page=read(lang+'/payments/usdt/index.html');
  assert.match(page,/noindex,nofollow,noarchive/);
  assert.match(page,/data-usdt-wallet/);
  assert.match(page,/data-usdt-form/);
  assert.match(page,/name="consentToReview"/);
  assert.doesNotMatch(page,/0x21f892a74949B82FF62fCDd0089C53fb145f17B5/i);
 }
 assert.match(js,/publicOptions\.data\?\.enabled!==true/);
 assert.match(js,/details\.hidden=true/);
 assert.match(js,/form\.hidden=true/);
 assert.match(js,/form\.hidden=false/);
 assert.match(js,/consentToReview/);
});
test('verified customer order pages and fresh-MFA admin pages are connected',()=>{
 for(const path of ['fa/app/account/orders/index.html','en/account/orders/index.html']){
  const html=read(path);assert.match(html,/manual-usdt-account\.js/);
  assert.match(html,/manual-usdt-account\.css/);
  assert.match(html,/data-resource="orders"/);
 }
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);assert.match(html,/manual-usdt\.js/);
  assert.match(html,/operations-manual-usdt\.css/);
  assert.match(html,/id="ops-workspace" hidden/);
 }
 assert.match(admin,/\/api\/admin\/operations\/crypto\/usdt\/exchange-evidence/);
 assert.match(admin,/mfaRequired!==false/);
 assert.match(customer,/\/api\/crypto\/usdt\/claims/);
 assert.match(customer,/section\.remove\(\)/);
});
test('token and network stay correct and API secrets never appear in public JSON',()=>{
 assert.equal(opts.chainId,56);
 assert.equal(opts.tokenContract,'0x55d398326f99059ff775485246999027b3197955');
 assert.equal(opts.receiveAddress,'0x21f892a74949B82FF62fCDd0089C53fb145f17B5');
 assert.equal(opts.status,'FEATURE_DISABLED_PENDING_SECURITY_AND_RELEASE_GATES');
 assert.doesNotMatch(JSON.stringify(opts),/api[_-]?secret|api[_-]?key|bearer|password/i);
});
