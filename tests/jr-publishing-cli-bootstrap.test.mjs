import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Both CLI-only publishing diagnostics load Stage09 after the safe API bootstrap',()=>{
  for(const file of [
    'api/internal/jr-publishing-preflight-cli.php',
    'api/internal/jr-publishing-activate-existing-cli.php'
  ]){
    const c=readFileSync(file,'utf8');
    const context=c.indexOf("define('BERTINA_MAIL_SMOKE_CONTEXT'");
    const api=c.indexOf("require_once dirname(__DIR__).'/index.php'");
    const bootstrap=c.indexOf("define('BERTINA_API_BOOTSTRAPPED'");
    const stage=c.indexOf("require_once dirname(__DIR__).'/commerce-stage9.php'");
    const publish=c.indexOf("require_once dirname(__DIR__).'/publishing.php'");
    const digital=c.indexOf("require_once __DIR__.'/jr-publishing-digital.php'");
    assert.ok(context>=0&&context<api&&api<bootstrap&&bootstrap<stage&&stage<publish&&publish<digital,
      'safe Stage09 dependency ordering missing in '+file);
    assert.match(c,/if\s*\(PHP_SAPI\s*!==?\s*['"]cli['"]\)/);
    assert.doesNotMatch(c,/(?:getenv\(['"]JR_DB_PASSWORD['"]\)|getenv\(['"]JR_BITPAY_API_KEY['"]\))\s*\)/);
  }
});
