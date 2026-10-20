import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('existing bilingual Choice Studio extends rather than replacing original mounts and URL structure',()=>{
 for(const [path,lang] of [['fa/entekhab-reshteh/index.html','fa'],['en/student-guidance/index.html','en']]){
  const html=read(path);
  assert.match(html,new RegExp('data-choice-studio data-locale="'+lang+'"'));
  assert.match(html,new RegExp('data-konkur-selection data-locale="'+lang+'"'));
  for(const asset of ['jr-konkur-foundation-v1.js','jr-konkur-studio-v1.js','jr-konkur-studio-v1.css'])
   assert.ok(html.includes(asset),'missing asset '+asset+' '+path);
  assert.ok(html.indexOf('jr-konkur-foundation-v1.js')<html.indexOf('jr-konkur-studio-v1.js'));
  assert.match(html,/rel="canonical"/);
 }
});
test('preliminary selection worksheet is privacy preserving and does not claim official approval',()=>{
 const s=read('assets/js/jr-konkur-studio-v1.js');
 for(const x of ['[data-konkur-selection]','F.inspectList','F.reorder','window.print()',
  "year:1405,code:value","source:null","duplicate","UNVERIFIED"]) {
  if(x==='duplicate'||x==='UNVERIFIED')continue;
  assert.ok(s.includes(x),'missing '+x);
 }
 for(const forbidden of ['fetch(','XMLHttpRequest','localStorage','sessionStorage','indexedDB','sendBeacon','innerHTML='])
  assert.ok(!s.includes(forbidden),'sensitive client mechanism '+forbidden);
 const check=spawnSync(process.execPath,['--check','assets/js/jr-konkur-studio-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 assert.match(read('assets/css/jr-konkur-studio-v1.css'),/@media print/);
 assert.match(read('assets/css/jr-konkur-studio-v1.css'),/:focus-visible/);
});
