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

test('owner publishing preflight is read-only and cannot invent CMS readiness',()=>{
  const api=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  const module=fs.readFileSync(path.join(privateDir,'publication-readiness.php'),'utf8');
  const dispatcher=fs.readFileSync(path.join(privateDir,'news-api-adapter.php'),'utf8');
  const ui=fs.readFileSync(path.join(out,'assets/js/jrei-news-owner-panel-v1.mjs'),'utf8');
  assert.match(module,/function jrNewsOwnerPublicationReadiness\(/);
  assert.match(module,/'publisherReady'=>false/);
  assert.match(module,/'originalCmsReceiptVerified'=>false/);
  assert.match(module,/'filesystemWritePerformed'=>false/);
  assert.match(module,/ORIGINAL_CMS_PUBLISHER_NOT_CONNECTED/);
  assert.match(module,/IMMUTABLE_ROUTE_REGISTRY_NOT_VERIFIED/);
  assert.match(api,/originalNewsPublicationPreflight/);
  assert.match(dispatcher,/\/news\/v1\/owner\/publication\/preflight/);
  assert.match(ui,/\/owner\/publication\/preflight\?revisionId=/);
  assert.doesNotMatch(module,/file_put_contents|mkdir\(|rename\(|unlink\(|curl_exec|exec\(/);
});

test('owner-only integration readiness remains readable without activating News',()=>{
  const php=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  const ui=fs.readFileSync(path.join(out,'assets/js/jrei-news-owner-panel-v1.mjs'),'utf8');
  const route=fs.readFileSync(path.join(out,'api/operations.php'),'utf8');
  assert.match(php,/function jrOperationsNewsReadiness\(/);
  assert.match(php,/\$route==='\/owner\/integration-readiness'/);
  assert.match(php,/originalCmsPublisherConnected'=>false/);
  assert.match(php,/publicPublicationActivatedByCheck'=>false/);
  assert.match(php,/crawlerActivatedByCheck'=>false/);
  assert.ok(ui.includes("'/owner/integration-readiness'"));
  assert.ok(ui.includes('readiness.ownerQueueAccessible!==true'));
  assert.match(route,/news_owner_csrf_forbidden/);
  assert.match(route,/if \(!\$fresh\) fail\('admin_mfa_required',403\)/);
});

test('MFA owner dashboard bundles seven existing guarded reads into one request',()=>{
  const dispatcher=fs.readFileSync(path.join(privateDir,'news-api-adapter.php'),'utf8');
  const source=fs.readFileSync(path.join(root,'platform/news-intelligence/ui/admin-newsroom.js'),'utf8');
  const projected=fs.readFileSync(path.join(out,'assets/js/jrei-news-owner-panel-v1.mjs'),'utf8');
  assert.equal(projected,source);
  assert.match(dispatcher,/\/news\/v1\/owner\/snapshot/);
  assert.match(dispatcher,/jrNewsOwnerAuthority\(\$owner\)/);
  assert.match(dispatcher,/jrNewsDispatchApi\(/);
  for(const key of ['queue','overview','monitors','available','suggestions','jobs','backlog'])
    assert.ok(dispatcher.includes("'"+key+"'=>'/news/v1/owner/"),'existing guarded read '+key);
  assert.match(dispatcher,/'UNAVAILABLE'/);
  assert.match(dispatcher,/'privateWritesPerformed'=>false/);
  assert.match(source,/request\('\/owner\/snapshot',\{method:'GET'\}\)/);
  for(const [key,method] of [
    ['queue','queue'],['overview','overview'],['monitors','source/monitors'],
    ['available','source/available'],['suggestions','article/suggestions'],
    ['jobs','original-jobs'],['backlog','publication/backlog']
  ]){
    assert.ok(source.includes("readView('"+key+"')"),'owner view '+key);
    assert.ok(!source.includes("request('/owner/"+method+"',{method:'GET'})"),
      'no redundant HTTP request '+key);
  }
  assert.ok(source.includes("request('/owner/preview?revisionId="),
    'exact owner preview still fetched independently');
  assert.ok(source.includes("request('/owner/publication/preflight?revisionId="),
    'source-dependent publication preflight still fetched freshly');
});

test('readiness validates all four additive migrations and original source tables',()=>{
  const php=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  for(const table of [
    'jrei_news_monitors','jrei_news_candidates','jrei_news_discovered_urls',
    'jrei_news_evidence_reviews','jrei_news_editorial_versions',
    'jrei_news_owner_decisions','jrei_news_publications',
    'jrei_news_exam_milestones','jrei_news_exam_follows',
    'jrei_news_delivery_receipts','jrei_news_topic_follows',
    'jrei_news_search_documents','jrei_exam_sources',
    'jrei_ka_source_policies','jrei_ka_jobs','jrei_ka_private_observations'
  ])assert.ok(php.includes("'"+table+"'=>["),'source table checked: '+table);
  assert.match(php,/information_schema\\.COLUMNS/);
  assert.match(php,/information_schema\\.TABLES/);
  assert.match(php,/TABLE_TYPE='BASE TABLE'/);
  assert.match(php,/\\$q->execute\\(\\$names\\)/);
  assert.match(php,/\\$seen\\[\\$name\\]\\[\\$column\\]/);
  assert.match(php,/'requiredMotherTableCount'=>count\(\$required\)/);
  assert.match(php,/\$queueAccessible=\$apiFlag&&\$releaseFlag&&\$schemaReady&&\$privateLibraryReady/);
  assert.doesNotMatch(php,/ALTER TABLE|CREATE TABLE|DROP TABLE/);
});

test('public bilingual archive fetch uses no session cookies or unsafe result links',()=>{
  const js=fs.readFileSync(path.join(out,'assets/js/jrei-news-archive-v1.js'),'utf8');
  assert.ok(js.includes("credentials:'omit',redirect:'error'"));
  assert.ok(js.includes("var searchText=input.value.trim()"));
  assert.ok(js.includes("if(!searchText)"));
  assert.ok(js.includes("url.search||url.hash"));
  assert.ok(js.includes("'/fa/akhbar/'") && js.includes("'/en/news-insights/'"));
  assert.ok(js.includes("i<20"),'public result rendering remains bounded');
  assert.doesNotMatch(js,/credentials:'same-origin'/);
});

test('news correction can only retract after independently verified original CMS bilingual evidence',()=>{
  const php=fs.readFileSync(path.join(privateDir,'retraction.php'),'utf8');
  assert.match(php,/callable \$readAndVerifyOriginalCmsRetraction/);
  assert.match(php,/\$receipt=\$readAndVerifyOriginalCmsRetraction\(/);
  assert.match(php,/\$receipt\['faRoute'\].*\$observed\['fa_route'\]/);
  assert.match(php,/\$receipt\['enRoute'\].*\$observed\['en_route'\]/);
  assert.match(php,/ORIGINAL_AUTHENTICATED_CMS/);
  assert.match(php,/bothCanonicalRoutesVerified/);
  assert.match(php,/canonicalAndSitemapUpdated/);
  assert.match(php,/news_retraction_changed_during_cms_review/);
  assert.match(php,/publisher_state='RETRACTED'/);
  assert.match(php,/index_state='RETRACTED'/);
  assert.doesNotMatch(php,/array \$originalCmsRetractionReceipt/);
  assert.doesNotMatch(php,/file_put_contents|curl_exec|rename\(|unlink\(/);
});

test('News mother-schema readiness rejects partial UNIQUE route and idempotency migrations',()=>{
  const php=fs.readFileSync(path.join(out,'api/operations-jrei-news.php'),'utf8');
  const fixture=fs.readFileSync(path.join(root,
    'platform/news-intelligence/tests/news-schema-fixture.php'),'utf8');
  assert.match(php,/information_schema\.STATISTICS/);
  assert.match(php,/NON_UNIQUE=0/);
  assert.match(php,/SUB_PART/);
  assert.match(php,/ksort\(\$parts,SORT_NUMERIC\)/);
  for(const columns of ["['fa_route']","['en_route']",
    "['publication_id','language_code']","['public_route']",
    "['idempotency_key']","['fingerprint_sha256']"])
    assert.ok(php.includes(columns),'mandatory unique '+columns);
  assert.match(fixture,/DROP INDEX uq_jrei_news_search_route/);
  assert.match(fixture,/ADD UNIQUE KEY uq_jrei_news_search_route\(public_route\)/);
  assert.doesNotMatch(php,/\$pdo->exec\(/);
});
