/**
 * Official JREI News correction and release proposal.
 * Source evidence, translations and actual original-CMS receipts are
 * independent. Nothing here publishes an article or fabricates a DOI.
 */
import {createHash} from 'node:crypto';
export const JREI_NEWS_POLICY='jr.jrei.primary-news-correction.v1';
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9_.:-]{2,95}$/i;
const fail=reason=>Object.freeze({admissible:false,reason,articlePublished:false});
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const iso=s=>typeof s==='string'&&s.length<42&&Number.isFinite(Date.parse(s));
export function planOfficialBilingualNews({source,review,translations,
 release}={}){
 if(!source||!HASH.test(source.documentSha256??'')||
    !HASH.test(source.licenceEvidenceSha256??'')||
    !ID.test(source.sourceId??'')||
    !iso(source.issuedAtUtc)||source.officialIssuerVerified!==true||
    source.reusePermitted!==true||source.revoked===true)
   return fail('PRIMARY_OFFICIAL_SOURCE_NOT_CURRENT');
 if(!review||!HASH.test(review.independentFactReceiptSha256??'')||
    !HASH.test(review.citationAuditSha256??'')||
    review.claimsIndependentlyVerified!==true||
    review.contradictoryPrimarySourcesPending===true||
    review.authorizedReviewerConfirmed!==true)
   return fail('INDEPENDENT_FACTS_OR_CONTRADICTION_PENDING');
 if(!translations||!HASH.test(translations.faDigestSha256??'')||
    !HASH.test(translations.enDigestSha256??'')||
    translations.independentBilingualReview!==true||
    translations.originalEditorialVoiceAccepted!==true||
    translations.noUnlicensedVerbatimReuse!==true)
   return fail('BILINGUAL_OR_ORIGINALITY_REVIEW_PENDING');
 if(!release||release.standingOwnerPolicyCurrent!==true||
    release.originalCmsWriteAuthorized!==true||
    !HASH.test(release.currentOwnerPolicyDigest??''))
   return fail('OWNER_STANDING_RELEASE_NOT_ESTABLISHED');
 const result={
   schema:JREI_NEWS_POLICY,sourceId:source.sourceId,
   sourceDocumentDigest:source.documentSha256,
   sourceLicenceDigest:source.licenceEvidenceSha256,
   scientificFactReviewDigest:review.independentFactReceiptSha256,
   checkedCitationDigest:review.citationAuditSha256,
   bilingualDigests:{fa:translations.faDigestSha256,
     en:translations.enDigestSha256},
   currentOwnerPolicyDigest:release.currentOwnerPolicyDigest,
   sourceIssuedAtUtc:source.issuedAtUtc,
   status:'ELIGIBLE_FOR_EXISTING_REVIEWED_CMS_PIPELINE',
   cmsPublicationReceipt:null,articlePublished:false,
   publicCanonicalUrls:[],paymentsChanged:false,
   learnerRecordsCopied:false,modelTrainingAuthorized:false
 };
 return Object.freeze({...result,admissible:true,proposalDigestSha256:digest(result)});
}
export function planOfficialNewsCorrection({earlierReceipt,amendment,
 independentReview,ownerStandingPolicyCurrent=false}={}){
 if(!earlierReceipt||!HASH.test(earlierReceipt.originalCmsReceiptSha256??'')||
    !HASH.test(earlierReceipt.publishedDigestSha256??'')||
    !ID.test(earlierReceipt.sourceId??'')||
    !amendment||amendment.sourceId!==earlierReceipt.sourceId||
    !HASH.test(amendment.newSourceSha256??'')||
    !HASH.test(amendment.officialCorrectionReceiptSha256??'')||
    amendment.issuedByOriginalAuthority!==true||
    !iso(amendment.correctedAtUtc))
   return fail('OFFICIAL_CORRECTION_NOT_AUTHENTICATED');
 if(!independentReview||independentReview.factCheckPassed!==true||
    !HASH.test(independentReview.receiptSha256??'')||
    !ownerStandingPolicyCurrent)
   return fail('CORRECTION_REVIEW_OR_OWNER_POLICY_MISSING');
 const record={
   schema:'jr.jrei.news-correction-proposal.v1',
   correctedSourceId:earlierReceipt.sourceId,
   oldCmsReceiptDigest:earlierReceipt.originalCmsReceiptSha256,
   oldPublishedDigest:earlierReceipt.publishedDigestSha256,
   correctionSourceDigest:amendment.newSourceSha256,
   authoritativeCorrectionDigest:amendment.officialCorrectionReceiptSha256,
   reviewerReceiptDigest:independentReview.receiptSha256,
   correctionDateUtc:amendment.correctedAtUtc,
   status:'CORRECTION_AND_SOURCE_REINDEX_REVIEW_REQUIRED',
   originalArticlePreservedForAudit:true,publicationTriggered:false,
   priorUserNotificationsRevised:false,
   newsMemoryMustInvalidateStaleClaims:true
 };
 return Object.freeze({...record,admissible:true,correctionDigestSha256:digest(record)});
}
