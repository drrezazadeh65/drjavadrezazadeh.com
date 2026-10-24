/**
 * JREI News acquisition worker — backend-only orchestrator.
 * Requires source-owned review plus EXISTING JREI scheduler, source registry,
 * private HTTPS transport and mother database; no standalone crawler.
 *
 * Do not register this as a Cron or invoke from a public route before the
 * single owner-authorized final acceptance. No work happens upon import.
 */
import {assert,isHash,isId,normalizeNewsSource,plain,sha256,utcInstant} from './contracts.mjs';
import {nextSourcePoll} from './source-intelligence.mjs';
const MAX_PER_BATCH=20;
export async function queueDueNewsAcquisitions({
  nowUtc,approvedSources,observationsBySource={},
  privateScheduler,serverControls}={}){
  assert(utcInstant(nowUtc)&&Array.isArray(approvedSources)&&
    approvedSources.length<=2000&&plain(observationsBySource)&&
    plain(privateScheduler)&&
    typeof privateScheduler.queueExistingJreiSourceJob==='function'&&
    plain(serverControls)&&
    serverControls.authority==='EXISTING_PRIVATE_JREI_CONFIGURATION'&&
    serverControls.finalIntegratedAcceptanceVerified===true&&
    serverControls.ownerAcquisitionAuthorized===true&&
    serverControls.newsAcquisitionEnabled===true&&
    serverControls.privateSourceStorageApproved===true&&
    Number.isInteger(serverControls.maxDailyBytes)&&
    serverControls.maxDailyBytes>0,
    'NEWS_ACQUISITION_WORKER_DISABLED');
  const now=Date.parse(nowUtc),eligible=[],blocked=[];
  for(const raw of approvedSources){
    let source;
    try{source=normalizeNewsSource(raw);}catch{
      blocked.push({sourceId:raw?.sourceId??null,
        reason:'INDEPENDENT_SOURCE_APPROVAL_MISSING'});
      continue;
    }
    const observation=observationsBySource[source.sourceId]??{};
    const decision=nextSourcePoll({source,nowUtc,
      lastCheckedAt:observation.lastCheckedAt??null,
      priority:source.urgentMonitoring===true?'P0':'P2',
      hostBackoffUntil:observation.hostBackoffUntil??null,
      sourceSuspended:observation.sourceSuspended===true});
    if(!decision.eligible){blocked.push({
      sourceId:source.sourceId,reason:decision.reason});continue;}
    eligible.push({source,decision});
  }
  eligible.sort((a,b)=>Number(b.source.urgentMonitoring===true)-
    Number(a.source.urgentMonitoring===true)||a.source.sourceId.localeCompare(b.source.sourceId));
  // These signals must originate from the EXISTING private scheduler,
  // never from a browser or an untrusted source observation. Protect
  // public browsing and commerce before scheduling lower-priority crawling.
  const latencyBudget=serverControls.maxPublicP95LatencyMs;
  const observedLatency=serverControls.publicP95LatencyMs;
  const highLatency=Number.isFinite(latencyBudget)&&latencyBudget>0&&
    Number.isFinite(observedLatency)&&observedLatency>latencyBudget;
  if(serverControls.publicSiteUnderPressure===true||highLatency){
    blocked.push(...eligible.map(item=>({
      sourceId:item.source.sourceId,
      reason:'PUBLIC_SITE_RESOURCE_PRIORITY'
    })));
    return Object.freeze({
      schema:'jr.jrei.news-acquisition-schedule.v1',
      requestedAt:nowUtc,queueRequests:0,accepted:[],blocked,
      actualSourceDownloadsConfirmed:0,
      requiresOriginalJreiSignedWorker:true,noAutomaticPublication:true
    });
  }
  // Explicit zero is a private safety pause, not an instruction to queue
  // one task. Zero or a busy public site always defers discretionary work.
  const maxQueued=Number.isInteger(serverControls.maxNewsQueuesPerDispatch)?
    Math.max(0,Math.min(MAX_PER_BATCH,serverControls.maxNewsQueuesPerDispatch)):
    MAX_PER_BATCH;
  if(maxQueued===0){
    blocked.push(...eligible.map(item=>({
      sourceId:item.source.sourceId,
      reason:'ORIGINAL_OWNER_QUEUE_CONCURRENCY_PAUSED'
    })));
    return Object.freeze({
      schema:'jr.jrei.news-acquisition-schedule.v1',
      requestedAt:nowUtc,queueRequests:0,accepted:[],blocked,
      actualSourceDownloadsConfirmed:0,
      requiresOriginalJreiSignedWorker:true,noAutomaticPublication:true
    });
  }
  const perObjectCap=Math.min(serverControls.maxPerObjectBytes??1048576,2097152);
  assert(Number.isInteger(perObjectCap)&&perObjectCap>=1,
    'NEWS_ACQUISITION_BOUND_INVALID');
  // Use an authoritative remaining-budget snapshot when the original
  // scheduler supplies one. In its absence, bound this single batch by
  // the configured ceiling; do not claim to know actual daily usage.
  const budgetSnapshot=serverControls.remainingDailyBytes;
  assert(budgetSnapshot===undefined||
    (Number.isSafeInteger(budgetSnapshot)&&budgetSnapshot>=0&&
      budgetSnapshot<=serverControls.maxDailyBytes),
    'NEWS_ACQUISITION_BUDGET_INVALID');
  let remainingBytes=budgetSnapshot??serverControls.maxDailyBytes;
  const accepted=[],seenHosts=new Set();
  for(const item of eligible){
    if(accepted.length>=maxQueued)break;
    if(remainingBytes<1){
      blocked.push({sourceId:item.source.sourceId,
        reason:'ORIGINAL_DAILY_BYTE_BUDGET_EXHAUSTED'});
      break;
    }
    const host=new URL(item.source.canonicalUrl).hostname;
    if(seenHosts.has(host))continue;
    seenHosts.add(host);
    // Reserves budget/lease in ORIGINAL JREI dispatcher transaction.
    const job={schema:'jr.jrei.news-acquisition-job.v1',
      sourceId:item.source.sourceId,
      sourcePolicyRevision:item.source.policyRevision,
      url:item.source.canonicalUrl,
      requestReason:item.source.urgentMonitoring===true?
        'URGENT_NEWS_CHANGE_RECHECK':'REGULAR_NEWS_SOURCE_RECHECK',
      priority:item.source.urgentMonitoring===true?'P0':'P2',
      requestedAt:nowUtc,
      requireRobots:true,requireTerms:true,requireCurrentRights:true,
      requireDNSPinning:true,allowRedirectBypass:false,
      byteReservationCap:Math.min(perObjectCap,remainingBytes),
      idempotencyKey:sha256([item.source.sourceId,
        nowUtc.slice(0,16),item.source.canonicalUrl].join('|')),
      resultClass:'PRIVATE_NEWS_SOURCE_OBSERVATION',
      neverPubliclyPublishRawContent:true};
    assert(Number.isInteger(job.byteReservationCap)&&
      job.byteReservationCap>=1&&job.byteReservationCap<=2097152,
      'NEWS_ACQUISITION_BOUND_INVALID');
    const receipt=await privateScheduler.queueExistingJreiSourceJob(job);
    // Reserve the attempted bytes conservatively, even if the receipt is
    // ambiguous: never oversubscribe the per-dispatch budget on retries.
    remainingBytes-=job.byteReservationCap;
    accepted.push({sourceId:item.source.sourceId,
      status:receipt?.status==='QUEUED'?'QUEUED':'NOT_CONFIRMED',
      jobReference:receipt?.jobReference??null});
    // A missing/negative scheduler acknowledgement is an operational
    // backpressure signal, not permission to keep flooding the mother DB.
    if(receipt?.status!=='QUEUED')break;
  }
  return Object.freeze({schema:'jr.jrei.news-acquisition-schedule.v1',
    requestedAt:nowUtc,queueRequests:accepted.length,
    accepted,blocked,actualSourceDownloadsConfirmed:0,
    requiresOriginalJreiSignedWorker:true,
    noAutomaticPublication:true});
}
/** A reviewable extraction result; source observation is NOT trusted news. */
export function incomingOfficialNewsObservation({
  originalJreiReceipt,source,extractedMetadata,observedAt
}={}){
  const s=normalizeNewsSource(source);
  assert(plain(originalJreiReceipt)&&
    originalJreiReceipt.sourceId===s.sourceId&&
    originalJreiReceipt.privateContentVerified===true&&
    originalJreiReceipt.publisherTermsAccepted===true&&
    originalJreiReceipt.robotsAccepted===true&&
    isHash(originalJreiReceipt.contentSha256)&&
    plain(extractedMetadata)&&
    extractedMetadata.evidenceSha256===originalJreiReceipt.contentSha256&&
    utcInstant(observedAt),
    'NEWS_OBSERVATION_NOT_JREI_VERIFIED');
  return Object.freeze({schema:'jr.jrei.news-observation-proposal.v1',
    sourceId:s.sourceId,sourceUrl:s.canonicalUrl,
    evidenceSha256:originalJreiReceipt.contentSha256,
    extractedMetadata,observedAt,
    officialIssuerIndependentReviewNeeded:true,
    editorialPublicationRequiresOwnerApproval:true,
    verifiedNews:false,publiclyVisible:false});
}
