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
 assert.match(source,/All 28 responses are not applicable or unsure/);
 assert.match(source,/No domain has sufficient evidence yet/);
 assert.match(source,/\['Junior secondary','Upper secondary'\]\.includes\(stage\)/);
 assert.match(source,/Explain why you selected this area/);
 assert.match(en,/Why does this area matter to you\? \(required\)/);
 const bridge=read('assets/js/rcas-dashboard-en-bridge.js');
 for(const flag of ['p0Validated','routingEvidenceCompleted','meaningfulCoreEvidence'])
  assert.ok(bridge.includes(flag+'!==true'),'pilot bridge must reject incomplete '+flag);
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
   'Revise the strategy or goal','Return to action']) assert.ok(en.includes(phase),'English BAHAR phase: '+phase);
 const faCycle=read('fa/app/student/bahar/index.html');
 for(const phase of ['اصلاح راهبرد یا هدف','بازگشت به عمل'])assert.ok(faCycle.includes(phase),'Persian BAHAR phase: '+phase);
 const model=read('platform/bahar-engine.mjs');
 for(const phase of ['RECOGNISE_CONTEXT','CHOOSE_ACTION','ACT','MONITOR_EVIDENCE','INTERPRET_GAP','REVISE','RETURN_TO_ACTION'])assert.ok(model.includes(phase),'Engine BAHAR phase: '+phase);
 assert.ok(!en.includes('<b>H</b>'),'avoid unsupported BAHAR mnemonic expansion');
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

test('Golden Path displays only same-tab RCAS reflection without manufacturing entitlements',()=>{
 const script=read('assets/js/golden-path-session-bridge.js');
 assert.match(script,/SELF_SELECTED_UNVALIDATED/);
 assert.match(script,/meaningfulCoreEvidence!==true/);
 assert.match(script,/sessionStorage\.getItem/);
 assert.match(script,/textContent/);
 assert.doesNotMatch(script,/\bfetch\s*\(|\bXMLHttpRequest\b/);
 for(const path of ['fa/app/student/golden-path/index.html',
                    'en/golden-talent/dashboard/golden-path/index.html']){
  const html=read(path);
  assert.match(html,/data-golden-path-session-status/);
  assert.match(html,/golden-path-session-bridge\.js\?v=20261015-2/);
  assert.match(html,/jr-ecosystem-design-v2\.css\?v=20261015-r2/);
  assert.match(html,/jr-ecosystem-design-v2\.css/);
  assert.match(html,/class="skip"/);
 }
});
