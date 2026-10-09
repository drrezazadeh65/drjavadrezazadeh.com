import fs from 'node:fs';

const worker=fs.readFileSync('payment-api/worker-v4.4-corrected.js','utf8');
const page=fs.readFileSync('fa/shop/payment-result/index.html','utf8');
const failures=[];
const checkout=fs.readFileSync('assets/js/book-store.js','utf8');
const checkoutPage=fs.readFileSync('fa/shop/checkout/index.html','utf8');
const paymentStart=fs.readFileSync('fa/shop/payment-start/index.html','utf8');
if(!checkout.includes('const deliveryCaptureReady=false'))failures.push('book checkout must fail closed until shipping persistence is implemented');
if(!checkout.includes('btn.disabled=!(bookPaymentReady&&deliveryCaptureReady)'))failures.push('book checkout payment button must require delivery readiness');
if(!checkoutPage.includes('<section data-book-checkout></section>'))failures.push('dynamic checkout host must not contain shipping form');
if(!paymentStart.includes('btn.setAttribute("rel","noopener noreferrer")'))failures.push('payment handoff must retain noreferrer');
if(!paymentStart.includes('params.getAll("gateway").length!==1'))failures.push('payment handoff must reject duplicate gateway parameters');

for(const needle of [
 'SELECT state,amount_toman,currency,items_json,paid_at,provider_trans_id FROM commerce_orders',
 'if(row.state!=="paid")return reply({ok:true,state:row.state})',
 'return fail("receipt_unverified",409)',
 'receiptTotal!==row.amount_toman',
 'unitToman:item.price',
 'subtotalToman:item.subtotal',
 'receipt:{orderId:id,currency:"IRT",amountToman:row.amount_toman,items:receiptItems,paidAt:row.paid_at}'
]){
 if(!worker.includes(needle))failures.push('worker missing paid-receipt contract: '+needle);
}

const paidReturn=worker.match(/receipt:\{orderId:id,currency:"IRT",amountToman:row\.amount_toman,items:receiptItems,paidAt:row\.paid_at\}/);
if(!paidReturn)failures.push('paid commerce status must return only the sanitized receipt contract');
if(/receipt:\{[^}]*provider_(?:trans|id)|receipt:\{[^}]*factor/i.test(worker))
 failures.push('provider/factor identifiers must not be exposed in commerce receipt');

for(const needle of [
 "receipt.orderId!==id",
 "receipt.currency!=='IRT'",
 'receipt.amountToman',
 'Array.isArray(receipt.items)',
 'item.subtotalToman!==item.quantity*item.unitToman',
 'total!==receipt.amountToman'
]){
 if(!page.includes(needle))failures.push('payment-result page missing receipt validation: '+needle);
}

if(!/<meta name="robots" content="noindex,nofollow,noarchive">/.test(page))
 failures.push('payment-result page must remain noindex,nofollow,noarchive');

if(failures.length){
 console.error('Commerce receipt contract failures ('+failures.length+')');
 failures.forEach(x=>console.error('✗ '+x));
 process.exit(1);
}
console.log('Commerce paid-receipt contract is fail-closed and server-authoritative.');
