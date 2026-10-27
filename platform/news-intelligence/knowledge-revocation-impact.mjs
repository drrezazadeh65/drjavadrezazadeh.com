/**
 * Original JREI News <- JREI educational knowledge source impact contract.
 *
 * Propose downstream correction/withdrawal holds after a primary source
 * changes, is revoked, or its review is withdrawn. This module does NOT
 * modify original CMS rows, re-route the website, send messages or relicense
 * articles. Only original CMS + its independent evidence/publisher gates
 * can execute the proposed update. No raw article/body text is accepted.
 */
import {assert,isHash,isId,plain,sha256,utcInstant} from './contracts.mjs';

const REASON=new Set([
  'SOURCE_WITHDRAWN','SOURCE_SUPERSEDED','SOURCE_RIGHTS_REVOKED',
  'SOURCE_CONTENT_REVISION','ISSUER_CORRECTION','CLAIM_INDEPENDENT_REVIEW_REVOKED'
]);

export function proposeNewsSourceInvalidation({
  sourceEvent,affectedKnowledge=[],publishedCapsules=[],observedAt
}={}){
  assert(plain(sourceEvent)&&
    sourceEvent.schema==='jr.jrei.knowledge-source-invalidation.v1'&&
    isId(sourceEvent.eventId)&&isId(sourceEvent.sourceId)&&
    isHash(sourceEvent.previousSourceDigest)&&
    REASON.has(sourceEvent.reasonCode)&&
    (sourceEvent.newSourceDigest===null||isHash(sourceEvent.newSourceDigest))&&
    sourceEvent.newSourceDigest!==sourceEvent.previousSourceDigest&&
    utcInstant(sourceEvent.observedAt)&&utcInstant(observedAt)&&
    Date.parse(sourceEvent.observedAt)<=Date.parse(observedAt)&&
    Array.isArray(affectedKnowledge)&&affectedKnowledge.length<=300&&
    Array.isArray(publishedCapsules)&&publishedCapsules.length<=300,
    'JREI_NEWS_KNOWLEDGE_INVALIDATION_EVENT_UNTRUSTED');
  const known=new Set();
  for(const item of affectedKnowledge){
    assert(plain(item)&&isId(item.claimId)&&
      isHash(item.citationManifestSha256)&&
      item.upstreamSourceId===sourceEvent.sourceId&&
      item.reviewState==='REQUIRES_REVIEW'&&!known.has(item.claimId),
      'JREI_NEWS_INVALIDATED_CLAIM_POINTER_UNTRUSTED');
    known.add(item.claimId);
  }
  const receipts=new Set(),impacted=[];
  for(const news of publishedCapsules){
    assert(plain(news)&&news.schema==='jr.jrei.news-source-knowledge-proposal.v1'&&
      news.provider==='JREI_ORIGINAL_NEWS'&&
      news.admissible===true&&
      isHash(news.originalSourceDigest)&&
      isHash(news.cmsReceiptDigest)&&
      isHash(news.cmsPublishedContentDigest)&&
      typeof news.canonicalPublicUrl==='string'&&
      ['fa','en'].includes(news.language)&&
      news.status==='PROPOSED_NOT_INDEXED'&&
      !receipts.has(news.cmsReceiptDigest),
      'JREI_NEWS_CAPSULE_INVALID_OR_DUPLICATED');
    receipts.add(news.cmsReceiptDigest);
    if(news.originalSourceDigest!==sourceEvent.previousSourceDigest)continue;
    const url=new URL(news.canonicalPublicUrl);
    const expected=news.language==='fa'
      ?/^\/fa\/akhbar\/[a-z0-9-]+\/$/
      :/^\/en\/news-insights\/[a-z0-9-]+\/$/;
    assert(url.protocol==='https:'&&url.hostname==='drjavadrezazadeh.com'&&
      !url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&
      expected.test(url.pathname),'JREI_NEWS_CANONICAL_CORRECTION_SCOPE_INVALID');
    impacted.push(Object.freeze({
      originalCmsReceiptDigest:news.cmsReceiptDigest,
      originalPublishedContentDigest:news.cmsPublishedContentDigest,
      canonicalPublicUrl:url.href,language:news.language,
      sourceDigestAtPublication:news.originalSourceDigest,
      decision:'HOLD_CONTEXT_AND_PROPOSE_ORIGINAL_CMS_CORRECTION',
      priorPublicRevisionMustBePreserved:true,
      invalidateAssistantCitationCandidate:true,
      originalPublisherCorrectionRequired:true,
      ownerMfaExceptionOnlyIfEvidenceDisputed:true,
      automaticArticleRewriteAllowed:false,
      originalCmsRevisionChanged:false
    }));
  }
  impacted.sort((a,b)=>a.canonicalPublicUrl.localeCompare(b.canonicalPublicUrl));
  const fingerprints=impacted.map(x=>x.originalCmsReceiptDigest);
  return Object.freeze({
    schema:'jr.jrei.news-knowledge-invalidation-impact.v1',
    sourceEventId:sourceEvent.eventId,reasonCode:sourceEvent.reasonCode,
    sourceId:sourceEvent.sourceId,
    previousSourceDigest:sourceEvent.previousSourceDigest,
    newSourceDigest:sourceEvent.newSourceDigest,
    observedAt,
    affectedKnowledgeClaimCount:known.size,
    publishedArticleImpactCount:impacted.length,
    impacted,
    impactDigestSha256:sha256(JSON.stringify({
      event:sourceEvent.eventId,original:sourceEvent.previousSourceDigest,
      receipts:fingerprints,claims:[...known].sort()
    })),
    mustRecheckOriginalMotherDbAndOriginalPublisher:true,
    sourceRightsGrantInferred:false,
    learningFactsPromoted:false,
    originalCmsRowsUpdated:false,
    noticesDispatched:false,
    publicArticlesModified:false,
    remediationStatus:'PROPOSAL_ONLY_NOT_APPLIED'
  });
}
