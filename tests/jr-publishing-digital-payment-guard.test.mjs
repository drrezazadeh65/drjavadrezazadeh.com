import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
test('only verified BitPay callback may create digital entitlements and allocation',()=>{
 const api=read('api/index.php'),stage=read('api/commerce-stage9.php'),digital=read('api/internal/jr-publishing-digital.php');
 assert.match(api,/jrPubDigitalOffer\(\$pdo\)/);
 assert.match(api,/JR_PUB_SKU/);
 assert.match(api,/\/publishing\/offer/);
 assert.match(api,/\/publishing\/download/);
 assert.match(api,/if\(\$hasDigital&&\(\$hasBook\|\|count\(\$counts\)!==1\)\)/);
 assert.match(stage,/jrPubCommitVerifiedDigitalOrder\(\$pdo,\$orderId,\$items\)/);
 assert.ok(stage.indexOf("INSERT INTO commerce_payment_claims")<stage.indexOf("jrPubCommitVerifiedDigitalOrder"),'bank claim must precede allocation');
 assert.match(digital,/publishing_sale_allocation_entries/);
 assert.match(digital,/publishing_platform_cost_entries/);
 assert.match(digital,/publishing_digital_access_grants/);
 assert.match(digital,/publishing_notification_outbox/);
 assert.match(digital,/private_storage_name/);
 assert.match(digital,/hash_file\('sha256'/);
 assert.match(digital,/malware_scanned_at/);
 assert.match(digital,/digital_distribution records are retained/i);
 assert.doesNotMatch(digital,/SELECT l\.evidence_sha256/);
 assert.doesNotMatch(digital,/AND w\.rights_verified_at IS NOT NULL/);
 assert.match(digital,/expires_at>NOW\(\)/);
 assert.match(digital,/download_count=download_count\+1/);
 assert.match(digital,/hash_hmac\('sha256','jr-publishing-download-v1\|'/);
 assert.doesNotMatch(digital,/file_get_contents\(\$_GET/);
});
test('buyer product page prevents money movement unless live preflight proves delivery',()=>{
 const s=read('assets/js/jr-publishing-checkout-v1.js');
 const html=read('fa/shop/authors/mehrab-mirkarimi/index.html');
 assert.match(s,/\/api\/publishing\/offer/);
 assert.match(s,/j\.checkoutEnabled===true&&j\.available===true/);
 assert.match(s,/\/api\/commerce\/create/);
 assert.match(s,/j\.totalToman!==1000000/);
 assert.match(html,/jp-digital-checkout-form/);
 assert.match(html,/hidden aria-label/);
});
test('verified bank order sends two PDF links and a distinct private author notice',()=>{
 const m=read('api/internal/jr-publishing-mailer.php');
 const notifications=read('api/internal/jr-publishing-notifications.php');
 const cli=read('api/internal/jr-publishing-mail-worker.php');
 assert.match(m,/count\(\$grants\)!==2/);
 assert.match(m,/recipient=\(string\)\$order\['customer_email'\]/);
 assert.match(m,/publishing\/download\?grant=/);
 assert.match(m,/email_verified_at IS NOT NULL/);
 assert.match(m,/jrPublishingAuthorSaleNotice/);
 assert.match(m,/publishing_notification_outbox/);
 assert.match(m,/status='sent'/);
 assert.match(cli,/PHP_SAPI!=='cli'/);
 assert.match(notifications,/provider_verified/);
 assert.doesNotMatch(m,/[a-z0-9._%+-]*mirkarimi[a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/i);
});
test('author contract remains preview only and no paid files are stored in the git repository',()=>{
 const php=read('api/internal/jr-publishing-contract-draft.php');
 const admin=read('assets/js/jr-author-workspace-v1.js');
 const catalog=JSON.parse(read('assets/data/jr-publishing-prelaunch.json'));
 assert.match(php,/negotiation_draft_not_signed/);
 assert.match(admin,/draftContract/);
 assert.match(admin,/window\.print\(\)/);
 assert.equal(catalog.works[0].quote.checkout_enabled,false);
 assert.equal(catalog.works[0].rights_confirmed,false);
 assert.deepEqual(catalog.works[0].download_file_urls,[]);
});

test('uncertain SMTP result is never automatically retried as a duplicate sale email',()=>{
 const mailer=read('api/internal/jr-publishing-mailer.php');
 const worker=read('api/internal/jr-publishing-mail-worker.php');
 assert.match(mailer,/count\(array_unique\(\$kinds\)\)!==2/);
 assert.match(mailer,/invalid_digital_grant_kinds/);
 assert.match(mailer,/\$smtpAccepted=true/);
 assert.match(mailer,/\$status=\$smtpAccepted/);
 assert.match(mailer,/status IN\('queued','retry'\) AND next_attempt_at<=NOW\(\)/);
 assert.match(worker,/SET status='dead_letter' WHERE status='processing'/);
 assert.doesNotMatch(worker,/status IN\('queued','retry'\) OR \(status='processing'/);
});
test('private deployment verifier cannot grant public-sale approval by self-declared flags',()=>{
 const check=read('api/internal/jr-publishing-preflight-cli.php');
 assert.match(check,/PHP_SAPI!=='cli'/);
 assert.match(check,/'ready_for_public_sales'=>false/);
 assert.match(check,/'independent_live_purchase_evidence_read_here'=>false/);
 assert.match(check,/exit\(2\)/);
 assert.doesNotMatch(check,/getenv\('JR_PUBLISHING_AUTHOR_EMAIL'\).*echo/);
});

test('digital checkout sends only the correct secure buyer receipt, without a generic duplicate',()=>{
 const api=read('api/index.php');
 const mail=read('api/internal/jr-publishing-mailer.php');
 assert.match(api,/const?\s+JR_PUB_SKU|JR_PUB_SKU/);
 assert.match(api,/if\(!\$digitalReceipt && validEmail\(\$customerEmail\)&&mailReady\(\)\)/);
 assert.match(api,/jrPubProcessOutbox\(\$pdo,\$id\)/);
 assert.match(mail,/event_type IN\('buyer_paid','author_sale'\)/);
 assert.match(mail,/status='processing'/);
 assert.match(mail,/status='sent',sent_at=NOW\(\)/);
});

test('legacy paid books/services/donations never depend on publishing mailer existing',()=>{
 const callback=read('api/index.php');
 const anchor=callback.indexOf('// Only paid digital bundles invoke the publishing mail outbox.');
 assert.ok(anchor>0,'digital-only mail integration must be explicit');
 const section=callback.slice(anchor,anchor+1400);
 assert.match(section,/if\(\$digitalReceipt\)\{/);
 assert.match(section,/if\(!is_file\(\$mailer\)\)throw new RuntimeException\('publishing_mailer_missing'\)/);
 assert.match(section,/require_once \$mailer/);
 assert.match(section,/catch\(Throwable \$mailError\)/);
 assert.match(section,/if\(!\$digitalReceipt && validEmail\(\$customerEmail\)&&mailReady\(\)\)/);
 assert.ok(section.indexOf('if($digitalReceipt){')<section.indexOf('require_once $mailer'),
  'optional publishing dependency must be loaded only for the digital SKU');
});


test('digital buyer checkout fail-closes ambiguous payment creation and untrusted relay URLs',async()=>{
 const client=read('assets/js/jr-publishing-checkout-v1.js');
 async function executeCheckout(paymentUrl,{networkFails=false}={}){
   const redirects=[];let posts=0;
   const form={hidden:true,reportValidity:()=>true,addEventListener(_event,callback){this.onSubmit=callback;}};
   const message={textContent:''},pay={disabled:false},name={value:'Verified Test Buyer'};
   const email={value:'test@example.invalid'};
   const map={
     '#jp-digital-checkout-form':form,
     '#jp-checkout-state':message,
     '#jp-pay-now':pay,
     '#jp-buyer-name':name,
     '#jp-buyer-email':email
   };
   const fetch=async (url)=>{
     if(url==='/api/publishing/offer'){
       return {ok:true,json:async()=>({
         ok:true,checkoutEnabled:true,available:true,
         sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000
       })};
     }
     assert.equal(url,'/api/commerce/create');posts++;
     if(networkFails)throw Error('ambiguous_network_failure');
     return {ok:true,json:async()=>({
       ok:true,currency:'IRT',totalToman:1000000,paymentUrl
     })};
   };
   vm.runInNewContext(client,{
     document:{documentElement:{lang:'fa'},querySelector:selector=>map[selector]||null,addEventListener(){}},
     fetch,URL,
     location:{origin:'https://drjavadrezazadeh.com'},
     window:{location:{assign:url=>redirects.push(url)}}
   });
   // Allow the asynchronous, fail-closed public offer check to settle first.
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(form.hidden,false);
   await form.onSubmit({preventDefault(){}});
   return {redirects,posts,pay,message,form};
 }
 const valid=await executeCheckout('/fa/shop/payment-start/?gateway=abc123');
 assert.equal(valid.redirects.length,1,'the single, same-origin gateway relay remains usable');
 assert.match(valid.redirects[0],/^https:\/\/drjavadrezazadeh\.com\/fa\/shop\/payment-start\/\?gateway=abc123$/);
 for(const unsafe of [
   'https://evil.example/fa/shop/payment-start/?gateway=abc',
   '/fa/shop/payment-start/other/?gateway=abc',
   '/fa/shop/payment-start/?gateway=abc&gateway=xyz',
   '/fa/shop/payment-start/?gateway=abc&other=true',
   '/fa/shop/payment-start/?gateway=',
   '/fa/shop/payment-start/?gateway=abc#fragment',
   (()=>{const url=new URL('https://drjavadrezazadeh.com/fa/shop/payment-start/?gateway=abc');url.username='tester';url.password='dummy';return url.href;})()
 ]){
   const trial=await executeCheckout(unsafe);
   assert.equal(trial.redirects.length,0,'must not redirect to an invalid relay: '+unsafe);
   assert.equal(trial.pay.disabled,true,'uncertain order must remain non-retryable');
   assert.match(trial.message.textContent,/وضعیت سفارش یا درخواست پرداخت نامشخص است/);
   await trial.form.onSubmit({preventDefault(){}});
   assert.equal(trial.posts,1,'never repeat ambiguous commerce POST');
 }
 const ambiguous=await executeCheckout(undefined,{networkFails:true});
 assert.equal(ambiguous.redirects.length,0);
 assert.equal(ambiguous.pay.disabled,true);
 assert.equal(ambiguous.posts,1);
 assert.doesNotMatch(ambiguous.message.textContent,/وجهی از این صفحه دریافت نشده است/);
 await ambiguous.form.onSubmit({preventDefault(){}});
 assert.equal(ambiguous.posts,1);
});


test('settled bank refund blocks PDF download and paid buyer/author email delivery',()=>{
 const digital=read('api/internal/jr-publishing-digital.php');
 const mailer=read('api/internal/jr-publishing-mailer.php');
 const worker=read('api/internal/jr-publishing-mail-worker.php');
 const schema=read('api/publishing.php');
 const migration=read('docs/migrations/20261012_stage09_commerce.sql');
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_refund_requests/);
 assert.match(schema,/'commerce_orders','commerce_payment_claims','commerce_refund_requests'/,'private schema preflight must require the refund table');
 assert.match(migration,/status ENUM\('requested','reviewing','approved','declined','settled'\)/);
 const denied=/NOT EXISTS\s*\(SELECT 1 FROM commerce_refund_requests r\s*WHERE r\.order_id=o\.id AND r\.status='settled'\)/;
 assert.match(digital,denied,'the entitlement query must check the bank-refund ledger');
 assert.match(mailer,denied,'queued buyer and author notices must not send after settled refunds');
 assert.match(worker,/NOT EXISTS\s*\(SELECT 1 FROM commerce_refund_requests r\s*WHERE r\.order_id=n\.order_id AND r\.status='settled'\)/,'refunded queued notices must not starve eligible deliveries');
 assert.match(digital,/g\.expires_at>NOW\(\) FOR UPDATE/,'existing locked grant checks must survive');
 assert.match(mailer,/p\.verified_amount=o\.provider_amount/,'payment claim checks must survive');
});


test('settled digital refunds must be visible to authors until allocation reversals reconcile',()=>{
 const api=read('api/publishing.php');
 const ui=read('assets/js/jr-author-workspace-v1.js');
 const migration=read('docs/migrations/20261012_stage09_commerce.sql');
 assert.match(migration,/status ENUM\('requested','reviewing','approved','declined','settled'\)/);
 assert.match(api,/EXISTS\(SELECT 1 FROM commerce_refund_requests r/);
 assert.match(api,/r\.status='settled'/);
 assert.match(api,/HAVING SUM\(CASE WHEN e\.entry_kind IN \('author_share','author_reversal'\)/);
 assert.match(api,/SUM\(CASE WHEN e\.entry_kind IN \('talent_fund','fund_reversal'\)/);
 assert.match(api,/AS unreconciled_count/);
 assert.match(api,/'settledRefundsAwaitingAllocationReversal'/);
 assert.match(api,/'refundSettled'/);
 assert.match(api,/'refundAllocationsUnreconciled'/);
 assert.match(ui,/unresolvedRefunds>0/);
 assert.match(ui,/warning\.setAttribute\('role','alert'\)/);
 assert.match(ui,/sale\.refundAllocationsUnreconciled/);
 assert.doesNotMatch(api,/SELECT [^\n]*customer_email FROM commerce_refund_requests/);
});

test('existing publishing offer activation is owner-controlled, idempotent and does not fabricate evidence',()=>{
 const cli=read('api/internal/jr-publishing-activate-existing-cli.php');
 const offer=read('api/internal/jr-publishing-digital.php');
 assert.match(cli,/PHP_SAPI !== 'cli'/);
 assert.match(cli,/--check/);
 assert.match(cli,/--activate/);
 assert.match(cli,/beginTransaction\(\)/);
 assert.match(cli,/rollBack\(\)/);
 assert.match(cli,/publishing_author_accounts/);
 assert.match(cli,/email_verified_at/);
 assert.doesNotMatch(cli,/publishing_rights_licences|rights_evidence_recorded|author_digital_distribution_rights/);
 assert.doesNotMatch(cli,/rights_verified_at=COALESCE/);
 assert.match(cli,/author_account_verified/);
 assert.match(cli,/publishing_private_assets/);
 assert.match(cli,/malware_scanned_at/);
 assert.match(cli,/hash_file\('sha256'/);
 assert.match(cli,/jrPubDigitalOffer\(\$pdo\)/);
 assert.match(cli,/UPDATE publishing_offers SET checkout_enabled=1/);
 assert.match(cli,/WHERE id=\? AND retired_at IS NULL/);
 assert.match(cli,/JR_PUBLISHING_SEPARATE_7PCT_BUDGET/);
 assert.match(cli,/JR_PUBLISHING_MAIL_CRON_TESTED/);
 // Original PDF hashes must agree across the private preflight and activation.
 const preflight=read('api/internal/jr-publishing-preflight-cli.php');
 const hashes=[
  '6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8',
  'db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4'
 ];
 for(const digest of hashes){
   assert.equal(digest.length,64);
   assert.ok(offer.includes(digest),'canonical offer must pin approved SHA-256 '+digest);
   assert.ok(!preflight.includes(digest),'preflight must use canonical manifest, not duplicate hashes');
 }
 assert.equal(hashes.filter(digest=>cli.includes(digest)).length,0,'activation must use shared asset manifest');
 assert.match(cli,/JR_PUB_ORIGINAL_ASSETS/);
 assert.match(preflight,/JR_PUB_ORIGINAL_ASSETS/);

 assert.doesNotMatch(cli,/INSERT INTO publishing_rights_licences/);
 assert.doesNotMatch(cli,/INSERT INTO customer_accounts/);
 assert.doesNotMatch(cli,/UPDATE publishing_private_assets SET/);
 assert.doesNotMatch(cli,/CREATE TABLE|DROP TABLE|DELETE FROM/);
 assert.match(offer,/function jrPubDigitalSalesSwitchEnabled\(\): bool/);
 assert.match(offer,/\['publishing_digital_enabled'\]/);
 assert.match(offer,/JR_PUBLISHING_DIGITAL_ENABLED/);
 assert.match(offer,/jrPubDigitalSalesSwitchEnabled\(\)/);
});
