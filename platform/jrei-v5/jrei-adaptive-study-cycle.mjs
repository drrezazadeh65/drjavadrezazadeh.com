/**
 * JREI adaptive progress planner: future suggestions derived exclusively
 * from actual reviewed assessment receipts, not estimated entrance scores.
 * Supports school/secondary/graduate tracks without invented exam dates.
 */
import {createHash} from 'node:crypto';
export const JREI_STUDY_PLANNER='jr.jrei.reviewed-adaptive-study.v1';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9._:-]{2,99}$/i;
const STAGES=['DIAGNOSTIC','PROGRESS','FINAL_MOCK'];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const deny=reason=>Object.freeze({eligible:false,reason,studyRecordWritten:false});
const time=x=>typeof x==='string'&&x.length<45&&Number.isFinite(Date.parse(x))?
 Date.parse(x):null;
const level=x=>typeof x==='string'&&[
 'SCHOOL_PRIMARY','SCHOOL_SECONDARY','IRANIAN_KONKUR','MASTERS',
 'PHD','INTERNATIONAL_RESEARCH'
].includes(x);
export function planReviewedStudyCycle({learner,receipts=[],nowUtc,
 examDateUtc=null,subject,level:educationLevel,policy}={}){
 const now=time(nowUtc),exam=examDateUtc===null?null:time(examDateUtc);
 if(now===null||examDateUtc!==null&&(exam===null||exam<now)||
    !level(educationLevel)||typeof subject!=='string'||
    !ID.test(subject)||!Array.isArray(receipts)||receipts.length>180)
   return deny('INVALID_STUDY_CONTEXT');
 if(!learner||learner.purposeConsent!==true||
    learner.ageGroup==='MINOR'&&learner.guardianConsent!==true||
    learner.withdrawn===true)
   return deny('LEARNER_OR_GUARDIAN_CONSENT_REQUIRED');
 if(policy?.ownerReleasedReviewedAssessments!==true||
    policy?.privateStudyDataAllowed!==true||
    policy?.originalMotherDatabase!==true)
   return deny('EXISTING_STUDY_POLICY_NOT_APPROVED');
 const cleaned=[];
 for(const x of receipts){
  if(!x||!SHA.test(x.receiptSha256??'')||
     !SHA.test(x.examVersionSha256??'')||
     !ID.test(x.skillId??'')||
     !STAGES.includes(x.stage)||
     x.serverScoreVerified!==true||
     x.questionKeysIndependentlyReviewed!==true||
     !Number.isSafeInteger(x.correct)||!Number.isSafeInteger(x.total)||
     x.total<1||x.total>500||x.correct<0||x.correct>x.total||
     time(x.completedAtUtc)===null||
     time(x.completedAtUtc)>now)
    return deny('ASSESSMENT_RECEIPT_UNVERIFIED');
  cleaned.push(x);
 }
 const bySkill=new Map();
 for(const x of cleaned){
  const saved=bySkill.get(x.skillId);
  if(!saved||time(x.completedAtUtc)>time(saved.completedAtUtc))
   bySkill.set(x.skillId,x);
 }
 const observed=[...bySkill.entries()].map(([skill,x])=>({
   skill,verifiedAccuracyPermille:Math.round(1000*x.correct/x.total),
   count:x.total,stage:x.stage,receiptSha256:x.receiptSha256
 })).sort((a,b)=>a.verifiedAccuracyPermille-b.verifiedAccuracyPermille||
     a.skill.localeCompare(b.skill));
 const remainingDays=exam===null?null:Math.ceil((exam-now)/86400000);
 const selectedStage=remainingDays===null?'DIAGNOSTIC':
   remainingDays<=3?'FINAL_MOCK':remainingDays<=14?'PROGRESS':'DIAGNOSTIC';
 const recommendations=observed.slice(0,8).map(x=>({
   skillId:x.skill,verifiedRecentAccuracyPermille:x.verifiedAccuracyPermille,
   recommendation:x.verifiedAccuracyPermille<500?'REVIEW_FOUNDATIONS':
     x.verifiedAccuracyPermille<800?'TARGETED_PRACTICE':
     'MAINTENANCE_AND_TRANSFER',
   originalReviewedPracticeRequired:true
 }));
 const result={
   schema:JREI_STUDY_PLANNER,educationLevel,subject,
   stage:selectedStage,daysUntilExam:remainingDays,
   receiptCount:cleaned.length,skillsWithVerifiedReceipts:observed.length,
   recommendations,referencePolicy:{diagnosticWindowDays:30,
     progressWindowDays:14,finalMockWindowDays:3},
   resultStatus:observed.length?'EVIDENCE_BASED_PROPOSAL':'DIAGNOSTIC_DATA_REQUIRED',
   nextAssessmentMustBeActualReviewedProduct:true,
   nominalDateIsNotOfficialExamDate:exam===null,
   predictedKonkurRank:null,admissionProbability:null,
   psychologicalDiagnosis:null,trainingWithoutSeparateConsent:false,
   studyRecordWritten:false,paidAttemptCreated:false
 };
 return Object.freeze({...result,eligible:true,planDigestSha256:hash(result)});
}
export function recordAdaptiveReviewProposal({currentPlan,learnerConsentCurrent,
 reviewerId,reviewReceiptSha256,correctionCode}={}){
 if(!currentPlan||currentPlan.schema!==JREI_STUDY_PLANNER||
   !SHA.test(currentPlan.planDigestSha256??'')||
   learnerConsentCurrent!==true||!ID.test(reviewerId??'')||
   !SHA.test(reviewReceiptSha256??'')||
   !/^[A-Z_]{4,50}$/.test(correctionCode??''))
   return deny('REVIEW_RECORD_INVALID');
 return Object.freeze({eligible:true,planDigestSha256:currentPlan.planDigestSha256,
   reviewerId,reviewReceiptSha256,correctionCode,
   status:'REVIEWED_STUDY_ADVICE_CANDIDATE',
   userDataExported:false,modelFinetuningAuthorized:false,
   consentCanBeWithdrawn:true,publicationTriggered:false});
}
