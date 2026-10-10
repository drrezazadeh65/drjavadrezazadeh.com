import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const api=fs.readFileSync('api/index.php','utf8');
const page=fs.readFileSync('fa/shop/payment-result/index.html','utf8');
const checkout=fs.readFileSync('assets/js/book-store.js','utf8');
const paymentStart=fs.readFileSync('fa/shop/payment-start/index.html','utf8');
const failures=[];
const requireSource=(source,needle,why)=>{if(!source.includes(needle))failures.push(why);};

for(const [needle,why] of [
 ["header('Cache-Control: no-store, no-cache, must-revalidate')",'API must prohibit receipt caching'],
 ["header('X-Robots-Tag: noindex, noarchive, nosnippet')",'API must exclude private receipts from discovery'],
 ["if($row['state']!=='paid')respond(['ok'=>true,'state'=>$row['state']])",'unpaid status must expose state only'],
 ["fail('receipt_unverified',409)",'paid receipts must require stored payment evidence'],
 ["if($total!==(int)$row['amount_toman'])",'receipt total must match the server order'],
 ["'kind'=>'payment_confirmation_not_tax_invoice'",'receipt must not claim to be a tax invoice']
])requireSource(api,needle,why);

for(const [needle,why] of [
 ["const API='/api'",'book client must use same-origin Bertina API'],
 ["let bookPaymentReady=false",'payment must initialise fail-closed'],
 ["let deliveryCaptureReady=false",'order capture must initialise fail-closed'],
 ["health.capabilities?.books===true",'generic checkout cannot authorise book payment'],
 ["health.orderCapture===true",'non-monetary capture must have an explicit capability'],
 ["bookPaymentReady?'/api/commerce/create':'/api/commerce/prepare'",'order-only flow must never create payment'],
 ["btn.disabled=!canCapture",'order submission must require capture readiness']
])requireSource(checkout,needle,why);

for(const needle of [
 "receipt.orderId!==id","receipt.currency!=='IRT'","receipt.amountToman",
 'Array.isArray(receipt.items)','item.subtotalToman!==item.quantity*item.unitToman',
 'total!==receipt.amountToman'
])requireSource(page,needle,'payment-result page missing receipt validation: '+needle);

requireSource(page,'<meta name="robots" content="noindex,nofollow,noarchive">','receipt page must remain noindex/nofollow/noarchive');
requireSource(paymentStart,'btn.setAttribute("rel","noopener noreferrer")','payment handoff must retain noreferrer');
requireSource(paymentStart,'params.getAll("gateway").length!==1','payment handoff must reject duplicate gateway values');

// Execute the active PHP status route on in-memory fixtures, never a live order.
const result=spawnSync('php',['tests/bertina-receipt-contract.php'],{encoding:'utf8'});
if(result.error||result.status!==0){
 failures.push('Bertina receipt fixture tests failed: '+(result.error?.message||result.stderr||result.stdout));
}else{
 process.stdout.write(result.stdout);
}
if(failures.length){
 console.error('Commerce receipt contract failures ('+failures.length+')');
 failures.forEach(x=>console.error('✗ '+x));
 process.exit(1);
}
console.log('Bertina paid-receipt contract validated on source and isolated fixtures; live payment is not certified.');
