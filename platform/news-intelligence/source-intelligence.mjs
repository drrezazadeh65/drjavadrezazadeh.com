/**
 * Source discovery planner: no network operations, no crawler bypass.
 * Existing JREI governed retrieval adapter remains the only acquisition layer.
 */
import {assert,isHash,isId,normalizeNewsSource,publicHttps,sha256,utcInstant} from './contracts.mjs';
export function nextSourcePoll({source,lastCheckedAt=null,nowUtc,priority='P2',
  hostBackoffUntil=null,sourceSuspended=false}={}){
  const s=normalizeNewsSource(source);
  assert(utcInstant(nowUtc)&&['P0','P1','P2'].includes(priority)&&
    (lastCheckedAt===null||utcInstant(lastCheckedAt))&&
    (hostBackoffUntil===null||utcInstant(hostBackoffUntil)),
    'NEWS_POLL_METADATA_INVALID');
  if(sourceSuspended)return Object.freeze({eligible:false,reason:'SOURCE_SUSPENDED'});
  const now=Date.parse(nowUtc);
  if(hostBackoffUntil!==null&&now<Date.parse(hostBackoffUntil))
    return Object.freeze({eligible:false,reason:'HOST_BACKOFF',nextAt:hostBackoffUntil});
  const interval=Math.max(s.pollIntervalMinutes,priority==='P0'?5:priority==='P1'?15:60);
  const nextAt=lastCheckedAt===null?now:Date.parse(lastCheckedAt)+interval*60000;
  return Object.freeze({eligible:now>=nextAt,reason:now>=nextAt?'DUE':'NOT_DUE',
    nextAt:new Date(nextAt).toISOString(),minimumIntervalMinutes:interval,
    transport:'EXISTING_JREI_GOVERNED_ACQUISITION_ONLY'});
}
export function classifySourceChange({source,sourceUrl,currentHash,previousHash=null,
  observedAt}={}){
  const s=normalizeNewsSource(source),url=publicHttps(sourceUrl);
  assert(new URL(url).hostname===new URL(s.canonicalUrl).hostname&&
    isHash(currentHash)&&(previousHash===null||isHash(previousHash))&&
    utcInstant(observedAt),'NEWS_SOURCE_CHANGE_INVALID');
  return Object.freeze({schema:'jr.jrei.news-source-change.v1',
    sourceId:s.sourceId,sourceUrl:url,observedAt,
    contentHash:currentHash,previousHash,
    state:previousHash===null?'FIRST_SEEN':currentHash===previousHash?'UNCHANGED':'CHANGED',
    verified:false,published:false,requiresHumanEvidenceReview:true});
}
export function sourceFetchRequest({source,reason,nowUtc,deadlineUtc=null}={}){
  const s=normalizeNewsSource(source);
  assert(['POLL','CHANGE_RECHECK','URGENT_OFFICIAL_RECHECK'].includes(reason)&&
    utcInstant(nowUtc)&&(deadlineUtc===null||utcInstant(deadlineUtc)),
    'NEWS_FETCH_REQUEST_INVALID');
  return Object.freeze({schema:'jr.jrei.news-fetch-request.v1',
    sourceId:s.sourceId,url:s.canonicalUrl,reason,requestedAt:nowUtc,
    deadlineUtc,robotsRequired:true,termsRequired:true,
    dnsPinningRequired:true,rateLimitRequired:true,
    maxBytes:reason==='URGENT_OFFICIAL_RECHECK'?2097152:1048576,
    noLoginBypass:true,publicPublicationAuthorized:false});
}
export function dedupeNewsCandidates(candidates){
  assert(Array.isArray(candidates)&&candidates.length<=1000,
    'NEWS_DEDUP_BATCH_INVALID');
  const seen=new Set(),unique=[],duplicates=[];
  for(const c of candidates){
    assert(c&&c.schema==='jr.jrei.news-candidate.v1'&&isHash(c.fingerprint),
      'NEWS_DEDUP_ITEM_INVALID');
    if(seen.has(c.fingerprint))duplicates.push(c.fingerprint);
    else{seen.add(c.fingerprint);unique.push(c);}
  }
  return Object.freeze({unique,duplicates,uniqueCount:unique.length,
    duplicateCount:duplicates.length});
}
export function sourceRegistryFingerprint(sources){
  assert(Array.isArray(sources)&&sources.length<=2000,'NEWS_SOURCE_REGISTRY_INVALID');
  const rows=sources.map(s=>normalizeNewsSource(s));
  assert(new Set(rows.map(s=>s.sourceId)).size===rows.length,'NEWS_SOURCE_DUPLICATE_ID');
  return sha256(JSON.stringify(rows.slice().sort((a,b)=>a.sourceId.localeCompare(b.sourceId))));
}
