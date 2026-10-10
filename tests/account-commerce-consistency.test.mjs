import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('account routes retain official email and disabled credential forms',()=>{
 for(const path of ['fa/register/index.html','en/register/index.html','fa/login/index.html','en/login/index.html']){
  const html=read(path);
  assert.match(html,/mailto:info@drjavadrezazadeh\.com/,path);
  assert.match(html,/noindex/,path);
  assert.match(html,/disabled/,path);
 }
});
test('English shop uses official email for customer support',()=>{
 const html=read('en/shop/index.html');
 assert.match(html,/mailto:info@drjavadrezazadeh\.com/);
 assert.doesNotMatch(html,/mailto:dr\.rezazadeh65@gmail\.com/);
});
test('legacy routes redirect to canonical account paths',()=>{
 assert.match(read('register/index.html'),/\.\.\/en\/register\//);
 assert.match(read('login/index.html'),/\.\.\/en\/login\//);
});
