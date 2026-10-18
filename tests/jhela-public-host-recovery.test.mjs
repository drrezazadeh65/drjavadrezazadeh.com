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
 assert.ok(php.includes('manuscript_intake_disabled'));
 assert.ok(read('journal/submission/index.html').includes('Submission availability is verified in real time'));
 assert.ok(read('journal/index.html').includes('https://drjavadrezazadeh.com/journal/'));
});
test('public bilingual dashboards do not promise obsolete OJS workflows',()=>{
 const en=read('journal/dashboard/index.html');
 const fa=read('journal/fa/dashboard/index.html');
 assert.ok(en.includes('Native editorial workflow not yet certified'));
 assert.ok(en.includes('Intake subject to live readiness'));
 assert.ok(!en.includes('Formal submissions closed'));
 assert.ok(!read('journal/reviewer-registration/index.html').includes('OJS workflow'));
 assert.ok(read('journal/fees/index.html').includes('server-readiness-gated preliminary intake'));
 assert.ok(!en.includes('OJS'));
 assert.ok(!fa.includes('OJS'));
 assert.ok(!/\bOJS\b/i.test(read('assets/js/jhela-author-workspace.js')));
 assert.ok(read('assets/js/jhela-author-workspace.js').includes('Status awaiting editorial verification'));
});

test('public TLS probe only accepts the exact HTTPS canonical recovery bridge',()=>{
 const probe=read('scripts/jhela-journal-public-probe.mjs');
 assert.ok(probe.includes("redir?.scheme==='https'&&redir.hostname==='drjavadrezazadeh.com'&&redir.pathname==='/journal/'"));
 assert.ok(probe.includes("diagnostics.push('PUBLIC_RECOVERY_BRIDGE_ACTIVE')"));
 assert.ok(probe.includes("diagnostics.push('CANONICAL_REDIRECTS_TO_OTHER_HOST')"));
 assert.ok(probe.includes("if(unsafe.transportVerified)throw new Error('cross-origin redirect must fail closed')"));
 assert.ok(probe.includes("publicLaunchAuthorized:false"));
});

test('the exact public recovery bridge is required by the sanitized Bertina release builder',()=>{
 const builder=read('scripts/build-public-site.mjs');
 assert.ok(builder.includes("'journal/.htaccess'"));
 const workflow=read('.github/workflows/jhela-bilingual-quality.yml');
 assert.ok(workflow.includes('node --test tests/jhela-public-host-recovery.test.mjs'));
 assert.ok(workflow.includes("      - '.htaccess'"));
});
