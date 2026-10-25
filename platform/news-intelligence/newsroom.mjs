/**
 * Newsroom coordinator for the EXISTING governed JREI acquisition/model
 * interfaces. Ports are injected by an owner-authenticated private backend.
 * This module creates no provider, crawler, SMTP or public chatbot.
 */
import {assert,isHash,isId,plain,utcInstant} from './contracts.mjs';
import {nextSourcePoll,dedupeNewsCandidates} from './source-intelligence.mjs';
import {prepareEditorialPreview} from './contracts.mjs';
import {editorialGenerationRequest} from './editorial-style.mjs';
import {imageDesignBrief} from './media.mjs';
import {suggestSemanticLinks} from './links.mjs';
import {approvalEmailDescriptor} from './approval.mjs';
import {preOwnerNewsQualityReview} from './content-quality.mjs';
import {planOfficialNewsHandoffs} from './official-publication-policy.mjs';
export function newsModuleCapabilities(){
  return Object.freeze({
    schema:'jr.jrei.news-module-capabilities.v1',
    acquisitionEngine:'EXISTING_JREI_APPROVED_SOURCE_ACQUISITION',
    inferenceEngine:'EXISTING_JREI_APPROVED_MODEL_ROUTER',
    sourceRegistry:'EXISTING_JREI_MOTHER_DB_SOURCE_AUTHORITY',
    accountIdentity:'EXISTING_CUSTOMER_ACCOUNTS',
    ownerMfa:'EXISTING_OPERATIONS_OWNER_MFA',
    notifications:'EXISTING_ECO_NOTIFICATION_OUTBOX',
    socialDistribution:'EXISTING_AWOSE_SOCIAL_ENGINE',
    publisher:'EXISTING_EDITORIAL_CMS_OR_APPROVED_PUBLISHER',
    aiAssistant:'EXISTING_JREI_ASSISTANT',
    publicActivationEnabled:false,noStandaloneDatabase:true,
    noParallelPublicChatbot:true});
}
export function planNewsDiscovery({sources,nowUtc,lastChecks={},hostBackoffs={},
  suspendedSources=[]}={}){
  assert(Array.isArray(sources)&&sources.length<=2000&&utcInstant(nowUtc)&&
    plain(lastChecks)&&plain(hostBackoffs)&&
    Array.isArray(suspendedSources),'NEWS_DISCOVERY_PLAN_INVALID');
  const tasks=[],skipped=[];
  for(const source of sources){
    const last=lastChecks[source.sourceId]??null;
    const backoff=hostBackoffs[source.sourceId]??null;
    const result=nextSourcePoll({source,lastCheckedAt:last,nowUtc,
      priority:source.urgentMonitoring?'P0':'P2',
      hostBackoffUntil:backoff,
      sourceSuspended:suspendedSources.includes(source.sourceId)});
    const entry={sourceId:source.sourceId,at:nowUtc,reason:result.reason};
    if(result.eligible)tasks.push({...entry,task:'GOVERNED_SOURCE_CHANGE_REVIEW'});
    else skipped.push(entry);
  }
  return Object.freeze({schema:'jr.jrei.news-discovery-plan.v1',
    tasks,skipped,
    requiresApprovedSourcePolicy:true,
    requiresExistingJreiPrivateScheduler:true,
    networkFetchesPerformed:0});
}
export function makeBilingualNewsReviewPackage({
  candidate,evidence,fa,en,media,relatedRoutes=[],format='NEWS_REPORT',
  corpusRecords=[],recipient,previewTokenReference,expiresAt,
  checkedAt,linksCheckedByServer=false
}={}){
  assert(plain(candidate)&&plain(evidence)&&
    evidence.schema==='jr.jrei.news-evidence-review.v1'&&
    evidence.candidateFingerprint===candidate.fingerprint&&
    evidence.evidenceSha256===candidate.evidenceSha256&&
    evidence.sourceRegistryRead===true&&
    evidence.evidenceReviewed===true&&
    evidence.issuerVerified===true&&
    evidence.sourceStillCurrent===true&&
    isId(evidence.reviewerId)&&utcInstant(evidence.reviewedAt)&&
    Number.isInteger(evidence.claimCount)&&evidence.claimCount>0,
    'NEWS_EDITORIAL_EVIDENCE_MISMATCH');
  const generation=editorialGenerationRequest({candidate,evidence,format,
    styleCorpusRecords:corpusRecords});
  const image=imageDesignBrief({
    kind:candidate.priority==='P0'?'BREAKING':'ANALYSIS',
    headlineFa:fa?.headline??'',headlineEn:en?.headline??''});
  assert(plain(media)&&media.rightsReviewed===true&&
    media.isDocumentaryPhoto!==undefined,
    'NEWS_EDITORIAL_MEDIA_NOT_REVIEWED');
  const links=[...suggestSemanticLinks({article:{language:'fa',
    topics:candidate.topics??[]},approvedRoutes:relatedRoutes,maxLinks:8}),
    ...suggestSemanticLinks({article:{language:'en',
    topics:candidate.topics??[]},approvedRoutes:relatedRoutes,maxLinks:8})];
  // Owner preview may only be assembled after an explicit server-time
  // quality review. Suggested links are not equivalent to checked links.
  // These values must originate in the authenticated private backend.
  const qualityReview=preOwnerNewsQualityReview({candidate,evidence,
    fa,en,media,internalLinks:links,linksCheckedByServer,checkedAt});
  assert(qualityReview.editorialReadyForOwnerPreview,
    'NEWS_EDITORIAL_QUALITY_BLOCKED:'+qualityReview.findings.join(','));
  const verification={
    sourceRegistryRead:true,evidenceReviewed:true,issuerVerified:true,
    sourceStillCurrent:true,evidenceSha256:candidate.evidenceSha256,
    reviewerId:evidence.reviewerId,reviewedAt:evidence.reviewedAt
  };
  const preview=prepareEditorialPreview({
    candidate,verification,fa,en,image:media,internalLinks:links});
  const email=approvalEmailDescriptor({
    preview,recipient,baseUrl:'https://drjavadrezazadeh.com',
    previewTokenReference,expiresAt});
  return Object.freeze({schema:'jr.jrei.news-review-package.v1',
    preview,qualityReview,generationContract:generation,imageTemplate:image,
    emailProposal:email,publicationApproved:false,
    publicUrl:null,noEmailSentYet:true,
    requiresAuthenticatedOwnerDecision:true});
}
export function consolidateNewsCandidateBatch(candidates){
  const result=dedupeNewsCandidates(candidates);
  return Object.freeze({schema:'jr.jrei.news-dedup-batch.v1',
    ...result,sourceAuthorityRequired:true,autoPublish:false});
}

/**
 * Official publication worklist from the existing JREI worker's independently
 * attested source, factual, QA and CMS checks. Only ambiguous sources and
 * claims enter owner's exception desk; incomplete infrastructure is a
 * system hold, not a fabricated owner action. No side effects here.
 */
export function planNewsroomOfficialHandoffs({items=[],originalPrivateContext}={}){
  assert(plain(originalPrivateContext)&&
    originalPrivateContext.source==='EXISTING_JREI_PRIVATE_NEWS_WORKER'&&
    originalPrivateContext.originalServerSessionVerified===true&&
    originalPrivateContext.newsPipelineEnabled===true,
    'NEWS_ORIGINAL_PRIVATE_HANDOFF_CONTEXT_REQUIRED');
  return planOfficialNewsHandoffs({items});
}
