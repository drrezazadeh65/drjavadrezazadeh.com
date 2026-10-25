import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const text=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('original Bertina route mounts ONLY published public news search',()=>{
  const router=text('../../../api/index.php');
  assert.match(router,/if \(\$path==='\/news\/v1\/search'\)/);
  assert.match(router,/jrNewsPublicSearchRoute\(\$verb\)/);
  assert.doesNotMatch(router,/jrNewsHandleExistingBertinaRequest\(/);
});
test('original API news search endpoint requires two independent OFF-by-default release gates',()=>{
  const route=text('../../../api/news-public-search.php');
  assert.match(route,/\['jrei_news_search_enabled'\]\?\?false/);
  assert.match(route,/\['jrei_news_publisher_receipts_accepted'\]\?\?false/);
  assert.match(route,/fail\('news_search_not_enabled',503\)/);
  assert.match(route,/rateAllowed\(/);
  assert.match(route,/jrNewsPublishedSearch\(/);
  assert.doesNotMatch(route,/jrNewsPrivateOwner/);
});
test('only the source-reviewed public read model is shipped behind existing /api/internal denial',()=>{
  const build=text('../../../scripts/build-public-site.mjs');
  const originalDeny=text('../../../api/internal/.htaccess');
  assert.match(originalDeny,/Require\s+all\s+denied/);
  assert.match(build,/excludedTop=new Set\([^\n]*'platform'/);
  assert.match(build,/newsPrivateDir=path\.join\(out,'api\/internal\/jrei-news'\)/);
  assert.match(build,/const newsModelName='public-read-model\.php'/);
  assert.match(build,/fs\.writeFileSync\(path\.join\(newsPrivateDir,newsModelName\)/);
  assert.match(build,/News public-read model lost its owner-approved-only/);
});
test('published search SQL enforces both CMS and indexing receipts without private drafts',()=>{
  const code=text('../php/public-read-model.php');
  assert.match(code,/s\.index_state='PUBLISHED'/);
  assert.match(code,/p\.publisher_state='PUBLISHED'/);
  const auth=text('../php/standing-official-publication.php');
  assert.match(auth,/d\.action_code='APPROVE'/);
  assert.match(auth,/pol\.policy_code='OFFICIAL_PRIMARY_AUTO_NEWS'/);
  assert.match(code,/jrNewsPublicationAuthorityPredicate/);
  assert.match(code,/jrNewsStandingPublicSchemaInstalled/);
  assert.match(code,/s\.owner_approval_digest=v\.approval_digest/);
  assert.match(code,/s\.content_sha256=IF/);
  assert.doesNotMatch(code,/SELECT \* FROM jrei_news_editorial_versions/);
});

test('original CMS article dependencies survive the sanitized Bertina build',()=>{
  const original=text('../ui/news-assistant.js');
  const shipped=text('../../../assets/js/jrei-news-assistant-v1.js');
  const css=text('../../../assets/css/jrei-news-article-v1.css');
  const render=text('../php/verified-news-page-render.php');
  const build=text('../../../scripts/build-public-site.mjs');
  assert.equal(shipped,original,'shipping assistant must be exact reviewed source');
  assert.ok(render.includes('jrei-news-article-v1.css'));
  assert.ok(render.includes('jrei-news-assistant-v1.js'));
  assert.ok(render.includes('/assets/js/assistant.js'));
  assert.ok(render.includes('data-jrei-existing-assistant-slot'));
  assert.ok(shipped.includes('openOriginalAssistant'));
  assert.ok(shipped.includes('location.origin'));
  assert.ok(shipped.includes('textarea.value=safe'));
  assert.ok(!shipped.split(String.fromCharCode(10)).some(line=>line.trimStart().startsWith('form.submit(')));
  assert.ok(!shipped.includes('fetch('));
  assert.ok(css.includes('.ni-article'));
  assert.ok(css.includes('data-jrei-news-context'));
  assert.ok(css.includes('@media(max-width:600px)'));
  assert.ok(build.includes('Original JREI News published article assistant/style assets missing'));
});
