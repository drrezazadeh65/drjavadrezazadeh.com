import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {YANDEX_OWNERSHIP_FILE,YANDEX_OWNERSHIP_HTML,
  isOwnershipVerificationArtifact,verifyOwnershipArtifact} from '../scripts/site-ownership-verification.mjs';

const root=process.cwd();
test('Yandex machine verification is exact, public-root only and not a content page',()=>{
 assert.equal(YANDEX_OWNERSHIP_FILE,'yandex_24a6d171a0af5df0.html');
 assert.equal(YANDEX_OWNERSHIP_HTML.includes('Verification: 24a6d171a0af5df0'),true);
 assert.equal(readFileSync(YANDEX_OWNERSHIP_FILE,'utf8'),YANDEX_OWNERSHIP_HTML);
 assert.equal(verifyOwnershipArtifact(root),path.join(root,YANDEX_OWNERSHIP_FILE));
 assert.equal(isOwnershipVerificationArtifact(YANDEX_OWNERSHIP_FILE),true);
 assert.equal(isOwnershipVerificationArtifact('en/'+YANDEX_OWNERSHIP_FILE),false);
 assert.equal(isOwnershipVerificationArtifact('other-token.html'),false);
});
test('SEO inventory and packaging treat only exact ownership artifact as non-editorial',()=>{
 for(const file of [
 'scripts/seo-regression.mjs','scripts/responsive-resilience-audit.mjs',
 'scripts/metadata-uniqueness-audit.mjs','scripts/accessibility-source-audit.mjs',
 'scripts/performance-source-audit.mjs','scripts/master-audit.mjs'
 ]){
  const source=readFileSync(file,'utf8');
  assert.match(source,/isOwnershipVerificationArtifact\(path\.relative\(root,/);
 }
 const builder=readFileSync('scripts/build-public-site.mjs','utf8');
 assert.match(builder,/verifyOwnershipArtifact\(root\)/);
 assert.match(builder,/verifyOwnershipArtifact\(out\)/);
 assert.match(builder,/!isOwnershipVerificationArtifact\(path\.relative\(out,p\)\)/);
});
