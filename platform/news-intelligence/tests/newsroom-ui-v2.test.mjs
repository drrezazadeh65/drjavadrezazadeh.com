import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const prefixes={fa:'fa/akhbar/index.html',en:'en/news-insights/index.html'};
const canonical={fa:'https://drjavadrezazadeh.com/fa/akhbar/',
  en:'https://drjavadrezazadeh.com/en/news-insights/'};
const categories=['school','examinations','universities','employment',
  'language','international','research'];

test('the original site retains one canonical and one H1 for each newsroom',()=>{
  for(const locale of ['fa','en']){
    const page=read(prefixes[locale]);
    assert.equal((page.match(/<h1(?=[ >])/g)||[]).length,1,locale);
    assert.equal((page.match(/rel="canonical"/g)||[]).length,1,locale);
    assert.ok(page.includes('href="'+canonical[locale]+'"'),locale);
    for(const other of ['fa','en'])
      assert.ok(page.includes('<link rel="alternate" hreflang="'+other+
        '" href="'+canonical[other]+'">'),locale+' -> '+other);
    assert.ok(page.includes('hreflang="x-default"'),locale);
    assert.ok(page.includes('data-jr-newsroom'),locale);
    assert.ok(page.includes('data-jr-news-lead'),locale);
    assert.ok(page.includes('data-jr-calendar'),locale);
    assert.ok(page.includes('data-ni-archive-search data-ni-language="'+locale+'"'));
    assert.ok(page.includes('/assets/css/jrei-news-experience-v2.css'));
    assert.ok(page.includes('/assets/js/jrei-news-experience-v2.js'));
    const topics=[...page.matchAll(/class="jr-news-topic" href="[^"]+" data-jr-news-topic="([^"]+)"/g)]
      .map(m=>m[1]);
    assert.deepEqual(topics,categories,'original category IDs maintained: '+locale);
    for(const other of ['fa','en'])
      assert.ok(!page.includes('<link rel="canonical" href="'+canonical[other]+'"')||
        other===locale,'no cross-language canonical');
  }
});

test('official urgent ticker only reflects P0/48-hour source-published items',()=>{
  const feed=read('api/news-public-feeds.php');
  const ui=read('assets/js/jrei-news-experience-v2.js');
  assert.match(feed,/JOIN jrei_news_candidates c/);
  assert.match(feed,/s\.category_code,c\.priority_code/);
  assert.match(feed,/p\.publisher_receipt_reference IS NOT NULL/);
  assert.match(feed,/s\.content_sha256=IF/);
  assert.match(feed,/'P0'/);
  assert.match(feed,/48\*3600/);
  assert.match(feed,/BREAKING/);
  assert.match(feed,/domain="jrei-news-topic"/);
  assert.match(ui,/urgentItem/);
  assert.match(ui,/item\.breaking/);
  assert.match(ui,/data-jr-news-lead-title/);
  assert.match(ui,/publishedFeedItems=valid/);
});

test('category-only browse retains original published-only query and rate gate',()=>{
  const api=read('api/news-public-search.php');
  const model=read('platform/news-intelligence/php/public-read-model.php');
  const source=read('platform/news-intelligence/ui/news-search.js');
  const deployed=read('assets/js/jrei-news-archive-v1.js');
  assert.equal(source,deployed,'the original packaged search client matches');
  assert.match(api,/rateAllowed\(/);
  assert.match(api,/jrei_news_publisher_receipts_accepted/);
  assert.match(api,/browseOnly/);
  assert.match(model,/s\.index_state='PUBLISHED'/);
  assert.match(model,/p\.publisher_state='PUBLISHED'/);
  assert.match(model,/jrNewsPublicationAuthorityPredicate/);
  assert.match(model,/if \(\$browseCategory\)/);
  assert.match(source,/jr-news-select-category/);
  assert.match(source,/form\.requestSubmit/);
  assert.match(source,/if\(!searchText && !topic\.value\)/);
});

test('calendar accepts the future, yet never promotes unreviewed dates',()=>{
  const ui=read('assets/js/jrei-news-experience-v2.js');
  assert.match(ui,/function futureEventDate\(/);
  assert.match(ui,/var date=futureEventDate\(event\.startsAt\)/);
  assert.match(ui,/event\.sourceVerifiedAtReadTime!==true/);
  assert.match(ui,/event\.ownerPublicationApproved!==true/);
  assert.match(ui,/data-jr-calendar/);
  // No fabricated server implementation: release must still check the
  // original verified source resolver is mounted in Bertina.
  const originalRouter=read('api/index.php');
  assert.ok(!originalRouter.includes("if ($path==='/news/v1/calendar')"),
    'missing original source verifier must remain an explicit release blocker');
});

test('news public-facing source PHP remains syntactically valid',()=>{
  const paths=['api/news-public-feeds.php','api/news-public-search.php',
    'platform/news-intelligence/php/public-read-model.php',
    'platform/news-intelligence/php/verified-news-page-render.php'];
  for(const file of paths){
    const result=spawnSync('php',['-l',file],{
      cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,file+': '+(result.stderr||result.stdout));
  }
});
