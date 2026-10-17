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
const adminFa=read('fa/app/admin/index.html');
const adminEn=read('en/account/admin/index.html');
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
 ['bank settlement is not assumed',admin.includes("'bankSettlementVerified'=>false")],
 ['receipt requires server verified claim',sponsor.includes("if(verified)")&&sponsor.includes('مشاهده تأییدیه پرداخت')],
 ['admin claim totals use provider claim match',admin.includes("c.transaction_id=o.provider_trans_id")&&admin.includes("c.verified_amount=o.provider_amount")],
 ['admin donation scope is complete',admin.includes("all_time_internal_donation_ledger")&&!admin.includes('sampled_internal_donation_ledger')],
 ['donation totals count each order only once',admin.includes('EXISTS (')],
 ['admin UI uses complete donation scope',operations.includes("giving.scope==='all_time_internal_donation_ledger'")],
 ['shared document exporter is loaded',dashboard.includes('/assets/js/jr-document-export.js')],
 ['print and PDF use one export engine',sponsor.includes('JRDocumentExport?.print(receipt)')&&sponsor.includes('JRDocumentExport?.savePdf(receipt)')],
 ['approved Persian symbol and wordmark are used on verified receipt',sponsor.includes('/identity/references/persian-symbol-gold.png')&&sponsor.includes('/identity/references/persian-wordmark-gold.png')],
 ['both admin dashboards load updated finance module',adminFa.includes('operations-commerce.js?v=20261017-private-document-workflow-v4')&&adminEn.includes('operations-commerce.js?v=20261017-private-document-workflow-v4')]
];
for(const [name,ok] of checks){process.stdout.write((ok?'PASS':'FAIL')+' '+name+'\n');assert.ok(ok,name)}
console.log('Donation integration source contracts passed: '+checks.length);
