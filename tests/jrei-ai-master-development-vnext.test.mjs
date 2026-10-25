import test from 'node:test';
import assert from 'node:assert/strict';
import {planJreiArithmetic,auditJreiArithmetic}
 from '../platform/jrei-v5/jrei-deterministic-arithmetic.mjs';
import {inspectJreiEducationalDraft}
 from '../platform/jrei-v5/jrei-educational-answer-review.mjs';
import {proposeReviewedKnowledgeCapsule}
 from '../platform/jrei-v5/jrei-reviewed-knowledge-capsules.mjs';
import {reviewOriginalExamItem,proposeOnlineExamBlueprint}
 from '../platform/jrei-v5/jrei-original-item-factory.mjs';
import {planReviewedStudyCycle}
 from '../platform/jrei-v5/jrei-adaptive-study-cycle.mjs';
import {proposeJreiMission,checkJreiMissionStep}
 from '../platform/jrei-v5/jrei-scoped-mission-planner.mjs';
import {proposeJreiDevelopmentRepair}
 from '../platform/jrei-v5/jrei-explainable-site-apprentice.mjs';
import {planOfficialBilingualNews}
 from '../platform/news-intelligence/jrei-official-news-correction.mjs';
import {planJreiAcquisitionBatch}
 from '../platform/jrei-v5/jrei-nightly-acquisition-planner.mjs';

test('Qwen observed 12-times-7 error cannot be accepted as exact arithmetic',()=>{
 const plan=planJreiArithmetic('عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.','fa');
 assert.equal(plan.eligible,true);
 assert.equal(plan.exactDecimal,'84');
 assert.equal(plan.answer,'۸۴');
 assert.equal(plan.modelInvoked,false);
 assert.equal(auditJreiArithmetic('عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.','۴۸','fa').verified,false);
 assert.equal(auditJreiArithmetic('12 × 7','۸۴','fa').verified,true);
 assert.equal(planJreiArithmetic('12 / 0','en').eligible,false);
 assert.equal(planJreiArithmetic('what is 36 divided by 6?','en').exactDecimal,'6');
 assert.equal(planJreiArithmetic('calculate student university grades 12 x 7','en').eligible,false);
});
test('Persian Han insertion and false measurement definition block output',()=>{
 const mixed=inspectJreiEducationalDraft({
  question:'اعتبار سنجی',answer:'م可靠性',language:'fa',stopReason:'stop'});
 assert.equal(mixed.status,'REJECT');
 assert.ok(mixed.reasonCodes.includes('CJK_SCRIPT_INTRUSION'));
 const wrong=inspectJreiEducationalDraft({
  question:'روایی و پایایی چه تفاوتی دارند؟',
  answer:'روایی به سرعت و اثربخشی اطلاعات اشاره دارد.',
  language:'fa'});
 assert.ok(wrong.reasonCodes.includes('FLAWED_PERSIAN_VALIDITY_DEFINITION'));
 const benign=inspectJreiEducationalDraft({
  question:'Explain learning',answer:'Learning involves practice and feedback.',
  language:'en'});
 assert.equal(benign.status,'REVIEW_REQUIRED');
 assert.equal(benign.automaticReleaseApproved,false);
});
test('reviewed sources cannot be invented without rights and independent review',()=>{
 assert.equal(proposeReviewedKnowledgeCapsule({}).admissible,false);
});
test('original paid exam item is fail closed without real original authorship',()=>{
 assert.equal(reviewOriginalExamItem({}).eligible,false);
 const b=proposeOnlineExamBlueprint({subject:'MATHEMATICS',grade:12,
   stage:'DIAGNOSTIC',questionsBySkill:[{skillId:'algebra-basic',count:12}],
   reviewedItemCapsules:[]});
 assert.equal(b.eligible,true);
 assert.equal(b.shortage,12);
 assert.equal(b.paidCataloguePublished,false);
});
test('adaptive study plans require actual consented assessment receipts',()=>{
 assert.equal(planReviewedStudyCycle({}).eligible,false);
 const p=planReviewedStudyCycle({
  learner:{purposeConsent:true,ageGroup:'ADULT'},
  receipts:[],nowUtc:'2026-10-25T15:00:00Z',subject:'english-learning',
  level:'MASTERS',policy:{ownerReleasedReviewedAssessments:true,
    privateStudyDataAllowed:true,originalMotherDatabase:true}});
 assert.equal(p.eligible,true);
 assert.equal(p.resultStatus,'DIAGNOSTIC_DATA_REQUIRED');
 assert.equal(p.predictedKonkurRank,null);
});
test('multi-agent mission cannot execute a privileged task itself',()=>{
 const policyDigest='a'.repeat(64);
 const m=proposeJreiMission({missionId:'jrei-knowledge-cycle',
  policyDigest,nodes:[
   {id:'discover-docs',kind:'PUBLIC_SOURCE_DISCOVERY',after:[]},
   {id:'review-rights',kind:'RIGHTS_REVIEW',after:['discover-docs']}
  ]});
 assert.equal(m.allowed,true);
 assert.equal(m.executed,false);
 assert.equal(checkJreiMissionStep(m,'review-rights',{}).allowed,false);
 const cyclic=proposeJreiMission({missionId:'jrei-invalid',
  policyDigest,nodes:[
   {id:'a-task',kind:'RIGHTS_REVIEW',after:['b-task']},
   {id:'b-task',kind:'PRIVATE_ACQUISITION',after:['a-task']}
  ]});
 assert.equal(cyclic.allowed,false);
});
test('a successful CI run is only correlated, not proven causal',()=>{
 const a=proposeJreiDevelopmentRepair({
  failedRun:{workflow:'source-check',headSha:'a'.repeat(40),
   conclusion:'failure',runId:100},
  subsequentRun:{workflow:'source-check',headSha:'b'.repeat(40),
   conclusion:'success',runId:101},
  changedPaths:['platform/jrei-v5/jrei-deterministic-arithmetic.mjs']
 });
 assert.equal(a.admissible,true);
 assert.equal(a.status,'CORRELATION_ONLY_NOT_A_PROVEN_REPAIR');
});
test('news and overnight acquisition do not publish or download anything',()=>{
 assert.equal(planOfficialBilingualNews({}).admissible,false);
 const plan=planJreiAcquisitionBatch({
  nowUtc:'2026-10-25T00:30:00Z',
  sourceProposals:[],alreadyUsedBytes:0,
  ownerPolicy:{reviewedSourceCollectionApproved:true,
   respectRobotsAndRates:true,recordOriginalEvidence:true},
  nodeStatus:{authorized:true,freshSignedHeartbeat:true,
   resourcePressureOk:true}});
 assert.equal(plan.started,false);
 assert.equal(plan.actualTransferredBytes,0);
});
