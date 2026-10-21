import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const [lang,path] of [['fa','fa/ketab-ha/how-languages-are-learned/index.html'],['en','en/books/how-languages-are-learned/index.html']]){
 test(lang+' HLL5 reciprocal language metadata and noncommercial publication status',()=>{
  const html=read(path);
  assert.ok(html.includes('lang="'+lang+'"'));
  assert.ok(html.includes('hll5-book-premium-20261021.css'));
  for(const route of ['/fa/ketab-ha/how-languages-are-learned/','/en/books/how-languages-are-learned/'])assert.ok(html.includes('href="https://drjavadrezazadeh.com'+route+'"'));
  assert.ok(html.includes('class="hll5-facts"'));
  assert.ok(!/add-to-cart|buy-now|preorder-now/.test(html));
 });
}
test('book is discoverable from both directories',()=>{
 assert.ok(read('fa/ketab-ha/index.html').includes('how-languages-are-learned/'));
 assert.ok(read('en/books/index.html').includes('href="/en/books/how-languages-are-learned/"'));
});

test('both HLL5 public pages are in language-specific XML sitemaps',()=>{
 for(const [locale,route] of [['fa','fa/ketab-ha/how-languages-are-learned/'],['en','en/books/how-languages-are-learned/']]){
  assert.ok(read('sitemap-'+locale+'.xml').includes('https://drjavadrezazadeh.com/'+route));
 }
});

test('editorial book experience preserves factual status and accessible side rail in both languages',()=>{
 for(const [lang,path] of [['fa','fa/ketab-ha/how-languages-are-learned/index.html'],['en','en/books/how-languages-are-learned/index.html']]){
  const html=read(path);
  assert.ok(html.includes('class="hll5-page-grid"'));
  assert.ok(html.includes('class="hll5-primary" dir="'+(lang==='fa'?'rtl':'ltr')+'"'));
  assert.ok(html.includes('class="hll5-status-panel"'));
  assert.ok(html.includes('class="hll5-themes"'));
  assert.ok(html.includes('aria-labelledby="hll5-sidebar-'+lang+'"'));
  assert.ok(!/name="price"|checkoutEnabled=true|data-preorder/.test(html));
 }
 const styles=read('assets/css/hll5-book-premium-20261021.css');
 assert.ok(styles.includes('.hll5-page-grid'));
 assert.ok(styles.includes('@media(max-width:760px)'));
});

test('both public HLL5 book introductions are findable through the existing multilingual search engine',()=>{
 const index=JSON.parse(read('assets/search-index.json'));
 for(const [lang,path] of [['fa','fa/ketab-ha/how-languages-are-learned/'],['en','en/books/how-languages-are-learned/']]){
  const entry=index.filter(x=>x.path===path && x.lang===lang);
  assert.equal(entry.length,1,lang+' book search entry must be unique');
  assert.ok(entry[0].title && entry[0].summary && entry[0].keywords);
  assert.ok(!/checkout|preorder-now|buy-now/.test(entry[0].path));
 }
});
