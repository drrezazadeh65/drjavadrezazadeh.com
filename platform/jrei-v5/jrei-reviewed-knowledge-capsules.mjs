/**
 * JREI governed educational evidence capsules.
 * Sources must be independently rights/review cleared. A source URL, search
 * result or language-model quotation never grants commercial reuse.
 * Pure proposal logic; storage, publication and network access remain absent.
 */
import {createHash} from 'node:crypto';
export const JREI_EVIDENCE_VERSION='jr.jrei.reviewed-knowledge-capsule.v1';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9._:-]{2,99}$/i;
const TYPE=new Set(['OFFICIAL_EXAM_NOTICE','UNIVERSITY_RESEARCH','EDUCATIONAL_RESEARCH',
 'OWNER_ORIGINAL','LICENSED_PUBLIC_REFERENCE','OFFICIAL_EXAM_CORRECTION']);
const RIGHTS=new Set(['METADATA_ONLY','LICENSED_PRIVATE_ANALYSIS','LICENSED_PUBLIC_EXCERPT',
 'LICENSED_COMMERCIAL_REUSE','OWNER_ORIGINAL']);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=reason=>Object.freeze({admissible:false,reason,publicationAuthorized:false});
const validTime=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s));
function canonical(url){
 if(typeof url!=='string'||url.length>600)return null;
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||
     u.hash||!u.hostname.includes('.'))return null;
  return u.href;
 }catch{return null;}
}
export function proposeReviewedKnowledgeCapsule({source,rights,review,anchor,
 validFromUtc,validUntilUtc=null,version=1}={}){
 if(!source||!ID.test(source.id??'')||!TYPE.has(source.type)||
    !SHA.test(source.contentSha256??'')||
    !SHA.test(source.extractionSha256??'')||
    !SHA.test(source.originalDocumentSha256??'')||
    !canonical(source.url)||!validTime(source.publishedAtUtc)||
    !Number.isSafeInteger(version)||version<1||version>100000)
   return fail('SOURCE_OR_VERSION_INVALID');
 if(!rights||!RIGHTS.has(rights.scope)||!SHA.test(rights.evidenceSha256??'')||
    rights.currentlyValid!==true)
   return fail('RIGHTS_UNVERIFIED');
 if(!review||!ID.test(review.reviewerId??'')||
    !SHA.test(review.reviewReceiptSha256??'')||
    review.independentHumanAccepted!==true||
    review.claimsChecked!==true||review.sourceIdentityChecked!==true||
    review.reviewerId===source.authorId)
   return fail('INDEPENDENT_SOURCE_REVIEW_MISSING');
 if(!anchor||!Number.isInteger(anchor.page)||anchor.page<1||
    anchor.page>100000||!ID.test(anchor.sectionId??''))
   return fail('PAGE_SECTION_ANCHOR_MISSING');
 if(!validTime(validFromUtc)||validUntilUtc!==null&&
    (!validTime(validUntilUtc)||Date.parse(validUntilUtc)<=Date.parse(validFromUtc)))
   return fail('TEMPORAL_PROVENANCE_INVALID');
 const record={
   schema:JREI_EVIDENCE_VERSION,sourceId:source.id,
   sourceType:source.type,sourceVersion:version,
   canonicalUrl:canonical(source.url),
   originalDigest:source.originalDocumentSha256,
   extractedDigest:source.extractionSha256,
   contentDigest:source.contentSha256,
   page:anchor.page,sectionId:anchor.sectionId,
   publishedAtUtc:new Date(source.publishedAtUtc).toISOString(),
   validFromUtc:new Date(validFromUtc).toISOString(),
   validUntilUtc:validUntilUtc?new Date(validUntilUtc).toISOString():null,
   rightsScope:rights.scope,rightsReceiptDigest:rights.evidenceSha256,
   sourceReviewReceiptDigest:review.reviewReceiptSha256,
   reviewerId:review.reviewerId,validationClass:'INDEPENDENTLY_REVIEWED_SOURCE_METADATA',
   status:'CANDIDATE_FOR_PRIVATE_INDEX',
   commercialItemTextReusePermitted:false, // separate expression/rights review
   studentConversationsStored:false,trainingPermissionEstablished:false,
   productionIndexUpdated:false,newsPublished:false
 };
 return Object.freeze({...record,admissible:true,capsuleDigestSha256:hash(record)});
}
/** Source revisions must never silently overwrite the earlier citation. */
export function assessKnowledgeRevision(previous,candidate,{authorityReceiptSha256,
 independentlyReviewed=false}={}){
 if(!previous||!candidate||
    previous.schema!==JREI_EVIDENCE_VERSION||
    candidate.schema!==JREI_EVIDENCE_VERSION||
    previous.sourceId!==candidate.sourceId||
    !SHA.test(previous.capsuleDigestSha256??'')||
    !SHA.test(candidate.capsuleDigestSha256??''))
   return fail('REVISION_PROVENANCE_MISSING');
 if(candidate.sourceVersion<=previous.sourceVersion)
   return fail('REVISION_NOT_MONOTONIC');
 if(!SHA.test(authorityReceiptSha256??'')||!independentlyReviewed)
   return fail('AMENDMENT_AUTHORITY_UNVERIFIED');
 return Object.freeze({
   admissible:true,status:'VERSIONED_REVIEWED_REPLACEMENT_CANDIDATE',
   supersededCapsuleDigest:previous.capsuleDigestSha256,
   candidateCapsuleDigest:candidate.capsuleDigestSha256,
   amendmentReceiptSha256:authorityReceiptSha256,
   citationsMustBeReevaluated:true,oldSourceNeverDeletedByThisModule:true,
   productionIndexUpdated:false,automaticPublication:false
 });
}
export function selectRelevantReviewedEvidence(capsules,{atUtc,needCommercialReuse=false}={}){
 if(!Array.isArray(capsules)||capsules.length>1000||!validTime(atUtc))
   return Object.freeze({status:'INVALID_EVIDENCE_SELECTION',matches:[]});
 const now=Date.parse(atUtc),seen=new Set();
 const matches=[];
 for(const c of capsules){
   if(!c||c.schema!==JREI_EVIDENCE_VERSION||!c.admissible||
      !SHA.test(c.capsuleDigestSha256??'')||
      c.status!=='CANDIDATE_FOR_PRIVATE_INDEX'||
      Date.parse(c.validFromUtc)>now||
      c.validUntilUtc!==null&&Date.parse(c.validUntilUtc)<=now||
      needCommercialReuse&&c.rightsScope!=='LICENSED_COMMERCIAL_REUSE'&&
        c.rightsScope!=='OWNER_ORIGINAL')continue;
   const id=c.sourceId+':'+c.sourceVersion;
   if(seen.has(id))continue;
   seen.add(id);
   matches.push({sourceId:c.sourceId,version:c.sourceVersion,
     evidenceDigest:c.capsuleDigestSha256,page:c.page,
     sectionId:c.sectionId,sourceUrl:c.canonicalUrl,
     independentlyReviewedSource:true});
 }
 return Object.freeze({status:'CANDIDATE_REFERENCES_ONLY',
   matches:Object.freeze(matches.slice(0,50)),
   textRetrieved:false,scientificAnswerValidated:false,
   modelGenerationAuthorized:false,publiclyIndexed:false});
}
