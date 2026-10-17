import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const parse=path=>JSON.parse(read(path));
const catalog=parse('assets/data/service-catalog.json');
const book=parse('assets/data/jr-publishing-prelaunch.json');
const manifest=parse('docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json');
const page=read('fa/shop/authors/mehrab-mirkarimi/index.html');
const api=read('api/index.php');
const checkout=read('assets/js/jr-publishing-checkout-v1.js');
const worker=read('api/internal/jr-publishing-mailer.php');
const mobile=read('assets/js/jr-author-workspace-v1.js');
const draft=read('api/internal/jr-publishing-contract-draft.php');
const live=read('scripts/bertina-postrelease-check.mjs');

test('unified candidate protects the 21 approved services and their shared commerce engine',()=>{
 const available=catalog.services.filter(s=>s.sellable===true);
 assert.equal(available.length,21);
 assert.equal(new Set(available.map(s=>s.id)).size,21);
 assert.match(api,/gatewayPost\('gateway-send'/);
 assert.match(api,/stage9ReserveBooks\(\$pdo,\$order,\$lines\)/);
 assert.match(api,/jrPubDigitalOffer\(\$pdo\)/);
 assert.match(api,/if\(\$hasDigital&&\(\$hasBook\|\|count\(\$counts\)!==1\)\)/);
});
test('first author preserves exactly the approved 1m/600k/400k split and separate 7% reserve',()=>{
 const item=book.works.find(w=>w.id==='tefl-ma-exams-1370-1405');
 assert.ok(item);
 const q=item.quote;
 assert.deepEqual([q.gross_unit_price,q.author_unit_share,q.fund_unit_share,
    q.operating_reserve_irt,q.platform_subsidy_required_irt],
    [1000000,600000,400000,70000,70000]);
 assert.equal(q.author_unit_share+q.fund_unit_share,q.gross_unit_price);
 assert.equal(q.gateway_cost_bearer,'platform_subject_to_owner_approval');
 assert.equal(q.operating_reserve_rate_basis_points,700);
 assert.match(page,/۴۰۰ هزار تومان/);
 assert.match(page,/۶۰۰ هزار تومانی/);
 assert.match(draft,/negotiation_draft_not_signed/);
 assert.match(draft,/'sign'=>false/);
 assert.match(mobile,/draftContract/);
});
test('real-money checkout is blocked unless author rights, private files and verified SMTP can fulfil',()=>{
 const digital=read('api/internal/jr-publishing-digital.php');
 const client=checkout;
 assert.match(digital,/digital_distribution/);
 assert.match(digital,/JR_PUBLISHING_DIGITAL_ENABLED/);
 assert.match(digital,/jrPubPrivateDir\(\)/);
 assert.match(digital,/malware_scanned_at/);
 assert.match(digital,/hash_file\('sha256'/);
 assert.match(client,/j\.checkoutEnabled===true&&j\.available===true/);
 assert.match(client,/\/api\/commerce\/create/);
 assert.match(worker,/count\(array_unique\(\$kinds\)\)!==2/);
 assert.match(worker,/jrPublishingAuthorSaleNotice/);
 assert.doesNotMatch(page,/Mehrabmirkarimi2000@gmail.com/);
 assert.doesNotMatch(book.works[0].quote.checkout_enabled.toString(),/true/);
});
test('scientific peer review status and author signature must not be counterfeited by deployment',()=>{
 assert.equal(book.compliance.scientific_review_approved,false);
 assert.equal(book.works[0].rights_confirmed,false);
 assert.match(page,/داوری مستقل هنوز تکمیل نشده است/);
 assert.match(draft,/این متن صرفاً برای مطالعه/);
 const contracts=read('docs/migrations/20261017_jr_publishing_contract_and_reserve.sql');
 assert.match(contracts,/publishing_contract_signature_evidence/);
 assert.match(contracts,/verification_state/);
});
test('merged anonymous observer includes bilingual 42-page AND Mirkarimi offer gates without charging',()=>{
 assert.match(live,/bilingual-public-service-pages-21x2/);
 assert.match(live,/mirkarimi-public-author-and-digital-offer/);
 assert.match(live,/authorDistributionRightsIndependentlyReviewed:false/);
 assert.match(live,/actualBankPaymentAndVerifiedPrivatePdfDelivery:false/);
 assert.doesNotMatch(live,/\/api\/commerce\/create/);
});
test('global release manifest must not be forged as accepted by source-only checks',()=>{
 assert.equal(manifest.verifiedGates.length,41);
 assert.equal(manifest.verifiedServices.length,21);
 if(manifest.releaseState!=='FULLY_VERIFIED_FOR_SINGLE_OWNER_RELEASE'){
   assert.equal(manifest.ownerFinalAuthorization,false);
 }
});
