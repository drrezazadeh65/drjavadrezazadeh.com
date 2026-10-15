/* Regression contract for direct donations and owner reporting. Run: node scripts/donation-cycle-audit.cjs */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const dashboard=read('fa/customer-dashboard/index.html');
const direct=read('assets/js/dashboard-direct-donation.js');
const sponsor=read('assets/js/student-sponsorship-dashboard.js');
const admin=read('api/operations-commerce.php');
const operations=read('assets/js/operations-commerce.js');
const api=read('api/index.php');
const checks=[
 ['dashboard has a direct donation form',dashboard.includes('data-direct-donation-form')],
 ['dashboard loads direct donation script',dashboard.includes('/assets/js/dashboard-direct-donation.js')],
 ['dashboard mounts giving history',dashboard.includes('data-pending-giving')],
 ['donation form uses authenticated email',direct.includes('/api/auth/me')&&direct.includes('identity.user.email')],
 ['donation form calls canonical donation API',direct.includes('/api/donations/create')],
 ['donation redirect stays same-origin',direct.includes('url.origin!==location.origin')],
 ['account history is server backed',sponsor.includes('/api/commerce/history')],
 ['paid history requires claim verification',sponsor.includes('order.paymentVerified===true')],
 ['donation payment is recorded as an order',api.includes("if($path==='/donations/create'")&&api.includes('commerce_orders')],
 ['admin donation totals are separate',admin.includes("$snapshot['donations']")],
 ['admin matched payments use claim ledger',admin.includes('commerce_payment_claims c')],
 ['admin view renders donation totals',operations.includes('giving.claimMatchedAmountToman')],
 ['bank settlement is not assumed',admin.includes("'bankSettlementVerified'=>false")]
];
for(const [name,ok] of checks){process.stdout.write((ok?'PASS':'FAIL')+' '+name+'\n');assert.ok(ok,name)}
console.log('Donation integration source contracts passed: '+checks.length);
