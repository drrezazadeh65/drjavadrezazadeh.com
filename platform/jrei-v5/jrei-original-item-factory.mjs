/**
 * JREI original paid-online-exam item factory. This module verifies
 * proposals, never copies publisher questions, sells a PDF, or imports to
 * the existing eco_assessment_* mother database by itself.
 */
import {createHash} from 'node:crypto';
export const JREI_ITEM_FACTORY='jr.jrei.original-exam-item-review.v1';
export const JREI_STAGES=Object.freeze(['DIAGNOSTIC','PROGRESS','FINAL_MOCK']);
export const JREI_EXAM_SUBJECTS=Object.freeze([
 'HUMANITIES','MATHEMATICS','FOREIGN_LANGUAGES','EXPERIMENTAL_SCIENCES'
]);
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9._:-]{2,90}$/i;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=code=>Object.freeze({eligible:false,reason:code,autoPublished:false});
const normalized=s=>s.normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک')
 .replace(/\s+/gu,' ').trim().toLocaleLowerCase('fa');
/** Candidate copy never contains real learner submissions. */
export function reviewOriginalExamItem({
 item,blueprint,author,reviewer,rights,authority
}={}){
 if(!item||!JREI_EXAM_SUBJECTS.includes(item.subject)||
    !Array.isArray(item.options)||item.options.length!==4||
    !item.options.every(x=>typeof x==='string'&&x.trim().length>=1&&x.length<=600)||
    typeof item.stem!=='string'||item.stem.trim().length<12||
    item.stem.length>2000||typeof item.answerId!=='string'||
    !['A','B','C','D'].includes(item.answerId)||
    !['fa','en'].includes(item.language))
   return fail('INCOMPLETE_ORIGINAL_ITEM');
 const canonicalOptions=item.options.map(normalized);
 if(new Set(canonicalOptions).size!==4)
   return fail('DUPLICATED_OPTIONS');
 if(!blueprint||!ID.test(blueprint.id??'')||
    !SHA.test(blueprint.reviewedDigestSha256??'')||
    !JREI_STAGES.includes(blueprint.stage)||
    !Number.isInteger(blueprint.grade)||blueprint.grade<1||blueprint.grade>20)
   return fail('REVIEWED_BLUEPRINT_MISSING');
 if(!author||!ID.test(author.authorId??'')||
    !SHA.test(author.originalDraftSha256??'')||
    author.originalWorkAttested!==true||
    author.thirdPartyVerbatim!==false||
    author.closeParaphraseOfProtectedItem!==false)
   return fail('AUTHORSHIP_OR_REUSE_RISK');
 const textDigest=digest({stem:item.stem,options:item.options,
   answerId:item.answerId,subject:item.subject,language:item.language});
 if(textDigest!==author.originalDraftSha256)
   return fail('CONTENT_CHANGED_SINCE_AUTHOR_ATTESTATION');
 if(!rights||rights.originalPublishingRightsReviewed!==true||
    rights.licensedBlueprintScopeConfirmed!==true||
    !SHA.test(rights.reviewReceiptSha256??''))
   return fail('PUBLICATION_RIGHTS_NOT_VERIFIED');
 if(!reviewer||!ID.test(reviewer.reviewerId??'')||
    reviewer.reviewerId===author.authorId||
    reviewer.independentQuestionReviewed!==true||
    reviewer.answerKeyVerified!==true||
    reviewer.distractorsVerified!==true||
    reviewer.curriculumAlignmentVerified!==true||
    reviewer.accessibilityReviewed!==true||
    reviewer.scientificClaimsChecked!==true||
    !SHA.test(reviewer.reviewReceiptSha256??'')||
    reviewer.checkedDraftSha256!==textDigest)
   return fail('INDEPENDENT_PEDAGOGICAL_REVIEW_REQUIRED');
 if(!authority||authority.originalDatabaseContractVerified!==true||
    authority.ownerPublicationApproved!==true||
    authority.paymentEntitlementIntegrationVerified!==true)
   return fail('MOTHER_DB_ENTITLEMENT_OR_RELEASE_NOT_APPROVED');
 const capsule={
   schema:JREI_ITEM_FACTORY,itemTextSha256:textDigest,
   originalAuthorId:author.authorId,reviewerId:reviewer.reviewerId,
   subject:item.subject,grade:blueprint.grade,stage:blueprint.stage,
   language:item.language,reviewedBlueprintSha256:blueprint.reviewedDigestSha256,
   scientificReviewReceipt:reviewer.reviewReceiptSha256,
   publicationRightsReceipt:rights.reviewReceiptSha256,
   answerOptionId:item.answerId,
   status:'APPROVED_ITEM_IMPORT_CANDIDATE',
   existingMotherDbMustAcceptImport:true,
   actualDatabaseImportPerformed:false,
   candidatePaymentConfirmed:false,
   generatedSourcePdfForSale:false,
   studentActivityStored:false,
   independentRandomizationRequired:true,
   reliableServerTimerRequired:true,autoPublished:false
 };
 return Object.freeze({eligible:true,...capsule,capsuleSha256:digest(capsule)});
}
/** Only static blueprint composition; no fake test or purchasable attempt. */
export function proposeOnlineExamBlueprint({subject,grade,stage,
 questionsBySkill,reviewedItemCapsules=[]}={}){
 if(!JREI_EXAM_SUBJECTS.includes(subject)||
   !Number.isInteger(grade)||grade<1||grade>20||
   !JREI_STAGES.includes(stage)||!Array.isArray(questionsBySkill)||
   questionsBySkill.length<1||questionsBySkill.length>40||
   !questionsBySkill.every(x=>ID.test(x.skillId??'')&&
      Number.isInteger(x.count)&&x.count>0&&x.count<=100)||
   !Array.isArray(reviewedItemCapsules)||reviewedItemCapsules.length>500)
   return fail('BLUEPRINT_INVALID');
 const count=questionsBySkill.reduce((n,x)=>n+x.count,0);
 if(count>200)return fail('EXAM_CAPACITY_LIMIT');
 const eligible=reviewedItemCapsules.filter(x=>x&&x.eligible===true&&
   x.schema===JREI_ITEM_FACTORY&&x.subject===subject&&x.grade===grade&&
   x.stage===stage&&x.status==='APPROVED_ITEM_IMPORT_CANDIDATE');
 return Object.freeze({
   eligible:true,subject,grade,stage,
   requiredQuestionCount:count,reviewedItemCandidateCount:eligible.length,
   shortage:Math.max(0,count-eligible.length),
   readiness:eligible.length>=count?'NEEDS_GENUINE_DB_ENTITLEMENT_AND_DELIVERY':
     'INSUFFICIENT_INDEPENDENTLY_REVIEWED_ITEMS',
   onlineAssessmentOnly:true,verifiedTimedDelivery:false,
   paidCataloguePublished:false,
   generatedPDFForSale:false,actualOfficialExamQuestionsCopied:false
 });
}
