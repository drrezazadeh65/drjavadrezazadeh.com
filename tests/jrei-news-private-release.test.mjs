import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Run after scripts/build-public-site.mjs, before deploying any files.
// These are entirely local artifacts, not the live site or production DB.
const root=process.cwd();
const out=path.join(root,'.public-site');
const src=path.join(root,'platform/news-intelligence/php');
const privateDir=path.join(out,'api/internal/jrei-news');

test('all independently guarded News PHP library dependencies are packaged privately',()=>{
  const lib=fs.readFileSync(path.join(src,'news-library.php'),'utf8');
  const imported=lib.split('\n')
    .filter(line=>line.startsWith("require_once __DIR__.'/")&&line.endsWith(".php';"))
    .map(line=>line.slice("require_once __DIR__.'/".length,-"';".length));
  assert.ok(imported.length>=24,'source library has the expected dependency closure');
  assert.equal(fs.existsSync(path.join(out,'platform')),false,'no platform source tree in public_html');
  const deny=fs.readFileSync(path.join(out,'api/internal/.htaccess'),'utf8');
  assert.match(deny,/Require\s+all\s+denied/i);
  for(const name of ['news-library.php',...imported]){
    const from=fs.readFileSync(path.join(src,name));
    const to=fs.readFileSync(path.join(privateDir,name));
    assert.deepEqual(to,from,'exact private PHP artifact: '+name);
  }
});

