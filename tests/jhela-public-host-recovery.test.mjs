/* Host-scoped JHELA public restoration contract; source-only, no live claims. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const host=String.raw`^journal\.drjavadrezazadeh\.com(?::[0-9]+)?$`;
for(const path of ['.htaccess','journal/.htaccess']){
 test('JHELA safe public bridge is scoped and reversible in '+path,()=>{
  const s=read(path);
  assert.ok(s.includes('RewriteEngine On'));
  assert.ok(s.includes(host),'redirect must never capture main domain');
  assert.ok(s.includes('RewriteCond %{REQUEST_METHOD} !^(GET|HEAD)$'));
  assert.ok(s.includes('RewriteRule ^ - [F,L]'),'POST to subdomain must fail closed');
  assert.ok(s.includes('RewriteRule ^journal(?:/(.*))?$ https://drjavadrezazadeh.com/journal/$1 [R=302,L,NE]'));
  assert.ok(s.includes('RewriteRule ^(.*)$ https://drjavadrezazadeh.com/journal/$1 [R=302,L,NE]'));
  assert.ok(!s.includes('R=301')||path==='.htaccess','bridge itself must not be permanent');
 });
}
test('main host routing and commercial authentication remain untouched',()=>{
 const root=read('.htaccess');
 assert.ok(root.indexOf('# JHELA public-site recovery')<root.indexOf('# Canonical transport'));
 assert.ok(root.includes('RewriteCond %{HTTPS} !=on [OR]'));
 assert.ok(root.includes('RewriteRule ^ https://drjavadrezazadeh.com%{REQUEST_URI} [R=301,L,NE]'));
 const php=read('api/jhela-intake.php');
 assert.ok(php.includes('manuscript_submissions_paused'));
 assert.ok(read('journal/submission/index.html').includes('submissions are temporarily closed'));
 assert.ok(read('journal/index.html').includes('https://drjavadrezazadeh.com/journal/'));
});
test('public bilingual dashboards do not promise obsolete OJS workflows',()=>{
 const en=read('journal/dashboard/index.html');
 const fa=read('journal/fa/dashboard/index.html');
 assert.ok(en.includes('Native editorial workflow not yet certified'));
 assert.ok(!en.includes('OJS'));
 assert.ok(!fa.includes('OJS'));
 assert.ok(read('assets/js/jhela-author-workspace.js').includes('Transferred to editorial peer review'));
});
