import test from 'node:test';
import assert from 'node:assert/strict';
import {businessHref,isContactEligible,contactMarkup,BUSINESS_NUMBER} from '../scripts/jr-business-contact-v1.mjs';
const origin='https://drjavadrezazadeh.com';
function fixture(p,robots='index,follow'){return '<html lang="fa"><head><meta name="robots" content="'+robots+'"><link rel="canonical" href="'+origin+p+'"></head><body><main></main></body></html>';}
test('approved public business number and contextual multilingual link',()=>{assert.equal(BUSINESS_NUMBER,'989132641068');for(const lang of ['fa','en','ar']){const p='/'+lang+'/jrei/';const u=new URL(businessHref(lang,p));assert.equal(u.origin,'https://wa.me');assert.equal(u.pathname,'/'+BUSINESS_NUMBER);assert.ok(u.searchParams.get('text').includes(origin+p));assert.match(contactMarkup(lang,p),/data-jr-business-contact="v1"/);assert.doesNotMatch(contactMarkup(lang,p),/<script|<iframe|<form/i);}});
test('private and nonindexable routes are excluded, public editorial dashboard stays eligible',()=>{for(const p of ['/fa/login/','/en/account/','/ar/checkout/','/fa/golden-talent/assessment/'])assert.equal(isContactEligible(p,fixture(p),new Set([origin+p])),false);assert.equal(isContactEligible('/fa/',fixture('/fa/','noindex,follow'),new Set([origin+'/fa/'])),false);assert.equal(isContactEligible('/fa/',fixture('/fa/'),new Set()),false);assert.equal(isContactEligible('/journal/dashboard/',fixture('/journal/dashboard/'),new Set([origin+'/journal/dashboard/'])),true);assert.equal(isContactEligible('/',fixture('/'),new Set([origin+'/'])),true);});

import {invoiceRequestEligible,invoiceRequestMarkup} from '../scripts/jr-usdt-invoice-enquiries.mjs';
test('USDT manual invoice enquiry covers commerce and support without pretending payment is enabled',()=>{
 for(const route of ['/fa/support-talented-students/','/en/shop/','/ar/books/','/fa/services/academic_consult_60/','/ar/jrei/catalog/agents/','/en/forge/']){
  assert.equal(invoiceRequestEligible(route,fixture(route),new Set([origin+route])),true);
  const markup=invoiceRequestMarkup(route);
  assert.match(markup,/data-jr-usdt-invoice-enquiry="v1"/);
  assert.match(markup,/https:\/\/wa\.me\/989132641068/);
  assert.doesNotMatch(markup,/<form|<script|0x[a-f0-9]{40}/i);
 }
 for(const route of ['/journal/','/fa/app/admin/','/en/account/','/fa/shop/payment-result/','/fa/golden-talent/assessment/','/en/shop/customer-policy/']){
  assert.equal(invoiceRequestEligible(route,fixture(route),new Set([origin+route])),false);
 }
 assert.equal(invoiceRequestEligible('/en/shop/checkout/',fixture('/en/shop/checkout/','noindex,follow').replace('lang="fa"','lang="en"'),new Set()),true);
 assert.equal(invoiceRequestEligible('/fa/services/',fixture('/fa/services/','noindex,follow'),new Set([origin+'/fa/services/'])),false);
 for(const lang of ['fa','en']){const route='/'+lang+'/support-talented-students/';assert.equal(invoiceRequestEligible(route,fixture(route,'noindex,follow').replace('lang="fa"','lang="'+lang+'"'),new Set()),true);}
});
