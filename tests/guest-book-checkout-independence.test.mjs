import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const php=readFileSync('api/index.php','utf8');
const pos=php.indexOf("if($path==='/commerce/create'&&$verb==='POST')");
const end=php.indexOf("if($path==='/commerce/status'",pos);
assert.ok(pos>=0&&end>pos,'commerce creation endpoint exists');
const route=php.slice(pos,end);
assert.doesNotMatch(route,/requireAuth|currentUser|email_verified_at|authReady|registrationReady|requireSession/, 'book payments must not depend on account activation');
assert.match(route,/requirePostOrigin\(\)/,'origin controls remain active');
assert.match(route,/if\(!commerceReady\(\)\)/,'gateway/fulfilment readiness remains mandatory');
assert.match(route,/normalizedCustomer/,'delivery identity and email are validated');
assert.match(route,/gatewayPost/,'payments remain server initiated');
assert.match(route,/UPDATE commerce_orders SET state='pending'/,'gateway creates pending, not paid, orders');

const js=readFileSync('assets/js/book-store.js','utf8');
assert.match(js,/bookPaymentReady\?'\/api\/commerce\/create':'\/api\/commerce\/prepare'/,'guest checkout uses real commerce routes');
assert.doesNotMatch(js,/window\.location.*register|\/auth\/register/,'guest book checkout does not require registration redirect');

for (const language of ['fa','en']) {
 const shop=readFileSync(language+'/shop/index.html','utf8');
 const checkout=readFileSync(language+'/shop/checkout/index.html','utf8');
 const register=readFileSync(language+'/register/index.html','utf8');
 assert.match(shop,/guest checkout|ثبت‌نام و تأیید ایمیل اجباری نیست/,'bookstore explains guest orders');
 assert.match(checkout,/Guest book checkout|خرید بدون ثبت‌نام/,'checkout explains guest orders');
 assert.match(register,/data-guest-checkout-note/,'failed signup has a guest book purchase option');
 assert.match(register,/href="\.\.\/shop\/"/,'signup guest purchase link points to canonical store route');
}
console.log('PASS: bilingual book guest checkout independent of authentication, while payment validation remains gated');
