/** Acceptance source contracts for the FINAL single-package JREI News QA.
 * NOT run mid-development; execute only after the owner's one-package handoff.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const routes={fa:'fa/akhbar/index.html',en:'en/news-insights/index.html'};
const canonical={fa:'https://drjavadrezazadeh.com/fa/akhbar/',
  en:'https://drjavadrezazadeh.com/en/news-insights/'};
const categories=['school','examinations','universities','employment',
  'language','international','research'];

test('all exactly 21 master newsroom desks are server-rendered in both languages',()=>{
  for(const locale of ['fa','en']){
    const html=read(routes[locale]);
    const ids=[...html.matchAll(/data-jrn21-section="([0-9]{2})"/g)]
      .map(x=>x[1]);
    assert.deepEqual(ids,Array.from({length:21},(_,i)=>String(i+1).padStart(2,'0')));
    assert.equal((html.match(/<h1(?=[ >])/g)||[]).length,1);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
    assert.ok(html.includes('href="'+canonical[locale]+'"'));
    assert.ok(html.includes('data-jrn21 data-jr-language="'+locale+'"'));
    assert.ok(html.includes('/assets/css/jrei-news-21-v3.css'));
    assert.ok(html.includes('/assets/js/jrei-news-21-v3.js'));
    assert.ok(!html.includes('/assets/js/jrei-news-experience-v2.js'));
    assert.ok(html.includes('id="jrei-news-archive-'+locale+'"'));
    assert.ok(html.includes('data-ni-archive-search data-ni-language="'+locale+'"'));
    assert.ok(html.includes('data-jrn21-feed="results-reports"'));
    assert.ok(html.includes('data-jrn21-feed="deadline-reports"'));
    for(const other of ['fa','en'])
      assert.ok(html.includes('hreflang="'+other+'" href="'+canonical[other]+'"'));
    assert.ok(html.includes('hreflang="x-default"'));
  }
});

test('original master taxonomy has seven parent desks and specialist children',()=>{
  for(const locale of ['fa','en']){
    const html=read(routes[locale]);
    const ids=[...html.matchAll(/data-jrn21-category="([a-z]+)"/g)]
      .map(x=>x[1]);
    for(const cat of categories)assert.ok(ids.includes(cat),locale+': '+cat);
    assert.ok(html.includes('data-jrn21-query='),'searchable subtopics');
    assert.ok(html.includes('jrn21-taxonomy-card'));
  }
});

test('original, reviewed public archive is safely embedded in desk 18',()=>{
  for(const locale of ['fa','en']){
    const html=read(routes[locale]);
    const start=html.indexOf('id="jrn21-'+locale+'-18"');
    const archive=html.indexOf('id="jrei-news-archive-'+locale+'"');
    const next=html.indexOf('id="jrn21-'+locale+'-19"');
    assert.ok(start>=0&&archive>start&&next>archive);
    assert.equal((html.match(/data-ni-archive-search data-ni-language=/g)||[]).length,1);
  }
  assert.equal(read('platform/news-intelligence/ui/news-search.js'),
    read('assets/js/jrei-news-archive-v1.js'));
});

test('no fake urgent, stats, source references or external content injection',()=>{
  const ui=read('assets/js/jrei-news-21-v3.js');
  const rss=read('api/news-public-feeds.php');
  assert.match(ui,/getAttribute\('domain'\)==='jrei-news-topic'/);
  assert.match(ui,/item\.urgent/);
  assert.match(ui,/data-jrn21-lead/);
  assert.match(ui,/data-jrn21-breaking/);
  assert.match(ui,/data-jrn21-feed/);
  assert.match(ui,/data-jrn21-event/);
  assert.match(ui,/document\.createElement/);
  assert.doesNotMatch(ui,/\.innerHTML\s*=/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|document\.cookie/);
  assert.match(rss,/publisher_receipt_reference IS NOT NULL/);
  assert.match(rss,/s\.content_sha256=IF/);
  assert.match(rss,/domain="jrei-news-topic"/);
  assert.match(rss,/domain="jrei-news-event"/);
  assert.match(rss,/'P0'/);
  assert.match(rss,/48\*3600/);
});

test('category-only browse is bounded by original published receipts and consent',()=>{
  const api=read('api/news-public-search.php');
  const model=read('platform/news-intelligence/php/public-read-model.php');
  const browser=read('platform/news-intelligence/ui/news-search.js');
  assert.match(api,/browseOnly/);
  assert.match(api,/rateAllowed/);
  assert.match(api,/jrei_news_search_enabled/);
  assert.match(api,/jrei_news_publisher_receipts_accepted/);
  assert.match(model,/jrNewsPublicationAuthorityPredicate/);
  assert.match(model,/s\.index_state='PUBLISHED'/);
  assert.match(model,/p\.publisher_state='PUBLISHED'/);
  assert.match(browser,/jr-news-select-category/);
  assert.match(browser,/event\.detail\.query/);
});

test('calendar uses reviewed future dates only and fails visibly when unmounted',()=>{
  const ui=read('assets/js/jrei-news-21-v3.js');
  assert.match(ui,/item\.sourceVerifiedAtReadTime!==true/);
  assert.match(ui,/item\.ownerPublicationApproved!==true/);
  assert.match(ui,/date\(item\.startsAt,true\)/);
  assert.match(ui,/\/api\/news\/v1\/calendar/);
  for(const locale of ['fa','en'])
    assert.ok(read(routes[locale]).includes('data-jrn21-event="upcoming"'));
  const api=read('api/index.php');
  assert.ok(!api.includes("if ($path==='/news/v1/calendar')"),
    'original signed resolver and calendar route remain separate activation gates');
});

test('all new public-facing files are shipped as first-party source assets',()=>{
  const css=read('assets/css/jrei-news-21-v3.css');
  assert.match(css,/jrn21-all-sections/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/max-width:640px/);
  const build=read('scripts/build-public-site.mjs');
  assert.match(build,/copy\(\)/);
});

test('modified source PHP remains syntactically valid in final QA',()=>{
  for(const file of ['api/news-public-feeds.php','api/news-public-search.php',
    'platform/news-intelligence/php/public-read-model.php',
    'platform/news-intelligence/php/verified-news-page-render.php']){
    const r=spawnSync('php',['-l',file],{
      cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(r.status,0,file+': '+(r.stderr||r.stdout));
  }
});
