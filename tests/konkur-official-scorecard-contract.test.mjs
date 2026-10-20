import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('bilingual existing Choice Studio retains five criteria, official choice list, mock notebook and adds manual official scorecard',()=>{
 for(const [p,lang] of [
  ['fa/entekhab-reshteh/index.html','fa'],['en/student-guidance/index.html','en']
 ]){
  const html=read(p);
  for(const id of ['choice-studio','konkur-selection','konkur-mock-practice','konkur-official-scorecard'])
   assert.ok(html.includes('data-'+id+' data-locale="'+lang+'"'),id);
  for(const asset of ['jr-konkur-official-scorecard-v1.js','jr-konkur-official-scorecard-workspace-v1.js','jr-konkur-official-scorecard-v1.css'])
   assert.ok(html.includes(asset),'missing '+asset);
  assert.ok(html.indexOf('jr-konkur-official-scorecard-v1.js')<html.indexOf('jr-konkur-official-scorecard-workspace-v1.js'));
  assert.match(html,/rel="canonical"/);
 }
 const studio=read('assets/js/jr-choice-studio-v1.js');
 for(const name of ['interest','requirements','finances','location','flexibility'])
  assert.ok(studio.includes("id:'"+name+"'"),name);
});
test('manual scorecard worksheet never stores, transmits or uploads user input',()=>{
 const s=read('assets/js/jr-konkur-official-scorecard-workspace-v1.js');
 for(const x of ['[data-konkur-official-scorecard]','V.inspect(data)','window.print()','pagehide','SELF_REPORTED_YES','SELF_REPORTED_NO'])
  assert.ok(s.includes(x),x);
 for(const pattern of [/fetch\s*\(/,/XMLHttpRequest/,/localStorage/,/sessionStorage/,/indexedDB/,/sendBeacon/,/WebSocket/,/innerHTML\s*=/,/type=['"]file['"]/])
  assert.doesNotMatch(s,pattern);
 const result=spawnSync(process.execPath,['--check','assets/js/jr-konkur-official-scorecard-workspace-v1.js'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const css=read('assets/css/jr-konkur-official-scorecard-v1.css');
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:530px\)/);
 assert.match(css,/@media print/);
});
