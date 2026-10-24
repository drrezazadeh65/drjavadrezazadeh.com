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
