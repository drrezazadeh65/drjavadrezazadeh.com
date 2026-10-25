/**
 * JREI legal source acquisition planner. Budget = ceiling, not quota.
 * No downloads, network bypass, file writes or automatic rights changes.
 * Tehran nighttime window is 02:00–05:00 inclusive of 02:00, exclusive 05:00.
 */
export const JREI_NIGHT_ACQUISITION='jr.jrei.night-acquisition-budget.v1';
const MAX_BYTES=300_000_000_000;
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9_.:-]{2,99}$/i;
const deny=reason=>Object.freeze({allowed:false,reason,started:false});
function tehranClock(value){
 try{
  const day=new Date(value);
  if(!Number.isFinite(day.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',
    hour:'2-digit',hourCycle:'h23'}).formatToParts(day);
  return Number(parts.find(x=>x.type==='hour')?.value);
 }catch{return null;}
}
export function planJreiAcquisitionBatch({nowUtc,sourceProposals=[],
 alreadyUsedBytes=0,remainingProviderBytes=MAX_BYTES,ownerPolicy,
 nodeStatus,desiredMode='NIGHT_WINDOW'}={}){
 const hour=tehranClock(nowUtc);
 if(hour===null||!['NIGHT_WINDOW','ALWAYS_ON_OPT_IN'].includes(desiredMode)||
    !Number.isSafeInteger(alreadyUsedBytes)||alreadyUsedBytes<0||
    !Number.isSafeInteger(remainingProviderBytes)||remainingProviderBytes<0||
    !Array.isArray(sourceProposals)||sourceProposals.length>500)
   return deny('ACQUISITION_CONTEXT_INVALID');
 if(ownerPolicy?.reviewedSourceCollectionApproved!==true||
    ownerPolicy?.respectRobotsAndRates!==true||
    ownerPolicy?.recordOriginalEvidence!==true)
   return deny('LEGAL_SOURCE_POLICY_NOT_APPROVED');
 if(desiredMode==='ALWAYS_ON_OPT_IN'&&
    ownerPolicy?.twentyFourSevenApproved!==true)
   return deny('ALWAYS_ON_REQUIRES_SEPARATE_APPROVAL');
 if(desiredMode==='NIGHT_WINDOW'&&(hour<2||hour>=5))
   return deny('OUTSIDE_TEHRAN_NIGHT_WINDOW');
 if(nodeStatus?.authorized!==true||
    nodeStatus?.freshSignedHeartbeat!==true||
    nodeStatus?.resourcePressureOk!==true)
   return deny('NO_VERIFIED_PROCESSING_NODE');
 const cap=Math.max(0,Math.min(MAX_BYTES-alreadyUsedBytes,
   remainingProviderBytes,
   Number.isSafeInteger(ownerPolicy.maxBytesPerBatch)?
     ownerPolicy.maxBytesPerBatch:50_000_000));
 if(cap===0)return deny('BANDWIDTH_CEILING_REACHED');
 let remaining=cap;
 const approved=[];
 for(const src of sourceProposals){
  if(!src||!ID.test(src.sourceId??'')||
     src.rightsForThisAcquisition!==true||
     src.robotsAllowedForThisUrl!==true||
     src.currentPublicAccessVerified!==true||
     !SHA.test(src.rightsEvidenceSha256??'')||
     !SHA.test(src.documentExpectedSha256??'')||
     !Number.isSafeInteger(src.expectedBytes)||
     src.expectedBytes<1||src.expectedBytes>40_000_000||
     src.expectedBytes>remaining)continue;
  let u;
  try{u=new URL(src.url);}catch{continue;}
  if(u.protocol!=='https:'||u.username||u.password||u.port||
     u.hash||!u.hostname.includes('.'))continue;
  approved.push({sourceId:src.sourceId,canonicalUrl:u.href,
    expectedDigestSha256:src.documentExpectedSha256,
    rightsEvidenceDigest:src.rightsEvidenceSha256,
    reservedBytes:src.expectedBytes,
    acquisitionPermit:'SINGLE_SOURCE_REVIEW_REQUIRED'});
  remaining-=src.expectedBytes;
  if(approved.length>=30)break;
 }
 return Object.freeze({
   allowed:approved.length>0,status:approved.length?
     'PRIVATE_ACQUISITION_CANDIDATES':'NO_CURRENTLY_PERMITTED_SOURCE',
   schema:JREI_NIGHT_ACQUISITION,mode:desiredMode,
   tehranLocalHour:hour,
   globalAllowanceCeilingBytes:MAX_BYTES,
   selectedBytes:cap-remaining,
   actualTransferredBytes:0,
   sourcePlans:approved,
   transportMustRevalidateDnsTlsRightsRobots:true,
   retriesMustRespectRateLimit:true,
   sourceDownloaded:false,started:false,
   privateDocumentsIndexed:false,scientificReviewAccepted:false
 });
}
