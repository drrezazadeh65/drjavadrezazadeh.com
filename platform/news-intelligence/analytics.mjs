/** Evidence-only newsroom performance reporting, with missing metrics explicit. */
import {assert,plain,utcInstant} from './contracts.mjs';
const METRICS=Object.freeze(['discovered','verified','duplicates',
  'ownerApproved','published','failedDeliveries','newsletterQueued',
  'remindersQueued','acquisitionBytes','sourceErrors','reviewCorrections']);
export function newsroomMetrics({observations,periodStart,periodEnd}={}){
  assert(Array.isArray(observations)&&observations.length<=100000&&
    utcInstant(periodStart)&&utcInstant(periodEnd)&&
    Date.parse(periodEnd)>Date.parse(periodStart),
    'NEWS_METRICS_INPUT_INVALID');
  const totals=Object.fromEntries(METRICS.map(k=>[k,0]));
  const counts=Object.fromEntries(METRICS.map(k=>[k,0]));
  for(const entry of observations){
    assert(plain(entry)&&utcInstant(entry.at)&&
      METRICS.includes(entry.metric)&&
      typeof entry.value==='number'&&
      Number.isFinite(entry.value)&&entry.value>=0,
      'NEWS_METRIC_UNVERIFIED_OBSERVATION');
    if(Date.parse(entry.at)<Date.parse(periodStart)||
       Date.parse(entry.at)>=Date.parse(periodEnd))continue;
    totals[entry.metric]+=entry.value;
    counts[entry.metric]++;
  }
  return Object.freeze({schema:'jr.jrei.news-operations-metrics.v1',
    periodStart,periodEnd,totals,observationCounts:counts,
    metricsWithoutObservations:METRICS.filter(k=>counts[k]===0),
    measuredPerformanceOnly:true,noFabricatedTraffic:true,
    noClaimOfVerifiedGoogleSearchConsoleAccess:true});
}
export function analyticsAttributionDescriptor({publicArticleUrl,source,
  campaign,medium='referral',consentStatus='UNKNOWN'}={}){
  assert(typeof publicArticleUrl==='string'&&publicArticleUrl.startsWith(
    'https://drjavadrezazadeh.com/')&&
    typeof source==='string'&&/^[a-z0-9_-]{2,40}$/.test(source)&&
    typeof campaign==='string'&&/^[a-z0-9_-]{2,60}$/.test(campaign)&&
    /^[a-z0-9_-]{2,40}$/.test(medium)&&
    ['UNKNOWN','GRANTED','DENIED'].includes(consentStatus),
    'NEWS_ATTRIBUTION_INVALID');
  return Object.freeze({destination:publicArticleUrl,
    parameters:{utm_source:source,utm_medium:medium,utm_campaign:campaign},
    collectUserIdentifiers:false,
    personalizedAnalyticsAllowed:consentStatus==='GRANTED',
    reportActualConversionsOnly:true});
}
