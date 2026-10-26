/**
 * Final-only source contracts: Persian typography, logical alignment, and
 * mobile transfer protection across the public ecosystem.
 * Do not run until the owner-authorised consolidated QA.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const font='/assets/fonts/vazirmatn-variable-a501289a8559.woff2';

test('published Persian display uses one local licensed font, not an external CDN',()=>{
 const shared=read('assets/css/style.css');
 const standalone=read('assets/css/jr-bilingual-semantic-flow-2026.css');
 const journal=read('assets/css/journal-v2.css');
 const bookstore=read('assets/css/store-premium-editorial-2026.css');
 assert.ok(fs.existsSync('assets/fonts/vazirmatn-variable-a501289a8559.woff2'));
 assert.ok(fs.existsSync('assets/fonts/OFL-Vazirmatn.txt'));
 for(const css of [shared,standalone]){
  assert.ok(css.includes(font),'local heading font file');
  assert.match(css,/@font-face\s*\{/);
  assert.match(css,/font-display:swap/);
  assert.match(css,/h1,h2,h3,h4,h5,h6/);
 }
 for(const css of [journal,bookstore]){
  assert.match(css,/var\(--jr-fa-display/);
  assert.match(css,/html\[lang="fa"\]/);
  assert.match(css,/text-align:start/);
 }
 for(const page of [
  'fa/vip/index.html',
  'fa/vip/university-selection/index.html',
  'fa/vip/educator-development/index.html'
 ]){
  assert.match(read(page),/jr-bilingual-semantic-flow-2026\.css/);
 }
});

test('bilingual pages preserve native direction and no mixed-script overflow',()=>{
 for(const page of [
  'fa/shop/index.html','en/shop/index.html',
  'journal/fa/index.html','journal/index.html',
  'fa/vip/index.html','en/vip/index.html'
 ]){
  const html=read(page);
  const lang=page.startsWith('en/')||page==='journal/index.html'?'en':'fa';
  assert.match(html,new RegExp('<html[^>]+lang="'+lang+'"'));
  if(lang==='fa')assert.match(html,/dir="rtl"/);
  assert.match(html,/<meta[^>]+name="viewport"/);
 }
 const common=read('assets/css/style.css');
 assert.match(common,/overflow-wrap:anywhere/);
 assert.match(common,/text-align:start/);
 assert.match(common,/unicode-bidi:isolate/);
 const vip=read('assets/css/jr-bilingual-semantic-flow-2026.css');
 assert.match(vip,/hyphens: manual/);
});

test('small screens avoid pointless private dashboard mobile navigation payloads',()=>{
 const extras=read('assets/js/site-extras.js');
 assert.match(extras,/jrAfterFirstPaint/);
 assert.match(extras,/\/journal\//);
 assert.match(extras,/\/fa\/app\//);
 assert.match(extras,/\/en\/account\//);
 assert.match(extras,/\/fa\/shop\/checkout\//);
 assert.match(extras,/\/en\/golden-talent\/assessment\//);
 assert.match(extras,/import\('\/assets\/js\/mobile-app-v431\.js\?/);
 assert.match(extras,/document\.querySelector\('script\[data-jr-assistant\]'\)/);
 const nav=read('assets/js/mobile-app-v431.js');
 assert.match(nav,/document\.documentElement\.dataset\.jrMobileAppShellInitialized/);
});

test('performance gate can inspect all pages without relying on attribute ordering',()=>{
 const audit=read('scripts/performance-source-audit.mjs');
 assert.match(audit,/function attr\(tag,name\)/);
 assert.match(audit,/function hasRel\(tag,rel\)/);
 assert.match(audit,/scope:noindex\?'PRIVATE_OR_NONINDEX':'PUBLIC_INDEXABLE'/);
 assert.match(audit,/allHtmlRoutes:routeInventory\.length/);
 const seo=read('scripts/master-semantic-geo-audit.mjs');
 assert.match(seo,/FROZEN_SITEMAP_OMISSION/);
 assert.match(seo,/pageEvidence\.set\(route/);
 assert.match(seo,/HREFLANG_RECIPROCITY/);
});
