/**
 * JREI Original Online Examinations: extract subject/blueprint insights from
 * lawful sources, draft ORIGINAL items, sell server-managed participation
 * (not unlicensed files), and preserve rights + independent review.
 *
 * This pure module has NO network, SQL, payment or publication side effects.
 * Existing eco_assessment_* and original BitPay provider are authorities.
 */
import {createHash} from 'node:crypto';
export const PRODUCT_KIND='JREI_PAID_ONLINE_ASSESSMENT';
export const SUBJECTS=Object.freeze(['HUMANITIES','MATHEMATICS','FOREIGN_LANGUAGES','EXPERIMENTAL_SCIENCES']);
export const PROVIDERS=Object.freeze(['SANJESH','KANOON','GAJ','GOZINE2','PARSEH','JREI_ORIGINAL']);
const sha=s=>createHash('sha256').update(s).digest('hex');
const DIGEST=/^[a-f0-9]{64}$/;
const text=(x,n=1000)=>typeof x==='string'&&x.trim().length>0&&x.length<=n;
const fail=(code,extra={})=>Object.freeze({allowed:false,reason:code,...extra});
/** Each source is evaluated for each proposed use; free-to-read != free-to-sell. */
export function planExamReferenceIntake({provider,subject,sourceUrl,accessPublic=false,
  robotsAllowed=false,permissionScope='UNKNOWN',licenseEvidenceSha256=null}={}){
 if(!PROVIDERS.includes(provider)||!SUBJECTS.includes(subject))
   return fail('UNRECOGNIZED_EXAM_SOURCE');
 let u;
 try{u=new URL(sourceUrl);}catch{return fail('INVALID_SOURCE_URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||!u.hostname.includes('.')||
    u.port)return fail('INVALID_SOURCE_URL');
 if(!accessPublic||!robotsAllowed)return fail('ACCESS_REVIEW_REQUIRED');
 const rights=['DISCOVERY_ONLY','PRIVATE_ANALYSIS_APPROVED','COMMERCIAL_REUSE_APPROVED'];
 if(!rights.includes(permissionScope))return fail('RIGHTS_SCOPE_UNVERIFIED');
 const canAnalyze=permissionScope!=='DISCOVERY_ONLY'&&DIGEST.test(licenseEvidenceSha256??'');
 const canReuse=permissionScope==='COMMERCIAL_REUSE_APPROVED'&&canAnalyze;
 return Object.freeze({
  allowed:true,source:'UNVERIFIED_SCOPE_SELF_ATTESTATION_REQUIRES_ORIGINAL_EVIDENCE',
  provider,subject,referenceSha256:sha(u.origin+u.pathname+u.search),
  metadataDiscoverable:true,downloadForPrivateAnalysisCandidate:canAnalyze,
  publishOriginalQuestionTextFromSource:canReuse,
  publishAnyQuestionForPaidExam:false,
  peerReviewStillRequired:true,
  saleOfSourceFilesAuthorized:false,
  fullReproductionAutomaticallyGranted:false
 });
}
/**
 * A proposed question is not an examination. Keep input question text and
 * answer keys in approved private systems, not public Git/CI metadata.
 */
export function assessOriginalItemProposal({subject,authorship,provenance,
  review,rights,exam}={}){
 if(!SUBJECTS.includes(subject)||!text(authorship?.originalAuthorId,100)||
    !DIGEST.test(authorship?.draftSha256??'')||!DIGEST.test(provenance?.studyBlueprintSha256??''))
   return fail('ORIGINAL_AUTHORSHIP_OR_BLUEPRINT_MISSING');
 if(authorship?.thirdPartyVerbatim===true||authorship?.paraphraseEquivalent===true||
    rights?.thirdPartyExpressionReused===true)
   return fail('THIRD_PARTY_EXPRESSION_REUSE_NOT_AUTHORIZED');
 if(rights?.originalPublicationAuthority!==true||rights?.licensedSourceClaimsVerified!==true)
   return fail('RIGHTS_NOT_INDEPENDENTLY_VERIFIED');
 if(!text(review?.independentReviewerId,100)||
    review.independentReviewerId===authorship.originalAuthorId||
    review?.questionAccepted!==true||review?.answerKeyAccepted!==true||
    review?.curriculumAlignmentAccepted!==true||review?.ambiguityCleared!==true||
    review?.mathMediaChecked!==true||
    !DIGEST.test(review?.checkedVersionSha256??'')||
    review.checkedVersionSha256!==authorship.draftSha256)
   return fail('INDEPENDENT_QUESTION_KEY_REVIEW_INCOMPLETE');
 // Valid scientific content alone never authorizes public collection or payment.
 if(exam?.originalBertinaServerTimeApproved!==true||
    exam?.privateVersionDeliveryApproved!==true||
    exam?.paymentEntitlementValidated!==true||
    exam?.testAttemptAndScoringVerified!==true||
    exam?.ownerLiveReleaseAccepted!==true)
   return fail('LIVE_ASSESSMENT_PAYMENT_AND_OWNER_GATES_INCOMPLETE');
 return Object.freeze({
  allowed:true,eligibility:'ORIGINAL_ITEM_REVIEW_CANDIDATE',
  productKind:PRODUCT_KIND,
  sourcePdfForSale:false,
  publicDeliveryNotAutomaticallyPermitted:true,
  verifiedPaymentRequiredPerAttempt:true,
  originalServerAndIndependentScientificReviewStillAuthoritative:true
 });
}
/** A compact learning trace for JREI; NEVER a transcript or model weights. */
export function summarizeExamLearningOutcome({itemSha256,reviewedAnswerKeySha256,
  failureKinds=[],independentlyReviewed=false,scoreRunVerified=false}={}){
 if(!DIGEST.test(itemSha256??'')||!DIGEST.test(reviewedAnswerKeySha256??'')||
    !Array.isArray(failureKinds)||failureKinds.length>20||
    failureKinds.some(x=>typeof x!=='string'||!/^[A-Z_]{4,50}$/.test(x)))
   return fail('LESSON_METADATA_INVALID');
 return Object.freeze({
  allowed:true,scope:'AGGREGATED_NONIDENTIFYING_ERROR_TAXONOMY',
  itemSha256,reviewedAnswerKeySha256,failureKinds:[...new Set(failureKinds)].sort(),
  status:independentlyReviewed&&scoreRunVerified?'REVIEWED_CANDIDATE':'NEEDS_REVIEW',
  trainingAutomaticallyApproved:false,studentResponsesCollected:false,
  minorsTrainingConsentEstablished:false,
  productEvaluationNotInferredFromRawModelOutput:true
 });
}
