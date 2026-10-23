/**
 * Lawful examination-source discovery: bounded PLAN + candidate verification.
 * No DNS, network, OCR, local file, automation or PII is accessed here.
 * An eventual authenticated Windows worker may execute ONLY a reviewed
 * source/robots/licence allowlist, with no redirects or CAPTCHA bypass.
 */
import {createHash} from 'node:crypto';
import {
  validateExamScope,assessExaminationSource
} from './jrei-examination-contracts.mjs';

export const DISCOVERY_CONTRACT='jr.jrei.exam-intake.v1';
export const EXTRACTABLE_TYPES=Object.freeze([
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png','image/jpeg'
]);
export const PAPER_KINDS=Object.freeze([
  'EXAM_PAPER','ANSWER_KEY','MARKING_SCHEME',
  'CURRICULUM_BLUEPRINT','EXAMINATION_GUIDANCE'
]);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9._:-]{1,100}$/.test(x);
const hashed=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=(reason)=>Object.freeze({ok:false,downloadAllowed:false,
  publicationAllowed:false,reason});
const validHttps=(url,approvedHost)=>{
  if(typeof url!=='string'||url.length>1200||typeof approvedHost!=='string')return false;
  try{
    const u=new URL(url);
    return u.protocol==='https:'&&u.hostname===approvedHost&&
      !u.username&&!u.password&&!u.hash&&!u.port&&
      !/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)&&
      !['localhost','127.0.0.1','::1'].includes(u.hostname)&&
      !u.pathname.includes('..');
  }catch{return false;}
};
/** This is a queue intent, NOT permission for an external HTTP request. */
export function proposeExamDiscovery({
  sourceAuthorityId,approvedHttpsHost,seedUrl,
  scope,paperKinds,termsReview,robotsReview,
  sourceReviewAttestation,maxRequestsPerDay=20
}={}) {
 const scoped=validateExamScope(scope);
 if(!scoped.ok)return fail('EXAM_SCOPE_NOT_REVIEWED');
 if(!validId(sourceAuthorityId)||!validHttps(seedUrl,approvedHttpsHost)||
    !Array.isArray(paperKinds)||paperKinds.length<1||paperKinds.length>5||
    paperKinds.some(k=>!PAPER_KINDS.includes(k))||
    !Number.isInteger(maxRequestsPerDay)||maxRequestsPerDay<1||
    maxRequestsPerDay>60)
   return fail('SOURCE_ALLOWLIST_INVALID');
 if(!plain(termsReview)||termsReview.reviewed!==true||
    termsReview.bulkDiscoveryPermitted!==true||
    !validId(termsReview.reviewVersion)||
    !plain(robotsReview)||robotsReview.reviewed!==true||
    robotsReview.allowAutomatedAccess!==true||
    !validId(robotsReview.reviewVersion)||
    sourceReviewAttestation!==true)
   return fail('TERMS_ROBOTS_OR_ISSUER_APPROVAL_REQUIRED');
 return Object.freeze({
   ok:true,contract:DISCOVERY_CONTRACT,
   status:'APPROVED_DISCOVERY_CANDIDATE',
   sourceAuthorityId,approvedHttpsHost,
   seedLocatorSha256:digest(seedUrl),
   sourceScope:scoped.scope,
   paperKinds:Object.freeze([...new Set(paperKinds)]),
   maxRequestsPerDay,
   reviewVersions:{terms:termsReview.reviewVersion,
     robots:robotsReview.reviewVersion},
   requiresPrivateWorker:true,requiresHostOutboundReview:true,
   requiresActualRobotsFetchBeforeEachBatch:true,
   redirectsAllowed:false,authenticationBypassAllowed:false,
   rawDocumentDownloadAllowed:false,
   publicationAllowed:false
 });
}
/**
 * Extraction may only be considered once physical source bytes, licence,
 * ownership, OCR quality and non-text components have been independently
 * reviewed. The original document must remain private until legal approval.
 */
export function planReviewedExamExtraction({
 source,document,mimeType,originalSha256,
 verifiedBytesCount,provenanceLocator,includesDiagrams=false,
 includesFormulas=false,includesTables=false,
 independentComponentReview=false,ocrConsent=false,
 allowedPrivateStore=false
}={}) {
 const approval=assessExaminationSource({source,task:'extract'});
 if(!approval.ok)return fail(approval.reason);
 if(!plain(document)||!validId(document.documentVersion)||
    !EXTRACTABLE_TYPES.includes(mimeType)||!hashed(originalSha256)||
    !Number.isSafeInteger(verifiedBytesCount)||
    verifiedBytesCount<1||verifiedBytesCount>25_000_000||
    typeof provenanceLocator!=='string'||provenanceLocator.length>160||
    allowedPrivateStore!==true)return fail('DOCUMENT_METADATA_OR_PRIVATE_STORAGE_UNAPPROVED');
 if(originalSha256!==source.originalSha256)
   return fail('ORIGINAL_DIGEST_MISMATCH');
 const requiresComponentReview=includesDiagrams||includesFormulas||includesTables;
 if(requiresComponentReview&&independentComponentReview!==true)
   return fail('DIAGRAM_FORMULA_TABLE_REVIEW_REQUIRED');
 if(['image/png','image/jpeg'].includes(mimeType)&&ocrConsent!==true)
   return fail('OCR_PERMISSION_OR_QUALITY_REVIEW_REQUIRED');
 return Object.freeze({ok:true,contract:DISCOVERY_CONTRACT,
   sourceId:source.sourceId,documentVersion:document.documentVersion,
   originalSha256,verifiedBytesCount,mimeType,
   extractionStatus:'AWAITING_HUMAN_CHECKED_OUTPUT',
   dataMayBeStoredPublicly:false,privateApprovedStorageRequired:true,
   licenceProofRequiredAtPublication:true,
   noAssumedAnswerKey:true,
   diagramsRetained:includesDiagrams,
   formulasRetained:includesFormulas,
   tablesRetained:includesTables,
   publicationAllowed:false});
}
/** Candidate keys are not official until human review. Leading zeros and
 * distinctive diacritics remain in original protected source object. */
export function inspectAnswerKeyConflicts({
 itemFingerprint,year,sourceDigest,recordedKeys
}={}) {
 if(!hashed(itemFingerprint)||!hashed(sourceDigest)||
    !Number.isInteger(year)||year<1300||year>2400||
    !Array.isArray(recordedKeys)||recordedKeys.length>50||
    recordedKeys.some(x=>!plain(x)||!validId(x.optionCode)||
      !hashed(x.sourceSha256)||!validId(x.reviewState)))
   return fail('ANSWER_KEY_PROVENANCE_INVALID');
 const byOption=new Map();
 for(const key of recordedKeys){
   const seen=byOption.get(key.optionCode)||new Set();
   seen.add(key.sourceSha256);
   byOption.set(key.optionCode,seen);
 }
 const incompatible=byOption.size>1;
 return Object.freeze({
  ok:true,itemFingerprint,examYear:year,
  sourceDigest,answerOptionCount:byOption.size,
  conflictDetected:incompatible,
  reviewState:!recordedKeys.length?'ANSWER_KEY_UNKNOWN'
    :incompatible?'CONFLICT_REQUIRES_HUMAN_REVIEW'
    :'SINGLE_ANSWER_CANDIDATE_UNVERIFIED',
  publicAnswerReady:false,
  // No determination of which official key is correct without comparing
  // each cited original and its later amendments.
  recommendedOption:null
 });
}
