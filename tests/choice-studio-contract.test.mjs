import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const script=read('assets/js/jr-choice-studio-v1.js');
const style=read('assets/css/jr-choice-studio-v1.css');

test('bilingual choice studio remains a working addition to existing verified public URLs',()=>{
 for(const [lang,path,url] of [
  ['fa','fa/entekhab-reshteh/index.html','https://drjavadrezazadeh.com/fa/entekhab-reshteh/'],
  ['en','en/student-guidance/index.html','https://drjavadrezazadeh.com/en/student-guidance/']
 ]){
  const html=read(path);
  assert.ok(html.includes('rel="canonical" href="'+url+'"'),'freeze canonical '+lang);
  assert.ok(html.includes('data-choice-studio data-locale="'+lang+'"'),'mount localised studio '+lang);
  assert.ok(html.includes('jr-choice-studio-v1.css?v=20261019-choice-studio-v1'));
  assert.ok(html.includes('jr-choice-studio-v1.js?v=20261019-choice-studio-v1'));
  assert.match(html,/<noscript>/,'progressive enhancement for '+lang);
  assert.match(html,/aria-labelledby="jr-choice-studio-(?:fa|en)-title"/);
 }
 assert.match(read('fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/index.html'),/data-decision-matrix/);
});

test('five real criteria with editable weights and two independent pathway assessments',()=>{
 for(const criterion of ['interest','requirements','finances','location','flexibility'])
  assert.ok(script.includes("id:'"+criterion+"'"),'missing criterion '+criterion);
 assert.match(script,/range\.type='range'/);
 assert.match(script,/range\.min='0';range\.max='5'/);
 assert.match(script,/select\.append\(option\('',T\.choose\)\)/);
 assert.match(script,/for\(let i=0;i<2;i\+\+\)/);
 assert.match(script,/Number\(w\.input\.value\)\*Number\(e\.selects/);
 assert.match(script,/active\.reduce\(/);
 assert.match(script,/form\.addEventListener\('input',\(\)=>redraw\(\)\)/);
 assert.match(script,/form\.addEventListener\('reset'/);
});

test('formative scientific honesty, privacy, keyboard focus and mobile layout remain binding',()=>{
 assert.doesNotMatch(script,/\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest)\s*[.(]/);
 assert.doesNotMatch(script,/\bfetch\s*\(/);
 assert.doesNotMatch(script,/\b(?:sendBeacon|WebSocket)\s*\(/);
 assert.match(script,/not a validated psychometric assessment/);
 assert.match(script,/آزمون روان‌سنجی، تشخیص استعداد/);
 assert.match(script,/nothing is sent to the server/i);
 assert.match(script,/setAttribute\('aria-live','polite'\)/);
 assert.match(style,/@media\(max-width:400px\)/);
 assert.match(style,/@media\(max-width:700px\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(style, /:focus-visible/);
 assert.match(style,/min-height:48px/);
 const check=spawnSync(process.execPath,['--check','assets/js/jr-choice-studio-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr||'JavaScript syntax must pass');
});
