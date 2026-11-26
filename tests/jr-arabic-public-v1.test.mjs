import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateArabicPublicRoutes,localeNavigationMarkup} from '../scripts/jr-public-locale-navigation.mjs';
const routes=JSON.parse(fs.readFileSync('platform/jr-arabic-public-routes-v1.json','utf8')).routes;
test('all approved Arabic pages have reciprocal equivalents, canonical metadata, Arabic text and valid local links',()=>{
 const failures=[];assert.equal(validateArabicPublicRoutes(process.cwd(),routes,failures),13);assert.deepEqual(failures,[]);
});
test('language menu preserves true equivalents and identifies fallback as homepage',()=>{
 const menu=localeNavigationMarkup('fa',{en:'/en/about/'});
 assert.match(menu,/href="\/en\/about\/" hreflang="en"/);
 assert.match(menu,/href="\/ar\/" class="jr-language-fallback"/);
 assert.doesNotMatch(menu,/href="\/ar\/" hreflang="ar"/);
 assert.match(menu,/aria-current="page"/);
 assert.throws(()=>localeNavigationMarkup('invalid',{}));
});
