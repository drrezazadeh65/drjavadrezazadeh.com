import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=(p)=>readFileSync(p,'utf8');
const routes={
 fa:[
  'fa/golden-talent/index.html',
  'fa/assessments/golden-talent/start/index.html',
  'fa/app/student/bahar/index.html'
 ],
 en:[
  'en/golden-talent/index.html',
  'en/golden-talent/assessment/index.html',
  'en/golden-talent/dashboard/bahar/index.html'
 ]
};
test('all six free scientific pages have the same reviewed three-stage navigation in their own locale',()=>{
 for(const [locale,files] of Object.entries(routes)){
  for(const file of files){
   const html=read(file);
   assert.match(html,/data-science-continuity/);
   assert.match(html,/jr-scientific-experience-v1[.]css[?]v=20261019-continuity-v1/);
   const nav=html.split('<nav class="jr-science-continuity"')[1]?.split('</nav>')[0];
   assert.ok(nav,'missing continuity navigator '+file);
   assert.equal((nav.match(/<li>/g)||[]).length,3,file);
   assert.match(nav,/pages do not transfer|پاسخ‌ها به صفحه بعد منتقل نمی‌شوند/i);
   for(const page of [
    '/'+locale+'/golden-talent/#goldenTalentEvidenceStudio',
    locale==='fa'?'/fa/assessments/golden-talent/start/':'/en/golden-talent/assessment/',
    locale==='fa'?'/fa/app/student/bahar/#baharWorkingPlan':'/en/golden-talent/dashboard/bahar/#baharWorkingPlan'
   ])assert.ok(nav.includes('href="'+page+'"'),file+' '+page);
  }
 }
});

test('BAHAR weekly diary remains seven-day, descriptive, in-page-only and printable in both languages',()=>{
 for(const path of [routes.fa[2],routes.en[2]]){
  const html=read(path);
  for(const hook of ['data-bahar-weekly','data-bahar-week-list','data-bahar-week-count','data-bahar-print'])
   assert.ok(html.includes(hook),path+' lacks '+hook);
  assert.match(html,/bahar-formative-workspace-v1[.]js[?]v=20261019-7day-continuity-v2/);
  assert.match(html,/noindex,follow,noarchive/);
  assert.match(html,/روز بدون یادداشت|blank day/i);
 }
 const script=read('assets/js/bahar-formative-workspace-v1.js');
 assert.match(script,/for\(let day=1;day<=7;day\+\+\)/);
 assert.match(script,/const weekLength=240/);
 assert.match(script,/weekRecords\(\)/);
 assert.match(script,/weekList\.addEventListener\('input'/);
 assert.match(script,/printButton\.addEventListener\('click'/);
 assert.match(script,/window\.print\(\)/);
 assert.match(script,/weeklySection\.append\(dailyList\)/);
 for(const violation of ['localStorage','sessionStorage','fetch(','XMLHttpRequest(','WebSocket('])
  assert.ok(!script.includes(violation),'private day notes must never be persisted/transmitted via '+violation);
 for(const file of ['assets/js/bahar-formative-workspace-v1.js','assets/js/rcas-start.js','assets/js/rcas-start-en.js']){
  const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(check.status,0,file+' '+check.stderr);
 }
});

test('RCAS offers the BAHAR next step only from the verified local output branch',()=>{
 const fa=read('assets/js/rcas-start.js');
 const en=read('assets/js/rcas-start-en.js');
 const flag=fa.indexOf('if(activeStep!==3||!p0Complete()||!coreComplete()||!routingComplete())return;');
 const link=fa.indexOf('ادامه رایگان در BAHAR');
 assert.ok(flag>=0&&link>flag);
 const enGate=en.indexOf('if(current!==3||!validateContext()||!validateCore()||!validateRoutes())return;');
 const enLink=en.indexOf('Continue free: seven-day activity log');
 assert.ok(enGate>=0&&enLink>enGate);
 assert.match(fa,/\/fa\/app\/student\/bahar\/#baharWorkingPlan/);
 assert.match(en,/\/en\/golden-talent\/dashboard\/bahar\/#baharWorkingPlan/);
 assert.doesNotMatch(fa.slice(link,link+260),/\?.*=/);
 assert.doesNotMatch(en.slice(enLink,enLink+260),/\?.*=/);
 const registry=JSON.parse(read('platform/golden-talent-instrument-registry.v1.json'));
 assert.equal(registry.scientific_policy.validation_status,'PREVALIDATION');
 assert.equal(registry.scientific_policy.total_talent_score_allowed,false);
 assert.ok(registry.instruments.every(tool=>tool.scoring_enabled===false));
});

test('responsive BAHAR notes use only existing brand tokens and explicit print mode',()=>{
 const css=read('assets/css/jr-scientific-experience-v1.css');
 assert.match(css,/\.jr-science-continuity/);
 assert.match(css,/\.jr-bahar-weekly-review/);
 assert.match(css,/\.jr-bahar-week-fields textarea/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media print/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/url\(["']?https?:/i);
});
