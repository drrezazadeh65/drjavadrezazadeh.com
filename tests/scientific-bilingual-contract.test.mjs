import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('Golden Talent scientific prevalidation is unchanged by the English interface',()=>{
 const registry=JSON.parse(read('platform/golden-talent-instrument-registry.v1.json'));
 assert.equal(registry.scientific_policy.validation_status,'PREVALIDATION');
 assert.equal(registry.scientific_policy.total_talent_score_allowed,false);
 for(const tool of registry.instruments){
  assert.equal(tool.scoring_enabled,false,tool.id);
  assert.equal(tool.human_approval,false,tool.id);
 }
 const en=read('en/golden-talent/assessment/index.html');
 const fa=read('fa/assessments/golden-talent/start/index.html');
 const source=read('assets/js/rcas-start-en.js');
 assert.match(en,/rcasEnForm/);
 assert.match(en,/rcas-start-en\.js/);
 assert.match(en,/not a validated talent assessment/);
 assert.match(source,/SELF_SELECTED_UNVALIDATED/);
 assert.match(source,/completedItemCount:28/);
 assert.match(fa,/rcasApp/);
 for(const page of [en,fa]){
  assert.match(page,/jr-ecosystem-design-v2/);
  assert.match(page,/class="skip"/);
 }
});
test('BAHAR keeps real learner portfolios and validation behind independent gates',()=>{
 const fa=read('fa/app/student/bahar/index.html');
 const en=read('en/golden-talent/dashboard/bahar/index.html');
 for(const page of [fa,en]){
  assert.match(page,/data-bahar-health/);
  assert.match(page,/bahar-readiness\.js/);
  assert.match(page,/class="skip"/);
 }
 for(const title of ['Baseline','Eight-Week','Weekly','Evidence','Four-Week','30-Day'])
  assert.match(en,new RegExp(title,'i'));
 for(const phase of ['Recognise context and direction','Choose a strategy and action',
   'Act on the plan','Monitor and collect evidence','Interpret gaps and errors',
   'Revise and return to action']) assert.ok(en.includes(phase),'English BAHAR phase: '+phase);
 assert.doesNotMatch(en,/<b>H<\\/b>/,'avoid unsupported BAHAR mnemonic expansion');
 assert.match(read('assets/js/bahar-readiness.js'),/longitudinalTrendValidated/);
});
test('English support routing stays within its own canonical language',()=>{
 const page=read('en/support-talented-students/index.html');
 assert.match(page,/href="\/en\/account\/#student-support"/);
 assert.match(page,/href="\/en\/golden-talent\/student\/"/);
 assert.match(page,/href="\/en\/account\/privacy\/"/);
 assert.match(page,/data-support-form/);
 assert.match(read('assets/js/donation-payment.js'),/gateway\.hostname!=='bitpay\.ir'/);
});
