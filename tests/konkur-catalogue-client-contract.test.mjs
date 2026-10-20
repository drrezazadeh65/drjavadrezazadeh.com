import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('catalogue explorer is additive, read only and does not send student or scorecard data',()=>{
 const s=read('assets/js/jr-konkur-official-catalogue-v1.js');
 for(const k of ['[data-konkur-selection]','/api/konkur/programmes','sourcePdfPage',
   "sourceVerification==='HUMAN_REVIEWED'","status==='SOURCE_REVIEWED_CATALOGUE'",
   "eligibilityAssessment!=='NOT_PERFORMED'","r.officialRegistration!==false",
   "admissionProbabilityEnabled!==false", "credentials:'omit'","cache:'no-store'"])
   assert.ok(s.includes(k),'missing safety: '+k);
 assert.doesNotMatch(s,/\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon)\b/);
 assert.doesNotMatch(s,/method:'(?:POST|PUT|PATCH|DELETE)'/);
 assert.doesNotMatch(s,/\binnerHTML\s*=/);
 assert.doesNotMatch(s,/(?:scorecard|rankInQuota|studentAccount|learnerId|passportNumber)/i);
 const p=spawnSync(process.execPath,['--check','assets/js/jr-konkur-official-catalogue-v1.js'],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});
test('public Choice Studio pages retain original worksheet and add one reviewed-catalogue script in both languages',()=>{
 for(const [lang,path] of [['fa','fa/entekhab-reshteh/index.html'],['en','en/student-guidance/index.html']]){
  const s=read(path);
  assert.ok(s.includes('data-choice-studio data-locale="'+lang+'"'));
  assert.ok(s.includes('data-konkur-selection data-locale="'+lang+'"'));
  assert.ok(s.includes('jr-konkur-official-catalogue-v1.js'));
  assert.ok(s.indexOf('jr-konkur-studio-v1.js')<s.indexOf('jr-konkur-official-catalogue-v1.js'));
 }
});
