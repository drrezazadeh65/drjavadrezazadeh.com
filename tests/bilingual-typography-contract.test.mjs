import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared public styles preserve language-first paragraph alignment without strong global overrides',()=>{
 const css=read('assets/css/style.css');
 assert.match(css,/JR BILINGUAL TEXT ALIGNMENT CONTRACT 20261021/);
 assert.match(css,/html:lang\(fa\):not\(\[dir\]\)\{direction:rtl\}/);
 assert.match(css,/html:lang\(en\):not\(\[dir\]\)\{direction:ltr\}/);
 assert.match(css,/:where\(html:lang\(fa\),html:lang\(en\)\) body\{text-align:start\}/);
 const contract=css.slice(css.indexOf('/* JR BILINGUAL TEXT ALIGNMENT CONTRACT 20261021'));
 assert.doesNotMatch(contract,/!important/);
 assert.match(contract,/input\[type="email"\]/);
 assert.match(contract,/unicode-bidi:isolate/);
});
test('the preexisting private operations shell follows the same logical direction without a duplicate app shell',()=>{
 const css=read('assets/css/operations-control.css');
 assert.match(css,/JR ADMIN BILINGUAL TEXT ALIGNMENT CONTRACT 20261021/);
 assert.match(css,/\.ops\) :is\(input/);
 // Only audit the actual alignment declarations, not pre-existing global
 // [hidden] visibility and print-only protections, where important is
 // deliberate for private-panel safety and media correctness.
 const afterContract=css.slice(css.indexOf('/* JR ADMIN BILINGUAL TEXT ALIGNMENT CONTRACT'));
 const nextSection=afterContract.indexOf('/*',3);
 const alignment=nextSection<0?afterContract:afterContract.slice(0,nextSection);
 assert.doesNotMatch(alignment,/!important/);
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);
  assert.ok(html.includes('operations-control.css'));
  assert.ok(html.includes('id="ops-workspace" hidden'));
 }
});
test('main public flows retain language metadata and controlled body direction',()=>{
 for(const [language,path] of [['fa','fa/login/index.html'],['en','en/login/index.html'],['fa','fa/shop/index.html'],['en','en/shop/index.html'],['fa','journal/fa/index.html'],['en','journal/index.html']]){
  const html=read(path);
  assert.ok(new RegExp('<html[^>]*lang="'+language+'"').test(html),path+' language');
  assert.ok(html.includes('style.css'),path+' shared styles');
 }
});
