/**
 * A single JREI knowledge boundary for ORIGINAL official JREI News.
 *
 * Newspaper articles are sources of attributable, time-bound facts, NOT
 * unconditional lifelong truth or raw Qwen training examples. Everything
 * stays in the original source/QA/CMS authority.
 */
import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{64}$/;
const safe=(x,max=240)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&
  !/[\x00-\x1f]/.test(x);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const reject=reason=>Object.freeze({admissible:false,reason});
export function proposeJreiNewsKnowledge({source,review,cms,publicUrl,language}={}){
 if(!['fa','en'].includes(language)||!safe(publicUrl,500))
  return reject('NEWS_CONTEXT_INVALID');
 let u;
 try{u=new URL(publicUrl);}catch{return reject('NEWS_PUBLIC_URL_INVALID');}
 if(u.protocol!=='https:'||u.hostname!=='drjavadrezazadeh.com'||
    u.username||u.password||u.port||u.search||u.hash||
    !(language==='fa'?/^\/fa\/akhbar\/[a-z0-9-]+\/$/:/^\/en\/news-insights\/[a-z0-9-]+\/$/).test(u.pathname))
  return reject('NEWS_PUBLIC_URL_NOT_CANONICAL');
 if(!SHA.test(source?.originalDigest??'')||!SHA.test(source?.rightsEvidenceDigest??'')||
   source?.publisherStatus!=='CURRENT_VERIFIED'||
   source?.licensedForArticleUse!==true||
   !safe(source?.issuerName,120)||!safe(source?.publishedDate,40))
  return reject('PRIMARY_SOURCE_OR_RIGHTS_UNVERIFIED');
 if(review?.currentFactsIndependentlyVerified!==true||
    review?.claimsCitationReviewed!==true||
    review?.contradictionPending===true||
    !SHA.test(review?.verifiedEvidenceDigest??''))
  return reject('NEWS_INDEPENDENT_EVIDENCE_MISSING');
 if(cms?.originalCmsPublicationVerified!==true||
    !SHA.test(cms?.publishedContentDigest??'')||
    !SHA.test(cms?.originalReceiptDigest??'')||
    !safe(cms?.publishedAtUtc,40))
  return reject('NO_GENUINE_ORIGINAL_CMS_PUBLICATION');
 const capsule={
  schema:'jr.jrei.news-source-knowledge-proposal.v1',
  provider:'JREI_ORIGINAL_NEWS',language,
  originalSourceDigest:source.originalDigest,
  rightsEvidenceDigest:source.rightsEvidenceDigest,
  independentFactsDigest:review.verifiedEvidenceDigest,
  cmsPublishedContentDigest:cms.publishedContentDigest,
  cmsReceiptDigest:cms.originalReceiptDigest,
  sourceIssuedAt:source.publishedDate,
  originalCmsPublishedAt:cms.publishedAtUtc,
  canonicalPublicUrl:u.href,
  retentionState:'TIME_SENSITIVE_REVERIFY_ON_USE',
  status:'PROPOSED_NOT_INDEXED',
  // Review of official source and article is not permission to export
  // user conversations or use authored content for model fine tuning.
  trainingApproved:false,
  userChatLogsCaptured:false,
  newsPublisherGranted:false,
  webPublicationTriggered:false,
  liveJreiRetrievalConnected:false
 };
 return Object.freeze({...capsule,admissible:true,capsuleDigestSha256:hash(capsule)});
}
