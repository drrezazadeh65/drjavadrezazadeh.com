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

test('portable preliminary drafts extend both bilingual entry pages without new routes',()=>{
 for(const path of ['fa/entekhab-reshteh/index.html','en/student-guidance/index.html']){
  const html=read(path);
  const helper='jr-konkur-choice-portability-v1.js?v=20261022-private-draft-v1';
  assert.ok(html.includes(helper),path);
  assert.ok(html.indexOf(helper)<html.indexOf('jr-konkur-studio-v1.js'),path);
  assert.match(html,/jr-konkur-studio-v1\.js\?v=20261022-review-draft-v4/);
  assert.match(html,/jr-konkur-studio-v1\.css\?v=20261022-review-draft-v4/);
 }
 const js=read('assets/js/jr-konkur-studio-v1.js');
 for(const phrase of ['JRKonkurChoicePortability','jr-kc-save-draft','jr-kc-import-file',
   'jr-kc-apply-import','pendingImport','file.text()','URL.revokeObjectURL','apply.disabled=true'])
  assert.ok(js.includes(phrase),phrase);
 for(const forbidden of ['fetch(','XMLHttpRequest','localStorage','sessionStorage','indexedDB','sendBeacon','innerHTML='])
  assert.equal(js.includes(forbidden),false,'unexpected private-data channel '+forbidden);
 const css=read('assets/css/jr-konkur-studio-v1.css');
 assert.match(css,/jr-kc-portability/);
 assert.match(css,/@media\(max-width:580px\)/);
});

test('bilingual locally usable tools have a visible, honest scientific boundary for both mobile pages',()=>{
 for(const [path,phrase] of [
  ['fa/entekhab-reshteh/index.html','هیچ‌یک از این ابزارها رتبه رسمی'],
  ['en/student-guidance/index.html','These tools do not establish official eligibility']
 ]){
  const html=read(path);
  assert.match(html,/data-jr-admission-safe-summary/);
  assert.ok(html.includes(phrase),path);
  assert.ok(html.indexOf('data-jr-admission-safe-summary')<html.indexOf('data-konkur-selection'),path);
  assert.ok(html.includes('role="note"'),path);
 }
 const css=read('assets/css/jr-konkur-studio-v1.css');
 assert.match(css,/\.jr-konkur-local-tools/);
 assert.match(css,/@media\(max-width:580px\)/);
});

test('private choice search is local, accessible and independent of preference order',()=>{
 const script=read('assets/js/jr-konkur-studio-v1.js');
 const foundation=read('assets/js/jr-konkur-foundation-v1.js');
 for(const token of ['jr-kc-filter-label','jr-kc-filter-count','filter.addEventListener(\'input\',draw)',
  'F.filterDraftChoices(choices,filter.value)','dataset.choiceIndex=String(i)',
  'filter.value=\'\'','filterCount.setAttribute(\'aria-live\',\'polite\')'])
  assert.ok(script.includes(token),'missing local filter invariant '+token);
 assert.match(foundation,/function filterDraftChoices\(choices,query=''/);
 assert.match(foundation,/reorder,filterDraftChoices,reviewPreliminaryDraft,evidencePassport/);
 assert.match(read('assets/css/jr-konkur-studio-v1.css'),/jr-kc-filter-empty/);
 for(const forbidden of ['fetch(','XMLHttpRequest','sendBeacon','indexedDB','localStorage','sessionStorage'])
  assert.equal(script.includes(forbidden),false,'search must remain local');
});

test('new local draft filter assets have unique cache-busted bilingual references',()=>{
 for(const path of ['fa/entekhab-reshteh/index.html','en/student-guidance/index.html']){
  const html=read(path);
  for(const token of ['jr-konkur-foundation-v1.js?v=20261022-review-draft-v3',
   'jr-konkur-studio-v1.js?v=20261022-draft-filter-v3',
   'jr-konkur-studio-v1.css?v=20261022-draft-filter-v3'])
   assert.ok(html.includes(token),'missing changed-file cache key '+token+' '+path);
 }
});

test('offline pre-submission review and print both require independent official verification',()=>{
 const script=read('assets/js/jr-konkur-studio-v1.js');
 for(const phrase of ['jr-kc-review-draft','jr-kc-review-panel',
  'F.reviewPreliminaryDraft(choices)','reviewPanel.replaceChildren()',
  'review.addEventListener(\'click\'','Official verification checklist (incomplete)'])
  assert.ok(script.includes(phrase),'missing explicit checklist guard '+phrase);
 const foundation=read('assets/js/jr-konkur-foundation-v1.js');
 assert.match(foundation,/function reviewPreliminaryDraft\(choices\)/);
 assert.match(read('assets/css/jr-konkur-studio-v1.css'),/\.jr-kc-review-list/);
});
