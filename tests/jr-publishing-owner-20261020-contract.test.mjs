import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const product=JSON.parse(read('assets/data/jr-publishing-prelaunch.json'));
const work=product.works.find(w=>w.id==='tefl-ma-exams-1370-1405');

test('October owner decision is one product-specific immutable future-sales contract',()=>{
 assert.ok(work);
 assert.equal(work.quote.gross_unit_price,1_000_000);
 assert.equal(work.quote.author_unit_share,700_000);
 assert.equal(work.quote.fund_unit_share,300_000);
 assert.equal(work.quote.allocation_policy_id,'mehrab-gross-70-30-v2');
 assert.equal(work.quote.author_rate_basis_points,7000);
 assert.equal(work.quote.fund_rate_basis_points,3000);
 assert.equal(work.quote.author_unit_share+work.quote.fund_unit_share,work.quote.gross_unit_price);
 assert.equal(work.quote.checkout_enabled,false,'source is not evidence of live bank/file delivery');
 assert.equal(product.finance_policy.historical_transactions_mutable,false);
 assert.equal(product.finance_policy.legacy_policy_id,'mehrab-gross-60-40-v1');
});

test('both public profiles show final gross split, without falsely claiming independent validation',()=>{
 const fa=read('fa/shop/authors/mehrab-mirkarimi/index.html');
 const en=read('en/shop/authors/mehrab-mirkarimi/index.html');
 for(const required of [
   'مباحث نظری روش تدریس، زبان‌شناسی و آزمون‌سازی',
   'بیش از ۱۲۰ مرحله اصلاح و ویرایش','بیش از ۱۰۰ ساعت بازبینی محتوایی',
   'حدود ۹۹ درصد','۷۰۰٬۰۰۰ تومان','۳۰۰٬۰۰۰ تومان','۷۰ درصد سهم مؤلف، ۳۰ درصد سهم صندوق حمایت'
 ])assert.ok(fa.includes(required),'missing Persian: '+required);
 assert.doesNotMatch(fa,/این ارقام گزارش خود مؤلف از فرایند تولید اثرند و به‌تنهایی نشان‌دهنده صحت تک‌تک پاسخ‌ها نیستند/);
 assert.doesNotMatch(fa,/۶۰۰٬۰۰۰ تومان|۴۰۰٬۰۰۰ تومان|۴۰ درصد از مبلغ هر فروش|۶۰ درصد سهم مؤلف/);
 for(const required of [
   '700,000 tomans','300,000 tomans','more than 120 rounds',
   'more than 100 hours','approximately 99%','not an independent validation certificate'
 ])assert.ok(en.includes(required),'missing English: '+required);
 assert.doesNotMatch(en,/600,000 tomans|400,000 tomans|40% of the buyer's price/);
});

test('verified BitPay callback uses the original order-specific policy for money and author emails',()=>{
 const policy=read('api/internal/jr-publishing-allocation-policy.php');
 const digital=read('api/internal/jr-publishing-digital.php');
 const mailer=read('api/internal/jr-publishing-mailer.php');
 const stage=read('api/commerce-stage9.php');
 assert.match(policy,/JR_PUB_CURRENT_POLICY = 'mehrab-gross-70-30-v2'/);
 assert.match(policy,/JR_PUB_LEGACY_POLICY = 'mehrab-gross-60-40-v1'/);
 assert.match(digital,/allocationPolicy'=>JR_PUB_CURRENT_POLICY/);
 assert.match(digital,/jrPubVerifiedAllocationSnapshot\(\$x\)/);
 assert.match(digital,/\['author_share',\$policy\['author'\]\]/);
 assert.match(digital,/\['talent_fund',\$policy\['fund'\]\]/);
 assert.match(mailer,/jrPubVerifiedAllocationSnapshot\(\$x\)/);
 assert.match(mailer,/\$allocation\['author'\]/);
 assert.match(mailer,/\$allocation\['fund'\]/);
 assert.match(stage,/jrPubCommitVerifiedDigitalOrder\(\$pdo,\$orderId,\$items\)/);
 assert.match(stage,/INSERT INTO commerce_payment_claims/);
});

test('existing-offer transition is explicit, auditable, locked and does not activate checkout',()=>{
 const cli=read('api/internal/jr-publishing-policy-70-30-cli.php');
 for(const required of [
  'PHP_SAPI','YES_20261020','FOR UPDATE',
  'UPDATE publishing_offers','publishing_audit_events','unit_author_toman',
  'unit_fund_toman','publicSalesEnabledByThisTool',
  'historicalOrderRowsModified'
 ])assert.ok(cli.includes(required),'missing guarded migration property '+required);
 assert.doesNotMatch(cli,/UPDATE\s+commerce_orders|DELETE\s+FROM\s+commerce_orders|UPDATE\s+publishing_sale_allocation_entries/i);
 assert.doesNotMatch(cli,/SET\s+checkout_enabled\s*=\s*1/i);
});

test('unrelated public instrumentation remains disabled until separate consent/preview checks',()=>{
 const cfg=JSON.parse(read('platform/analytics-config.json'));
 assert.equal(cfg.enabled,false);
 assert.equal(cfg.gtm_container_id,'GTM-P6LWCLKM');
 assert.equal(cfg.clarity.project_id,'z0mzp0dp74');
 assert.equal(cfg.clarity.enabled,false);
});
