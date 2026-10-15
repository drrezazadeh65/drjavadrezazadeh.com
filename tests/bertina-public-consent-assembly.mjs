import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Run AFTER scripts/build-public-site.mjs in isolated GitHub Actions.
// No deployment, credentials or access to real Bertina environment.
const root=process.cwd();
const publicSite=path.join(root,'.public-site');
const required=[
 'api/index.php','api/golden-talent.php','api/golden-talent-consent.php'
];
for(const rel of required)
 assert.ok(fs.statSync(path.join(publicSite,rel)).isFile(),'Release missing '+rel);
for(const excluded of ['platform','foundation','tests','database','scripts'])
 assert.equal(fs.existsSync(path.join(publicSite,excluded)),false,
  'Restricted engineering directory leaked to public archive: '+excluded);
const api=fs.readFileSync(path.join(publicSite,'api/golden-talent.php'),'utf8');
const projector=fs.readFileSync(path.join(publicSite,'api/golden-talent-consent.php'),'utf8');
const alias=fs.readFileSync(path.join(root,'platform/bertina-consent-projection.php'),'utf8');
assert.match(api,/\$projector=__DIR__\.'\/golden-talent-consent\.php'/,
 'Guarded API does not load packaged consent implementation');
assert.match(api,/LIMIT 1025/, 'Consent history must use fail-closed bounded read');
assert.match(projector,/BERTINA_API_BOOTSTRAPPED/, 'Direct-access guard is missing');
assert.match(projector,/function bertinaCurrentConsent\(/,'Canonical consent function missing');
assert.ok(!projector.includes('$_GET')&&!projector.includes('$_POST')&&!projector.includes('$_COOKIE'));
assert.match(alias,/\/api\/golden-talent-consent\.php/,
 'Internal prototype must reference canonical API implementation');
console.log('Bertina sanitized package consent dependency and private-directory guard: passed');
