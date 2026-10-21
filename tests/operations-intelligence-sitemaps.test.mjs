import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../assets/js/operations-intelligence.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../fa/app/admin/index.html',import.meta.url),'utf8');
test('admin schema sampler resolves sitemap indexes and URL sets without sampling XML as HTML',()=>{
 assert.match(js,/documentType==='sitemapindex'/);
 assert.match(js,/xml\.documentElement\?\.localName!=='urlset'/);
 assert.match(js,/getElementsByTagName\('sitemap'\)/);
 assert.match(js,/getElementsByTagName\('url'\)/);
 assert.match(js,/const approvedSitemap=/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/destination\.origin!==location\.origin/);
 assert.match(js,/body\.length>500000/);
 assert.doesNotMatch(js,/const urls=new Set\(/);
});
test('sample balances both languages and stays capped at 32 pages',()=>{
 assert.match(js,/for\(let i=0;i<16;i\+\+\)/);
 assert.match(js,/for\(const lang of \['fa','en'\]\)/);
 assert.match(js,/addPublicPage\('\/fa\/'\)/);
 assert.match(js,/addPublicPage\('\/en\/'\)/);
 assert.match(js,/!allowed\(u\.pathname\)/);
 assert.match(js,/sitemapFailed/);
});
test('admin loads a distinct cache-busted sampler and retains MFA workspace protection',()=>{
 assert.ok(html.includes('operations-intelligence.js?v=20261021-sitemapindex-v2'));
 assert.ok(html.includes('id="ops-workspace" hidden'));
 assert.ok(js.includes("document.getElementById('ops-workspace')?.hidden"));
});
