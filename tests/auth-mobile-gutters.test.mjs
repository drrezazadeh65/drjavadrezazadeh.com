import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>readFileSync(path.join(root,p),'utf8');
const css=read('assets/css/auth-premium-2026.css');
const version='auth-premium-2026.css?v=20261021-mobile-luxury-v3';

test('authentication mobile safe gutter survives generic article-section resets',()=>{
  assert.match(css,/JR mobile authentication safe-gutter and luxury refinement/);
  assert.match(css.slice(css.indexOf('JR mobile authentication safe-gutter')),/@media\(max-width:700px\)/);
  assert.match(css,/\.auth-page main#main\s*\{[^}]*width:100%!important;[^}]*padding:20px max\(var\(--jr-auth-mobile-gutter\)/s);
  assert.match(css,/\.auth-page \.article-shell\.auth-shell>section:not\(\.role-status-grid\)\s*\{[^}]*padding:8px clamp\(19px,5\.7vw,27px\) 27px!important;/s);
  assert.match(css,/\.auth-page \.auth-form input,[\s\S]*?font-size:16px;/);
  assert.match(css,/role-status-grid\\{[\\s\\S]*?padding:14px!important/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

for(const locale of ['fa','en']){
  for(const type of ['login','register']){
    test(`${locale}/${type}: form, responsive viewport, revised skin, and secure controls remain wired`,()=>{
      const html=read(`${locale}/${type}/index.html`);
      assert.ok(html.includes('width=device-width,initial-scale=1,viewport-fit=cover'));
      assert.ok(html.includes(version));
      assert.ok(html.includes(`data-auth-form="${type}"`));
      assert.ok(html.includes('data-auth-live-control'));
      assert.ok(html.includes('assets/js/customer-auth.js'));
      assert.ok(html.includes('noindex,follow,noarchive'));
      assert.ok(html.includes('autocomplete='));
    });
  }
}