test('existing operations adapter bootstraps without activating JREI News or requiring platform/',()=>{
  const adapter=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  assert.doesNotMatch(adapter,/require_once\s+dirname\(__DIR__\).*platform/i);
  const result=spawnSync('php',['-r',[
    "define('BERTINA_API_BOOTSTRAPPED',true);",
    "require '.public-site/api/operations-jrei-news.php';",
    "if(!function_exists('jrOperationsNewsDispatch'))exit(2);"
  ].join(' ')],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('packaged guarded News runtime resolves every PHP import without a platform tree',()=>{
  const result=spawnSync('php',['-r',[
    "define('BERTINA_API_BOOTSTRAPPED',true);",
    "require '.public-site/api/internal/jrei-news/news-library.php';",
    "if(!function_exists('jrNewsDispatchApi'))exit(2);"
  ].join(' ')],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('the feed and article bridges resolve only the packaged private PHP modules',()=>{
  const pairs=[
    ['jrei-news-private-feed-bridge.php','feed-discovery.php',
      'jrNewsBridgeOriginalFeedObservation'],
    ['jrei-news-private-article-bridge.php','candidate-intake.php',
      'jrNewsBridgeOriginalArticleObservation']
  ];
  for(const [bridge,module,fn] of pairs){
    const file=path.join(out,'api',bridge);
    const body=fs.readFileSync(file,'utf8');
    assert.ok(body.includes("require_once __DIR__.'/internal/jrei-news/"+module+"';"),
      'exact private runtime import: '+bridge);
    assert.doesNotMatch(body,/dirname\(__DIR__\).*platform\/news-intelligence\/php/);
    assert.ok(fs.existsSync(path.join(privateDir,module)),'packaged module '+module);
    const result=spawnSync('php',['-r',[
      "define('BERTINA_API_BOOTSTRAPPED',true);",
      "require '.public-site/api/"+bridge+"';",
      "if(!function_exists('"+fn+"'))exit(2);"
    ].join(' ')],{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,bridge+': '+(result.stderr||result.stdout));
  }
});

test('news search requires two independent default-off private configuration gates',()=>{
  const api=fs.readFileSync(path.join(out,'api/index.php'),'utf8');
  const route=fs.readFileSync(path.join(out,'api/news-public-search.php'),'utf8');
  assert.match(api,/'jrei_news_search_enabled'\s*=>\s*getenv\('JR_JREI_NEWS_SEARCH_ENABLED'\)\s*===\s*'true'/);
  assert.match(api,/'jrei_news_publisher_receipts_accepted'\s*=>\s*getenv\('JR_JREI_NEWS_PUBLISHER_RECEIPTS_ACCEPTED'\)\s*===\s*'true'/);
  assert.match(route,/\['jrei_news_search_enabled'\]/);
  assert.match(route,/\['jrei_news_publisher_receipts_accepted'\]/);
});

test('both public knowledge hubs include the same reviewed-only news archive search',()=>{
  const client=fs.readFileSync(path.join(src,'../ui/news-search.js'),'utf8');
  const bundled=fs.readFileSync(path.join(out,'assets/js/jrei-news-archive-v1.js'),'utf8');
  assert.equal(bundled,client,'source and deployable first-party client match');
  assert.ok(client.includes("response.status===503"),'disabled archive is explained honestly');
  for(const [locale,file] of [
    ['fa','fa/akhbar/index.html'],
    ['en','en/news-insights/index.html']
  ]){
    const html=fs.readFileSync(path.join(out,file),'utf8');
    assert.ok(html.includes('data-ni-archive-search data-ni-language="'+locale+'"'));
    assert.ok(html.includes('/assets/js/jrei-news-archive-v1.js'));
    assert.ok(html.includes('/assets/css/jrei-news-archive-v1.css'));
    assert.ok(html.includes('rel="canonical"'),'public canonical preserved');
    assert.ok(html.includes('</main>'),'existing content remains');
  }
});

test('MFA-only bilingual owner newsroom reuses existing operations identity and packaged module',()=>{
  const source=fs.readFileSync(path.join(root,'platform/news-intelligence/ui/admin-newsroom.js'),'utf8');
  const projected=fs.readFileSync(path.join(out,'assets/js/jrei-news-owner-panel-v1.mjs'),'utf8');
  const loader=fs.readFileSync(path.join(out,'assets/js/operations-jrei-newsroom-v1.js'),'utf8');
  assert.equal(projected,source,'owner client packaged from canonical module');
  assert.ok(source.includes("apiBase='/api/admin/operations/jrei-news'"));
  assert.doesNotMatch(source,/apiBase='\/api\/news\/v1'/);
  assert.ok(loader.includes("fetch('/api/admin/operations/session'"));
  assert.ok(loader.includes("auth.mfaRequired!==false"));
  assert.ok(loader.includes("apiBase:'/api/admin/operations/jrei-news'"));
  assert.ok(loader.includes('jr:operations-locked'));
  for(const file of ['fa/app/admin/index.html','en/account/admin/index.html']){
    const html=fs.readFileSync(path.join(out,file),'utf8');
    assert.ok(html.includes('id="ops-workspace"'),'original dashboard maintained');
    assert.ok(html.includes('id="ops-jrei-newsroom"'));
    assert.ok(html.includes('/assets/js/operations-jrei-newsroom-v1.js'));
    assert.ok(html.includes('/assets/css/operations-jrei-newsroom-v1.css'));
  }
});

test('owner approval must recheck the original KA receipt and current rights',()=>{
  const php=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  assert.match(php,/function jrNewsRecheckOriginalArticleReceipt\(/);
  assert.match(php,/jrNewsRecheckOriginalArticleReceipt\(\$pdo,\$sourceId,\$uri,\$digest\)/);
  for(const condition of [
    "n.enabled=1","f.review_state='AUTHORITATIVE_REVIEWED'",
    "a.review_state='AUTHORITATIVE_REVIEWED'",
    "d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'",
    "f.is_revoked=0","a.is_revoked=0",
    "fp.scheduling_state='APPROVED'","ap.scheduling_state='APPROVED'",
    "o.source_policy_revision=ap.revision",
    "j.job_state='ACQUIRED_REVIEW'",
    "o.mime_type='text/html'",
    "o.private_object_key=BINARY CONCAT(o.content_sha256,'.bin')"
  ])assert.ok(php.includes(condition),'original evidence gate: '+condition);
  assert.match(php,/\$q->execute\(\[\$articleSourceId,\$articleUrl,\$contentSha256\]\)/);
  assert.match(php,/catch\(Throwable \$e\)/);
  assert.match(php,/\$sourceCurrent,\$unavailable,\$ports/);
  assert.doesNotMatch(php,/file_get_contents\s*\(\s*['"]https?:/i);
});
