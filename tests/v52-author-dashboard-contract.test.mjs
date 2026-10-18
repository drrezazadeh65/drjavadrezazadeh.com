/* Author v5.2 mobile privacy and sales-reporting feature acceptance (source-only).
 * This is not evidence of a live bank payment or author rights approval. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('fa/app/author/index.html');
const work=read('assets/js/jr-author-workspace-v1.js');
const onboarding=read('assets/js/jr-author-onboarding-v1.js');
const product=read('fa/shop/authors/mehrab-mirkarimi/index.html');
const css=read('assets/css/jr-author-dashboard-v52.css');
const backend=read('api/publishing.php');

test('owner-approved author profile is accessible but never indexable',()=>{
 assert.match(page,/noindex,nofollow,noarchive/);
 assert.match(page,/jr-author-dashboard-v52\.css/);
 assert.match(page,/id="jr-author-onboarding"/);
 assert.match(page,/jr-author-workspace-v1\.js/);
 assert.match(product,/href="\/fa\/app\/author\/" rel="nofollow"/);
 assert.match(backend,/Cache-Control: no-store, private/);
 assert.match(backend,/l\.approved_at IS NOT NULL/);
 assert.match(backend,/email_verified_at/);
});

test('authenticated sales and real account ledger are readable and phone-sized',()=>{
 assert.match(work,/author\.verifiedPaidOrders/);
 assert.match(work,/author\.authorAccruedToman/);
 assert.match(work,/author\.talentFundEarmarkedToman/);
 assert.match(work,/author\.authorBankSettledToman/);
 assert.match(work,/author\.settledRefundsAwaitingAllocationReversal/);
 assert.match(work,/author\.recentSales/);
 assert.match(work,/role','alert/);
 assert.match(work,/jp-author-search/);
 assert.match(work,/toLocaleLowerCase/);
 assert.match(work,/el\('details','jp-author-disclosure'\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css, /prefers-reduced-motion/);
 assert.doesNotMatch(work,/innerHTML|localStorage|sessionStorage|eval\(/);
});

test('multi-author onboarding preserves selection and never exposes raw bank details',()=>{
 assert.match(onboarding,/selectedAuthorId=null/);
 assert.match(onboarding,/authorChoices\.length>1/);
 assert.match(onboarding,/selectedAuthorId=selected\.authorId/);
 assert.match(onboarding,/render\(selected,v\.authors\)/);
 assert.match(onboarding,/review_state/);
 assert.match(onboarding,/card_last4/);
 assert.match(onboarding,/iban_last4/);
 assert.doesNotMatch(onboarding,/localStorage|sessionStorage/);
});

test('marketing pages never bypass private asset and financial protections',()=>{
 const checkout=read('assets/js/jr-publishing-checkout-v1.js');
 const source=read('api/internal/jr-publishing-digital.php');
 assert.match(checkout,/checkoutEnabled===true/);
 assert.match(checkout,/j\.priceToman===1000000/);
 assert.match(source,/rights_scope='digital_distribution'/);
 assert.match(source,/unit_author_toman/);
 assert.match(source,/unit_fund_toman/);
 assert.doesNotMatch(product,/href="[^"]*\.pdf"/i);
});
