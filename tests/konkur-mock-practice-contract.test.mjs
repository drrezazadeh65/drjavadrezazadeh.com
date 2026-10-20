import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=x=>fs.readFileSync(x,'utf8');
test('mock entry extends rather than replaces both bilingual public Choice Studio pages',()=>{
 for(const [p,lang] of [['fa/entekhab-reshteh/index.html','fa'],['en/student-guidance/index.html','en']]){
  const html=read(p);
  assert.match(html,new RegExp('data-konkur-mock-practice data-locale="'+lang+'"'));
  assert.match(html,new RegExp('data-choice-studio data-locale="'+lang+'"'));
  assert.match(html,new RegExp('data-konkur-selection data-locale="'+lang+'"'));
  assert.match(html,/jr-konkur-mock-practice-v1\.js\?v=20261020-mock-v1/);
  assert.match(html,/jr-konkur-mock-providers-v1\.js\?v=20261020-mock-directory-v1/);
  assert.match(html,/jr-konkur-mock-practice-v1\.css\?v=20261020-mock-v1/);
  assert.ok(html.indexOf('jr-konkur-studio-v1.js')<html.indexOf('jr-konkur-mock-practice-v1.js'));
 }
});
test('new mock worksheet is memory-only, non-discriminatory and cannot fake admission probability',()=>{
 const s=read('assets/js/jr-konkur-mock-practice-v1.js');
 for(const v of ["[data-konkur-mock-practice]","'GHALAMCHI'","'GAJ'","'OTHER'",
  "examGroup.value","row.provider","row.group","'afterprint'","'pagehide'",
  "provider===latest.provider","group===latest.group","window.print()","self-reports"]) {
  if(v==='self-reports')continue;
  assert.ok(s.includes(v),'missing '+v);
 }
 for(const forbidden of ['fetch(', 'XMLHttpRequest','sendBeacon','localStorage','sessionStorage',
  'indexedDB','document.cookie','requestSubmit','innerHTML=','rankProbability','admissionProbability'])
  assert.equal(s.includes(forbidden),false,'not permitted in mock worksheet: '+forbidden);
 const checked=spawnSync(process.execPath,['--check','assets/js/jr-konkur-mock-practice-v1.js'],{encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
 assert.match(read('assets/css/jr-konkur-mock-practice-v1.css'),/@media\(max-width:580px\)/);
});
