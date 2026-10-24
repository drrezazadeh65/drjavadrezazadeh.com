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
    // The ORIGINAL JREI monitor supplies requestedNewsPriority. The
    // generic source adapter's optional urgentMonitoring flag is secondary.
    // Even P0 is bounded by the real approved source poll interval.
    const priority=source.requestedNewsPriority==='P0'||
      source.urgentMonitoring===true?'P0':
      source.requestedNewsPriority==='P1'?'P1':'P2';
    const decision=nextSourcePoll({source,nowUtc,
      lastCheckedAt:observation.lastCheckedAt??null,
      priority,
      hostBackoffUntil:observation.hostBackoffUntil??null,
      sourceSuspended:observation.sourceSuspended===true});
    if(!decision.eligible){blocked.push({
      sourceId:source.sourceId,reason:decision.reason});continue;}
    eligible.push({source,decision,priority});
  }
  const priorityRank={P0:0,P1:1,P2:2};
  eligible.sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]||
    a.source.sourceId.localeCompare(b.source.sourceId));
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
    // Never ask the ORIGINAL JREI scheduler to use a source without the
    // independently reviewed policy revision. The source-registry adapter
    // uses originalJreiPolicyRevision, not the older generic field name.
    const policyRevision=item.source.originalJreiPolicyRevision??
      item.source.policyRevision;
    if(!Number.isSafeInteger(policyRevision)||policyRevision<1){
      blocked.push({sourceId:item.source.sourceId,
        reason:'ORIGINAL_JREI_SOURCE_POLICY_REVISION_REQUIRED'});
      continue;
    }
    const host=new URL(item.source.canonicalUrl).hostname;
    if(seenHosts.has(host)){
      blocked.push({sourceId:item.source.sourceId,
        reason:'HOST_ALREADY_QUEUED_THIS_BATCH'});
      continue;
    }
    seenHosts.add(host);
    // Reserves budget/lease in ORIGINAL JREI dispatcher transaction.
    const job={schema:'jr.jrei.news-acquisition-job.v1',
      sourceId:item.source.sourceId,
      sourcePolicyRevision:policyRevision,
      url:item.source.canonicalUrl,
      requestReason:item.priority==='P0'?
        'URGENT_NEWS_CHANGE_RECHECK':'REGULAR_NEWS_SOURCE_RECHECK',
      priority:item.priority,
      requestedAt:nowUtc,
      requireRobots:true,requireTerms:true,requireCurrentRights:true,
      requireDNSPinning:true,allowRedirectBypass:false,
      byteReservationCap:Math.min(perObjectCap,remainingBytes),
      // Stable over the approved source's real polling interval, not
      // just a one-minute dispatch tick. A lost scheduler response must
      // not cause another uncontrolled download on the next Cron tick.
      idempotencyKey:sha256([item.source.sourceId,
        String(policyRevision),
        String(Math.floor(now/
          (item.decision.minimumIntervalMinutes*60000))),
        item.source.canonicalUrl].join('|')),
      resultClass:'PRIVATE_NEWS_SOURCE_OBSERVATION',
      neverPubliclyPublishRawContent:true};
    assert(Number.isInteger(job.byteReservationCap)&&
      job.byteReservationCap>=1&&job.byteReservationCap<=2097152,
      'NEWS_ACQUISITION_BOUND_INVALID');
    // An exception after dispatch is an UNKNOWN side effect, not proof
    // that the original JREI scheduler rolled back its reservation. Record
    // the same safe ambiguity as a missing receipt and stop this batch.
    let receipt=null;
    try{
      receipt=await privateScheduler.queueExistingJreiSourceJob(job);
    }catch{
      receipt=null;
    }
    // Reserve the attempted bytes conservatively, even if the receipt is
    // ambiguous: never oversubscribe the per-dispatch budget on retries.
    remainingBytes-=job.byteReservationCap;
    const confirmed=receipt?.status==='QUEUED'&&
      typeof receipt.jobReference==='string'&&
      receipt.jobReference.length>0;
    accepted.push({sourceId:item.source.sourceId,
      status:confirmed?'QUEUED':'NOT_CONFIRMED',
      jobReference:confirmed?receipt.jobReference:null,
      manualReviewRequired:!confirmed});
    // A missing/negative scheduler acknowledgement is an operational
    // backpressure signal, not permission to keep flooding the mother DB.
    if(!confirmed)break;
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
