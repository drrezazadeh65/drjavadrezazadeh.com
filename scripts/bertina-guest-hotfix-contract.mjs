import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=[
 ['fa/register/index.html','data-guest-checkout-note','href="../shop/"'],
 ['en/register/index.html','data-guest-checkout-note','href="../shop/"'],
 ['fa/shop/index.html','ثبت‌نام و تأیید ایمیل اجباری نیست','href="./cart/"'],
 ['en/shop/index.html','guest checkout','href="./cart/"'],
 ['fa/shop/checkout/index.html','خرید بدون ثبت‌نام','id="shipping-details"'],
 ['en/shop/checkout/index.html','Guest book checkout','id="shipping-details"']
];
for (const [path,phrase,element] of pages) {
 const content=readFileSync(path,'utf8');
 assert.ok(content.includes(phrase),path+' guest path description missing');
 assert.ok(content.includes(element),path+' original checkout or site path missing');
 assert.ok(content.includes('rel="canonical"'),path+' canonical tag missing');
 assert.doesNotMatch(content,/<meta\s+name="robots"\s+content="noindex"/i,path+' should remain public');
}
const php=readFileSync('api/index.php','utf8');
const commerce=php.slice(php.indexOf("if($path==='/commerce/create'"),php.indexOf("if($path==='/commerce/status'"));
assert.ok(commerce.includes('if(!commerceReady())'),'no unconditional payments');
assert.ok(!commerce.includes('registrationReady()'),'no account registration required for books');
console.log('PASS: six scoped checkout pages, stable canonical links and server-side payment safety');
