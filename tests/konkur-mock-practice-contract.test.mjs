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
  assert.match(html,/jr-konkur-mock-practice-v1\.js\?v=20261021-mock-export-v4/);
  assert.match(html,/jr-konkur-mock-providers-v1\.js\?v=20261020-mock-directory-v1/);
  assert.match(html,/jr-konkur-mock-practice-v1\.css\?v=20261020-mock-multisubject-v2/);
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

test('multiple subjects per exam are additive, bounded and remain in-memory self-reports',()=>{
 const source=read('assets/js/jr-konkur-mock-practice-v1.js');
 for(const contract of ['jr-km-add-subject','jr-km-extra-row','additionalSubjects',
  'extraRows.replaceChildren()','subjectNames.has(key)','amount>100'])
  assert.ok(source.includes(contract),contract);
 for(const forbidden of ['fetch(','localStorage','sessionStorage','indexedDB','sendBeacon','document.cookie'])
  assert.ok(!source.includes(forbidden),'unexpected data transmission or persistence '+forbidden);
 const css=read('assets/css/jr-konkur-mock-practice-v1.css');
 assert.match(css,/.jr-km-extra-row/);
 assert.match(css,/@media\(max-width:580px\)/);
});

test('subject percentages accept bounded negative marking independently of TAZ and rank',()=>{
 const s=read('assets/js/jr-konkur-mock-practice-v1.js');
 for(const item of ['const signedPercent=v=>','n>=-33.34&&n<=100','const valuePct=percent.value.trim()?signedPercent(percent.value)','const amount=raw?signedPercent(raw)','const valueTaz=taz.value.trim()?decimal(taz.value)','const valueRank=rank.value.trim()?decimal(rank.value)'])
  assert.ok(s.includes(item),'missing scoring boundary: '+item);
});

test('topic-level comparisons are bounded to same provider, cohort and repeated subject labels',()=>{
 const source=read('assets/js/jr-konkur-mock-practice-v1.js');
 for(const phrase of ['jr-km-subject-trend','row.provider===current.provider','row.group===current.group',
  'row.grade===current.grade','row.date.slice(0,4)===current.date.slice(0,4)',
  'comparableSubjectRows','subjectMeasures','normalizedName','not proof of learning growth'])
  assert.ok(source.includes(phrase),'missing subject comparison guard: '+phrase);
});

test('bilingual pages load dedicated local CSV exporter before the existing practice worksheet',()=>{
 for(const path of ['fa/entekhab-reshteh/index.html','en/student-guidance/index.html']){
  const html=read(path);
  const exportAsset='jr-konkur-mock-export-v1.js?v=20261021-mock-export-v1';
  assert.ok(html.includes(exportAsset),path);
  assert.ok(html.indexOf(exportAsset)<html.indexOf('jr-konkur-mock-practice-v1.js'),path);
 }
 const source=read('assets/js/jr-konkur-mock-practice-v1.js');
 assert.match(source,/JRKonkurMockExport/);
 assert.match(source,/\.download=payload\.filename/);
 assert.match(source,/URL\.revokeObjectURL/);
 assert.match(source,/jr-km-export-notice/);
});
