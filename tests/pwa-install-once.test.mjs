import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),get=p=>fs.readFileSync(path.join(root,p),'utf8');
test('homepage and language gateway share a single persistent offer key',()=>{
 const site=get('assets/js/site.js'),gateway=get('assets/js/language-gateway.js');
 assert.match(site,/jr-pwa-auto-shown-v1/);
 assert.match(gateway,/jr-pwa-auto-shown-v1/);
 assert.match(site,/localStorage\.setItem\(seenKey/);
 assert.match(gateway,/localStorage\.setItem\(seenKey/);
 assert.doesNotMatch(site,/sessionStorage\.getItem\('pwa-install-dismissed'\)/);
 assert.doesNotMatch(gateway,/sessionStorage\.getItem\('ios-install-dismissed'\)/);
});
test('the automatic offer is remembered when rendered, not only when dismissed',()=>{
 const site=get('assets/js/site.js'),gateway=get('assets/js/language-gateway.js');
 assert.match(site,/document\.body\.append\(wrap\);markSeen\(\);/);
 assert.match(site,/document\.body\.append\(wrap\);mark\(\);/);
 assert.match(gateway,/document\.body\.appendChild\(wrap\);mark\(\);/);
});
test('manual install is available on both homepages without repeating the popup',()=>{
 const extra=get('assets/js/site-extras.js'),gateway=get('assets/js/language-gateway.js');
 assert.match(extra,/data-jr-home-install/);
 assert.match(extra,/^.*jrPwaRequest.*$/m);
 assert.match(extra,/\/\^\s*\\?\/\(\?:fa\|en\)/);
 assert.match(gateway,/jr-home-install/);
 assert.match(gateway,/const install=async/);
});
test('private routes and standalone users are excluded from automatic install prompts',()=>{
 const site=get('assets/js/site.js');
 assert.match(site,/if\(privatePath\|\|standalone\|\|readSeen\(\)/);
 assert.match(site,/if\(!ios\|\|standalone\|\|JR_PRIV\(relative\)\|\|seen\(\)\)return;/);
 const gateway=get('assets/js/language-gateway.js');
 assert.match(gateway,/if\(standalone\) return;/);
});
test('site navigation JavaScript stays inside 25 KiB source budget',()=>{
 assert.ok(fs.statSync(path.join(root,'assets/js/site.js')).size<=25600);
});
