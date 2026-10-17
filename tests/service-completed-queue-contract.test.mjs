import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const php=read('api/operations-commerce.php');
const js=read('assets/js/operations-commerce.js');
const audit=read('scripts/donation-cycle-audit.cjs');

test('completed services are separately bounded, never merged into active queue',()=>{
 assert.match(php,/WHERE sc.status='delivered'/);
 assert.match(php,/ORDER BY sc.delivered_at DESC,sc.order_id DESC,sc.sku DESC LIMIT 50/);
 assert.match(php,/deliveredServiceCaseCount/);
 assert.match(php,/deliveredServiceActionQueue/);
 assert.match(php,/deliveredServiceQueueTruncated/);
 assert.match(js,/Array.isArray\(fulfilment.deliveredServiceActionQueue\)/);
 assert.match(js,/for\(const entry of fulfilment.deliveredServiceActionQueue\)/);
 const active=js.indexOf('for(const entry of fulfilment.serviceActionQueue)');
 const closed=js.indexOf('for(const entry of fulfilment.deliveredServiceActionQueue)');
 assert.ok(active>0&&closed>active);
});

test('completed delivery dashboard never implies customer satisfaction or settlement',()=>{
 assert.match(js,/neither buyer satisfaction nor bank settlement is implied/);
 assert.match(js,/ownerServiceFileWorkspace\(entry,item\)/);
 assert.match(js,/privateServiceFilesReady===true/);
 assert.match(js,/providerClaimMatchesOrder===true/);
 assert.match(php,/claim_transaction/);
 assert.match(php,/claim_amount/);
 assert.doesNotMatch(php,/UPDATE commerce_service_cases SET status='delivered'/);
});

test('admin web clients invalidate shared scripts without changing Donation auditing',()=>{
 const extract=body=>(body.match(/operations-commerce[.]js[?]v=[A-Za-z0-9_-]+/)||[])[0];
 const fa=extract(read('fa/app/admin/index.html'));
 const en=extract(read('en/account/admin/index.html'));
 const verified=extract(audit);
 assert.ok(fa&&en&&verified,'both admin shells and Donation audit must declare the script');
 assert.equal(fa,en,'both languages must use the same current script version');
 assert.equal(fa,verified,'Donation regression audit must track the currently loaded script');
});
