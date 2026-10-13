import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPath,classifyPaths} from '../scripts/bertina-auto-release-policy.mjs';

const publicPaths=[
  'fa/index.html','en/services/index.html','journal/index.html',
  'journal/fa/aims-scope/index.html','journal/sitemap.xml',
  'sitemap-news.xml','sitemap.xml','llms.txt','feed.xml',
  'assets/css/journal-v2.css','assets/images/hero.webp',
  'assets/fonts/Inter.woff2','favicon.svg','robots.txt',
  '.bertina-deploy-trigger'
];
const controlledPaths=[
  'api/auth.php','api/commerce/health.php','platform/observability-policy.json',
  'scripts/build-public-site.mjs','scripts/bertina-auto-release-policy.mjs',
  'tests/analytics-consent-lifecycle.test.mjs','tests/payment.php',
  '.github/workflows/deploy-bertina.yml','docs/governance/STAGE09_PRIVATE_DEPENDENCIES.json',
  'docs/governance/V5_CONTROLLED_CPANEL_RELEASE_20261013.md',
  'docs/BERTINA_MYSQL_SCHEMA.sql','assets/js/analytics-adapter.js',
  'assets/js/commerce-checkout.js','assets/data/book-catalog.json',
  'fa/shop/checkout/index.html','en/login/index.html','fa/register/index.html',
  'journal/submission/index.html','journal/dashboard/index.html',
  'fa/customer-dashboard/index.html','fa/bazyabi-hesab/index.html',
  'journal/reviewer-registration/index.html',
  'fa/golden-talent/student/index.html','en/request-consultation/index.html',
  'en/golden-talent/assessment/index.html','fa/legacy.php','fa/site.js',
  '.htaccess','sw.js','AGENTS.md','README.md','package.json',
  '.bertina-backup-trigger','new-unknown-file.dat','../fa/index.html',
  'fa//index.html','fa\\index.html'
];
test('public site documents and static assets are eligible',()=>{
  for(const path of publicPaths) assert.equal(classifyPath(path),'public',path);
});
test('runtime, financial, private, protected and unclassified files remain manual',()=>{
  for(const path of controlledPaths) assert.equal(classifyPath(path),'controlled',path);
});
test('ordinary non-shipped evidence is harmless but never triggers deployment alone',()=>{
  for(const path of ['docs/governance/OPERATIONAL_ACCEPTANCE_20_PRIORITIES_20261013.md','docs/notes.txt']) {
    assert.equal(classifyPath(path),'unshipped',path);
    assert.equal(classifyPaths([path]).canAutomaticallyDeploy,false);
  }
});
test('public + unshipped documentation may deploy; protected anywhere blocks',()=>{
  assert.equal(classifyPaths(['fa/index.html','docs/governance/OPERATIONAL_ACCEPTANCE_20_PRIORITIES_20261013.md']).canAutomaticallyDeploy,true);
  assert.equal(classifyPaths(['fa/index.html','docs/notes.md','tests/a.test.mjs']).canAutomaticallyDeploy,false);
  assert.equal(classifyPaths(['fa/index.html','assets/js/analytics-adapter.js']).canAutomaticallyDeploy,false);
  assert.equal(classifyPaths(['docs/notes.md','docs/notes.md']).groups.unshipped.length,1);
});
