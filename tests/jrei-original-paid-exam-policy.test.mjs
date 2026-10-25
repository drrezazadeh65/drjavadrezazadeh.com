import test from 'node:test';
import assert from 'node:assert/strict';
import {planExamReferenceIntake,assessOriginalItemProposal,summarizeExamLearningOutcome,PRODUCT_KIND}
 from '../platform/jrei-v5/jrei-original-paid-exam-policy.mjs';
const h='a'.repeat(64);
const good={
 subject:'MATHEMATICS',
 authorship:{originalAuthorId:'owner-edu-author',draftSha256:h,thirdPartyVerbatim:false,paraphraseEquivalent:false},
 provenance:{studyBlueprintSha256:h},
 rights:{originalPublicationAuthority:true,licensedSourceClaimsVerified:true,thirdPartyExpressionReused:false},
 review:{independentReviewerId:'external-reviewed-editor',questionAccepted:true,
    answerKeyAccepted:true,curriculumAlignmentAccepted:true,
    ambiguityCleared:true,mathMediaChecked:true,checkedVersionSha256:h},
 exam:{originalBertinaServerTimeApproved:true,privateVersionDeliveryApproved:true,
   paymentEntitlementValidated:true,testAttemptAndScoringVerified:true,ownerLiveReleaseAccepted:true}
};
test('free online source can be discovered; no commercial rights invented',()=>{
 const r=planExamReferenceIntake({provider:'KANOON',subject:'HUMANITIES',
  sourceUrl:'https://www.kanoon.ir/public/',accessPublic:true,
  robotsAllowed:true,permissionScope:'DISCOVERY_ONLY'});
 assert.equal(r.allowed,true);
 assert.equal(r.publishOriginalQuestionTextFromSource,false);
 assert.equal(r.downloadForPrivateAnalysisCandidate,false);
 assert.equal(r.saleOfSourceFilesAuthorized,false);
});
test('a public link never automatically authorizes exam text reproduction',()=>{
 const r=planExamReferenceIntake({provider:'GOZINE2',subject:'FOREIGN_LANGUAGES',
  sourceUrl:'https://www.gozine2.ir/',accessPublic:true,robotsAllowed:true,
  permissionScope:'PRIVATE_ANALYSIS_APPROVED',licenseEvidenceSha256:h});
 assert.equal(r.publishOriginalQuestionTextFromSource,false);
});
test('original independently verified in-platform question is not a PDF sale',()=>{
 const r=assessOriginalItemProposal(good);
 assert.equal(r.allowed,true);
 assert.equal(r.productKind,PRODUCT_KIND);
 assert.equal(r.sourcePdfForSale,false);
 assert.equal(r.publicDeliveryNotAutomaticallyPermitted,true);
});
test('unreviewed or paraphrased copies and missing payment are blocked',()=>{
 assert.equal(assessOriginalItemProposal({...good,
  authorship:{...good.authorship,paraphraseEquivalent:true}}).allowed,false);
 assert.equal(assessOriginalItemProposal({...good,
  review:{...good.review,independentReviewerId:'owner-edu-author'}}).allowed,false);
 assert.equal(assessOriginalItemProposal({...good,
  exam:{...good.exam,paymentEntitlementValidated:false}}).allowed,false);
});
test('an error taxonomy is not student-data collection or training consent',()=>{
 const x=summarizeExamLearningOutcome({itemSha256:h,reviewedAnswerKeySha256:h,
  failureKinds:['AMBIGUOUS_KEY'],independentlyReviewed:true,scoreRunVerified:true});
 assert.equal(x.trainingAutomaticallyApproved,false);
 assert.equal(x.studentResponsesCollected,false);
 assert.equal(x.status,'REVIEWED_CANDIDATE');
});
