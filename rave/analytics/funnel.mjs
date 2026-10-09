import {validateEvent} from './events.mjs';
export function funnel(events,{trustedServer=false}={}) {
 const seen=new Set(); const counts={article_view:0,service_view:0,service_cta_click:0,checkout_started:0,payment_verified:0};
 for(const e of events){validateEvent(e,{trustedServer});if(seen.has(e.event_id))continue;seen.add(e.event_id);if(e.consent==='denied')continue;if(Object.hasOwn(counts,e.event_name))counts[e.event_name]++;}
 return Object.entries(counts).map(([step,count])=>({step,count,method:'event_counts_not_user_cohorts'}));
}
export function serviceDemand(events,{trustedServer=false,minGroupSize=5}={}) {
 const seen=new Set();const groups=new Map();
 for(const e of events){validateEvent(e,{trustedServer});if(seen.has(e.event_id))continue;seen.add(e.event_id);if(e.consent==='denied'||!e.service_id)continue;
 const row=groups.get(e.service_id)||{service_id:e.service_id,views:0,cta:0,checkout:0,verifiedPurchases:0,verifiedRevenueMinor:0};
 if(e.event_name==='service_view')row.views++;
 if(e.event_name==='service_cta_click')row.cta++;
 if(e.event_name==='checkout_started')row.checkout++;
 if(trustedServer&&e.event_name==='payment_verified'){row.verifiedPurchases++;row.verifiedRevenueMinor+=e.value_minor||0;}
 if(trustedServer&&e.event_name==='refund_verified')row.verifiedRevenueMinor-=e.value_minor||0;
 groups.set(e.service_id,row);
 }
 return [...groups.values()].filter(x=>x.views+x.cta+x.checkout+x.verifiedPurchases>=minGroupSize).sort((a,b)=>b.views-a.views);
}
