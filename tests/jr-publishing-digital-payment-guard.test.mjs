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
 assert.match(digital,/digital_distribution/);
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
 assert.doesNotMatch(m,/Mehrabmirkarimi2000@gmail.com/);
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
     document:{querySelector:selector=>map[selector]||null},
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
   'https://user:pass@drjavadrezazadeh.com/fa/shop/payment-start/?gateway=abc'
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
