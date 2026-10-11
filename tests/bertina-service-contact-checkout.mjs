import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const php=readFileSync('api/index.php','utf8');
const src=readFileSync('assets/js/commerce-checkout.js','utf8');
const start=php.indexOf("if($path==='/commerce/create'&&$verb==='POST')");
const end=php.indexOf("if($path==='/commerce/status'&&$verb==='GET')",start);
assert.ok(start>0&&end>start,'commerce route exists');
const route=php.slice(start,end);
assert.match(route,/normalizedCustomer\(\$b\['customer'\]/,'book requires complete delivery address');
assert.match(route,/normalizedServiceBuyer\(\$b\['customer'\]/,'service/VIP requires contact');
assert.match(route,/\$customerEmail=\$customer\['email'\]/,'server stores purchase contact email');
assert.match(route,/\$customerJson=json_encode\(\$customer/,'server stores contact details');
assert.doesNotMatch(route,/registrationReady\(\)|requireAuth\(|email_verified_at/,'guest purchase not blocked by verification');
assert.match(route,/if\(!commerceReady\(\)\)/,'payment readiness and fulfilment remain gated');
assert.match(route,/requirePostOrigin\(\)/,'origin guard retained');
assert.match(src,/async function pay\(items,button,message,customer\)/);
assert.match(src,/JSON\.stringify\(\{items,customer\}\)/);
assert.match(src,/input\.required=field\.name!=='phone'/,'name and email are required in UI');
assert.match(src,/buyerContact\(\)/,'purchase button validates buyer contact');
assert.doesNotMatch(src,/\/auth\/register/,'no account required');
for (const path of ['fa/services/checkout/index.html']) {
 assert.match(readFileSync(path,'utf8'),/data-commerce-services/);
}
console.log('PASS: server-and-client service buyer identification without unsafe account activation');
