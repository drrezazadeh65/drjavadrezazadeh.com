import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutQuote} from './commerce-checkout-quote.mjs';
const catalog=[{sku:'service-1',titleFa:'مشاوره',titleEn:'Consultation',priceMinor:120000,currency:'IRR'}];
test('quotes a product from authoritative catalog pricing, with email identity',()=>{
 const q=createCheckoutQuote({items:[{sku:'service-1',quantity:2,priceMinor:1}],catalog,email:'buyer@example.com'});
 assert.equal(q.totalMinor,240000);
 assert.equal(q.lines[0].unitPriceMinor,120000);
 assert.equal(q.paymentInitiated,false);
 assert.equal(q.invoiceIssued,false);
 assert.equal(q.taxStatus,'not-calculated');
});
test('rejects unknown SKUs, invalid email and quantities',()=>{
 assert.throws(()=>createCheckoutQuote({items:[{sku:'missing',quantity:1}],catalog,email:'buyer@example.com'}));
 assert.throws(()=>createCheckoutQuote({items:[{sku:'service-1',quantity:1}],catalog,email:'invalid'}));
 assert.throws(()=>createCheckoutQuote({items:[{sku:'service-1',quantity:0}],catalog,email:'buyer@example.com'}));
});
test('rejects mixed currencies',()=>{
 const products=[...catalog,{sku:'book',priceMinor:300,currency:'USD'}];
 assert.throws(()=>createCheckoutQuote({items:[{sku:'service-1',quantity:1},{sku:'book',quantity:1}],catalog:products,email:'buyer@example.com'}));
});
