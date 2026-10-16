import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Run AFTER scripts/build-public-site.mjs in isolated GitHub Actions.
// No deployment, credentials or access to real Bertina environment.
const root=process.cwd();
const publicSite=path.join(root,'.public-site');
const required=[
 'api/index.php','api/golden-talent.php','api/golden-talent-consent.php',
 'api/golden-talent-consent-write.php',
 'api/operations.php','api/operations-scientific-schema.php',
 'assets/js/operations-scientific-schema.js','fa/app/admin/index.html',
 'en/account/admin/index.html',
 'assets/css/jr-scientific-experience-v1.css','assets/js/bahar-formative-workspace-v1.js',
 'fa/app/student/bahar/index.html','en/golden-talent/dashboard/bahar/index.html',
 'fa/customer-dashboard/index.html'
];
for(const rel of required)
 assert.ok(fs.statSync(path.join(publicSite,rel)).isFile(),'Release missing '+rel);
for(const excluded of ['platform','foundation','tests','database','scripts'])
 assert.equal(fs.existsSync(path.join(publicSite,excluded)),false,
  'Restricted engineering directory leaked to public archive: '+excluded);
const api=fs.readFileSync(path.join(publicSite,'api/golden-talent.php'),'utf8');
const projector=fs.readFileSync(path.join(publicSite,'api/golden-talent-consent.php'),'utf8');
const internalWriter=fs.readFileSync(path.join(publicSite,'api/golden-talent-consent-write.php'),'utf8');
const operations=fs.readFileSync(path.join(publicSite,'api/operations.php'),'utf8');
const schema=fs.readFileSync(path.join(publicSite,'api/operations-scientific-schema.php'),'utf8');
const alias=fs.readFileSync(path.join(root,'platform/bertina-consent-projection.php'),'utf8');
const schemaAlias=fs.readFileSync(path.join(root,'platform/bertina-scientific-schema-readiness.php'),'utf8');
assert.match(api,/\$projector=__DIR__\.'\/golden-talent-consent\.php'/,
 'Guarded API does not load packaged consent implementation');
assert.match(api,/LIMIT 1025/, 'Consent history must use fail-closed bounded read');
assert.match(projector,/BERTINA_API_BOOTSTRAPPED/, 'Direct-access guard is missing');
assert.match(internalWriter,/BERTINA_API_BOOTSTRAPPED/, 'Standalone consent writer must be HTTP guarded');
assert.match(internalWriter,/function goldenTalentInternalWithdrawConsent\(/, 'Internal withdrawal service missing');
assert.match(internalWriter,/GT_INTERNAL_CONSENT_WRITE_ENABLED/, 'Explicit fail-closed rollout gate missing');
assert.doesNotMatch(api,/require_once __DIR__\.'\/golden-talent-consent-write\.php'/,
 'Internal consent write must not be live-wired to Golden Talent routes');
assert.match(schema,/BERTINA_API_BOOTSTRAPPED/, 'Schema helper direct-access guard missing');
assert.match(schema,/LIMIT 0/, 'Schema helper must probe without reading rows');
assert.match(schema,/scientific-structural-preflight-v2/, 'Sanitized admin endpoint must use strict safeguarding schema v2');
assert.match(schema,/'safeguarding'=>\[/, 'Sanitized read-only endpoint missing age/assent requirements');
assert.match(operations,/if \(!\$fresh\) fail\('admin_mfa_required',403\)/, 'MFA guard missing');
assert.match(operations,/\/admin\/operations\/scientific\/schema-readiness/, 'Scientific schema route missing');
assert.match(operations,/require_once __DIR__\.'\/operations-scientific-schema\.php'/, 'Schema route includes excluded dependency');
assert.match(projector,/function bertinaCurrentConsent\(/,'Canonical consent function missing');
assert.ok(!projector.includes('$_GET')&&!projector.includes('$_POST')&&!projector.includes('$_COOKIE'));
assert.match(alias,/\/api\/golden-talent-consent\.php/,
 'Internal prototype must reference canonical API implementation');
assert.match(schemaAlias,/\/api\/operations-scientific-schema\.php/, 'Schema prototype must use packaged implementation');
for(const rel of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=fs.readFileSync(path.join(publicSite,rel),'utf8');
  assert.match(html,/id="ops-scientific-schema"/, 'Private schema disclosure missing: '+rel);
  assert.match(html,/\/assets\/js\/operations-scientific-schema\.js/, 'Private schema UI script missing: '+rel);
  assert.match(html,/operations-scientific-schema\.js\?v=20261016-p0-schema-v2/,
    'Stale cached v1 JavaScript would mislabel missing safeguarding tables: '+rel);
}
const scientificUi=fs.readFileSync(path.join(publicSite,'assets/js/operations-scientific-schema.js'),'utf8');
assert.match(scientificUi,/credentials:'same-origin'/, 'Private scientific schema read lost session scope');
assert.match(scientificUi,/cache:'no-store'/, 'Private readiness must not use browser cache');
assert.match(scientificUi,/scientific-structural-preflight-v2/,
  'Bilingual admin UI must fail closed on old schema version');
assert.match(scientificUi,/\['safeguarding',2\]/,
  'Missing mandatory age and learner-assent domain in admin UI');
console.log('Bertina sanitized package consent and MFA schema dependencies: passed');


for(const rel of ['fa/app/student/bahar/index.html','en/golden-talent/dashboard/bahar/index.html']){
  const html=fs.readFileSync(path.join(publicSite,rel),'utf8');
  assert.match(html,/data-bahar-formative/, 'The BAHAR formative worksheet must be usable: '+rel);
  assert.match(html,/data-bahar-plan-form/, 'BAHAR working plan form missing: '+rel);
  assert.match(html,/bahar-formative-workspace-v1\.js/, 'BAHAR interaction script not packaged: '+rel);
  assert.match(html,/jr-scientific-experience-v1\.css/, 'Shared premium brand system missing: '+rel);
}
const baharJS=fs.readFileSync(path.join(publicSite,'assets/js/bahar-formative-workspace-v1.js'),'utf8');
for(const unsafe of ['localStorage','sessionStorage','fetch(','XMLHttpRequest(','WebSocket(']){
  assert.equal(baharJS.includes(unsafe),false,
    'Browser-only BAHAR must not retain or transfer private worksheet values: '+unsafe);
}
const dashboard=fs.readFileSync(path.join(publicSite,'fa/customer-dashboard/index.html'),'utf8');
assert.match(dashboard,/jr-sci-pathway/, 'Unified Golden Talent/RCAS/BAHAR cards missing from dashboard');
assert.match(dashboard,/persian-brand-symbol\.png/, 'Canonical Persian mark missing from dashboard');
