import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutQuote} from './commerce-checkout-quote.mjs';
import {createPendingOrder,applyVerifiedPayment,recordPaymentFailure} from './commerce-order-lifecycle.mjs';
const quote=createCheckoutQuote({items:[{sku:'s1',quantity:1}],catalog:[{sku:'s1',priceMinor:500,currency:'IRR',titleFa:'خدمت',titleEn:'Service'}],email:'buyer@example.com'});
test('creates an unpaid order from a validated quote',()=>{
 const order=createPendingOrder({orderId:'order-1',quote});
 assert.equal(order.status,'pending-payment');
 assert.equal(order.amountMinor,500);
 assert.equal(order.invoiceIssued,false);
});
test('does not accept a browser-only or mismatched payment claim',()=>{
 const order=createPendingOrder({orderId:'order-1',quote});
 assert.throws(()=>applyVerifiedPayment(order,{expectedProvider:'gateway',verification:{serverVerified:false}}));
 assert.throws(()=>applyVerifiedPayment(order,{expectedProvider:'gateway',verification:{serverVerified:true,provider:'gateway',orderId:'order-1',amountMinor:1,currency:'IRR',transactionId:'txn',verifiedAt:'2026-10-09T12:00:00Z'}}));
});
test('accepts matching trusted verification and prevents replay transition',()=>{
 const order=createPendingOrder({orderId:'order-1',quote});
 const paid=applyVerifiedPayment(order,{expectedProvider:'gateway',verification:{serverVerified:true,provider:'gateway',orderId:'order-1',amountMinor:500,currency:'IRR',transactionId:'txn',verifiedAt:'2026-10-09T12:00:00Z'}});
 assert.equal(paid.status,'paid');
 assert.equal(paid.invoiceIssued,false);
 assert.throws(()=>applyVerifiedPayment(paid,{expectedProvider:'gateway',verification:{serverVerified:true}}));
 assert.equal(order.status,'pending-payment');
});
test('failed orders cannot be marked paid',()=>{
 const order=createPendingOrder({orderId:'order-1',quote});
 const failed=recordPaymentFailure(order,{reason:'provider-declined'});
 assert.equal(failed.status,'payment-failed');
 assert.throws(()=>applyVerifiedPayment(failed,{expectedProvider:'gateway',verification:{serverVerified:true}}));
});
