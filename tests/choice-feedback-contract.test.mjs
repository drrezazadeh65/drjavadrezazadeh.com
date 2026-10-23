import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(path,'utf8');
const script=read('assets/js/jr-choice-feedback-v1.js');
const css=read('assets/css/jr-choice-feedback-v1.css');

test('all seven study tracks and examination groups are examples, not invented admission rules',()=>{
 for(const id of ['experimental','mathematics','humanities','languages','arts','technical','kardanesh'])
  assert.ok(script.includes("id:'"+id+"'"),'missing '+id);
 for(const label of ['تجربی','ریاضی','انسانی','زبان','هنر','فنی‌وحرفه‌ای','کاردانش'])
  assert.ok(script.includes(label),'missing bilingual discipline tab '+label);
 assert.match(script,/not necessarily a separate school track/);
 assert.match(script,/not necessarily a separate school track/);
 assert.match(script,/qualification|qualifications|entry rules/);
 assert.match(script,/group\.samples\.forEach/);
 assert.match(script,/names\[j\]\.dispatchEvent\(new Event\('input'/);
 assert.match(script,/role','tablist'/);
 assert.match(script,/role','tab'/);
 assert.match(script,/role','tabpanel'/);
 assert.match(script,/aria-selected/);
 assert.match(script,/ArrowRight/);
 assert.match(script,/ArrowLeft/);
 assert.match(script,/Home/);
 assert.match(script,/End/);
});

test('visible interpreted feedback requires explicit click and completed user-supplied ratings',()=>{
 assert.match(script,/jr-cs-show-result/);
 assert.match(script,/jr-cs-interpreted-result/);
 assert.match(script,/trigger\.addEventListener\('click'/);
 assert.match(script,/const data=snapshot\(\)/);
 assert.match(script,/active\.length/);
 assert.match(script,/pathwayIdentity\(labels\[0\]\)===pathwayIdentity\(labels\[1\]\)/);
 assert.match(script,/Number\.isInteger\(v\)\|\|v<1\|\|v>5/);
 assert.match(script,/x\.weight\*x\.values\[index\]/);
 assert.match(script,/dataset\.factorIndex/,'reordering must never permute weights relative to five ratings');
 assert.match(script,/if\(data\.error\)/);
 assert.match(script,/report\.hidden=false;print\.hidden=false/);
 assert.match(script,/form\.addEventListener\('input',hide\)/);
 assert.match(script,/form\.addEventListener\('change',hide\)/);
 assert.match(script,/form\.addEventListener\('reset',hide\)/);
 assert.match(script,/window\.print\(\)/);
 assert.match(script,/no official|official entry rules|ضوابط و دفترچه رسمی/i);
 assert.match(script,/nothing is stored or transmitted/i);
 const check=spawnSync(process.execPath,['--check','assets/js/jr-choice-feedback-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 for(const token of ['localStorage','sessionStorage','indexedDB','fetch(','XMLHttpRequest(','WebSocket(','sendBeacon(','document.cookie'])
  assert.ok(!script.includes(token),'no private input persistence: '+token);
});

test('both canonical bilingual guidance pages preserve their base studio and load one additive upgrade',()=>{
 for(const locale of ['fa','en']){
  const path=locale==='fa'?'fa/entekhab-reshteh/index.html':'en/student-guidance/index.html';
  const html=read(path);
  assert.match(html,/data-choice-studio data-locale/);
  assert.match(html,/jr-choice-studio-v1[.]js[?]v=20261022-canonical-path-identities-v6/);
  assert.match(html,/jr-choice-studio-v1[.]css[?]v=20261020-choice-sensitive-v5/);
  assert.match(html,/jr-choice-feedback-v1[.]js[?]v=20261022-no-overwrite-suggestions-v2/);
  assert.match(html,/jr-choice-feedback-v1[.]css[?]v=20261022-no-overwrite-suggestions-v2/);
  assert.equal(html.split('jr-choice-feedback-v1.js?').length,2);
  assert.ok(html.indexOf('jr-choice-studio-v1.js?')<html.indexOf('jr-choice-feedback-v1.js?'));
  assert.match(html,/rel="canonical"/);
  assert.match(html,/name="robots" content="index,follow/);
 }
 for(const x of [/jr-cs-examples/,/jr-cs-show-result/,/jr-cs-report-index/,/max-width:710px/,/max-width:390px/,/min-height:44px/,/focus-visible/,/@media print/,/prefers-reduced-motion/])
  assert.match(css,x);
});
