/**
 * Planned newspaper polling inside EXISTING JREI operations Cron.
 * 300 GiB is an allowance, not a transfer target. Rights/robots, quota,
 * source cadence and host backoff remain stricter. NO timer or network.
 */
import {assert,plain,utcInstant} from './contracts.mjs';
const ALLOWANCE_BYTES=300*1024*1024*1024;
function iranClockParts(atUtc){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',
    hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date(atUtc));
  const p=Object.fromEntries(parts.map(item=>[item.type,item.value]));
  return {day:p.year+'-'+p.month+'-'+p.day,
    minutes:Number(p.hour)*60+Number(p.minute)};
}
export function planIranNightNewsWindow({atUtc,originalJreiBudget,
  sourcePolicy,workClass='REGULAR_NEWS_DISCOVERY'}={}){
  assert(utcInstant(atUtc)&&plain(originalJreiBudget)&&
    originalJreiBudget.source==='ORIGINAL_JREI_QUOTA_CONTROLLER'&&
    Number.isSafeInteger(originalJreiBudget.bytesRemainingToday)&&
    originalJreiBudget.bytesRemainingToday>=0&&
    Number.isSafeInteger(originalJreiBudget.bytesReservedToday)&&
    originalJreiBudget.bytesReservedToday>=0&&
    plain(sourcePolicy)&&
    sourcePolicy.source==='ORIGINAL_JREI_APPROVED_SOURCE_REGISTRY'&&
    sourcePolicy.acquisitionAuthorized===true&&
    sourcePolicy.robotsAndTermsCurrent===true&&
    Number.isSafeInteger(sourcePolicy.maxObjectBytes)&&
    sourcePolicy.maxObjectBytes>=1&&sourcePolicy.maxObjectBytes<=2097152&&
    ['REGULAR_NEWS_DISCOVERY','URGENT_NEWS_RECHECK'].includes(workClass),
    'NEWS_NIGHT_SCHEDULER_POLICY_UNVERIFIED');
  const clock=iranClockParts(atUtc);
  const nighttime=clock.minutes>=120&&clock.minutes<300;
  const urgent=workClass==='URGENT_NEWS_RECHECK';
  const allowedTime=nighttime||(urgent&&
    sourcePolicy.urgentOutsideNightApproved===true);
  const budgetAvailable=Math.min(
    ALLOWANCE_BYTES-originalJreiBudget.bytesReservedToday,
    originalJreiBudget.bytesRemainingToday
  );
  const safeBudget=Math.max(0,budgetAvailable);
  const permitted=allowedTime&&safeBudget>=sourcePolicy.maxObjectBytes&&
    sourcePolicy.sourceSuspended!==true&&
    sourcePolicy.hostBackoffActive!==true;
  return Object.freeze({schema:'jr.jrei.news-night-window-plan.v1',
    atUtc,iranDay:clock.day,
    nightWindowIran:'02:00-05:00',
    urgentRechecksOutsideNightRequireSeparateOriginalJreiAuthorization:true,
    insideNightWindow:nighttime,workClass,
    eligibleToRequestOriginalJreiLease:permitted,
    byteCeiling:Math.min(safeBudget,sourcePolicy.maxObjectBytes),
    reason:!allowedTime?'OUTSIDE_REGULAR_WINDOW':
      safeBudget<sourcePolicy.maxObjectBytes?'NOT_ENOUGH_RESERVED_TRANSFER':
      sourcePolicy.sourceSuspended===true?'SOURCE_SUSPENDED':
      sourcePolicy.hostBackoffActive===true?'HOST_BACKOFF':
      'ELIGIBLE_FOR_ORIGINAL_JREI_QUOTA_AND_HOST_LEASE',
    requestedDownloads:0,actualBytesTransferred:0,
    originalJreiQuotaMustReserveBeforeDownload:true,
    automatedNightWorkActive:false,noNewCronCreated:true});
}
export function proposedOriginalCronJobs(){
  return Object.freeze([
    {name:'jrei_news_official_source_radar',
      integration:'EXISTING_OPERATIONS_CRON_REGISTRY',
      minimumCadenceSeconds:300,defaultCadenceSeconds:300,
      access:'PRIVATE_OWNER_AUTHORIZED',status:'NOT_REGISTERED',
      work:'ONLY_APPROVED_SOURCE_METADATA_OR_CHANGE_RECHECK'},
    {name:'jrei_news_night_acquisition',
      integration:'EXISTING_JREI_KA_SOURCE_SCHEDULER',
      minimumCadenceSeconds:3600,defaultCadenceSeconds:3600,
      access:'PRIVATE_APPROVED_SOURCES',status:'NOT_REGISTERED',
      work:'ONLY_IRAN_02_TO_05_AND_ORIGINAL_GLOBAL_QUOTA'},
    {name:'jrei_news_consent_reminders',
      integration:'EXISTING_ECO_NOTIFICATION_OUTBOX',
      minimumCadenceSeconds:300,defaultCadenceSeconds:300,
      access:'PRIVATE_VERIFIED_ACCOUNT_PURPOSE',status:'NOT_REGISTERED',
      work:'CURRENT_APPROVED_DEADLINES_AND_CONSENT'},
    {name:'jrei_news_daily_digest',
      integration:'EXISTING_NEWSLETTER_WORKER',
      minimumCadenceSeconds:3600,defaultCadenceSeconds:86400,
      access:'PRIVATE_VERIFIED_ACCOUNT_PURPOSE',status:'NOT_REGISTERED',
      work:'ONLY_PUBLISHED_VERIFIED_PUBLIC_ARTICLES'}
  ]);
}
