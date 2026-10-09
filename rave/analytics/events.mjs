export const allowedEvents=new Set(['page_view','article_view','service_view','service_cta_click','registration_started','registration_completed','checkout_started','payment_verified','refund_verified','newsletter_opt_in']);
const allowedKeys=new Set(['schema','event_id','event_name','occurred_at','page_path','locale','service_id','content_id','channel','campaign','consent','source_system','order_reference','value_minor','currency']);
const idPattern=/^[a-zA-Z0-9_-]{3,100}$/;
export function validateEvent(event,{trustedServer=false}={}){
 if(!event||typeof event!=='object'||Array.isArray(event))throw new Error('Event must be an object');
 for(const key of Object.keys(event))if(!allowedKeys.has(key))throw new Error('Unexpected field: '+key);
 if(event.schema!=='rave.event.v1')throw new Error('Unsupported event schema');
 if(!idPattern.test(event.event_id||''))throw new Error('Invalid event id');
 if(!allowedEvents.has(event.event_name))throw new Error('Invalid event name');
 if(!Number.isFinite(Date.parse(event.occurred_at))||!/^\d{4}-\d\d-\d\dT/.test(event.occurred_at))throw new Error('Invalid timestamp');
 if(!idPattern.test(event.source_system||''))throw new Error('Invalid source');
 if(!['granted','denied','not_required'].includes(event.consent))throw new Error('Invalid consent state');
 if(event.locale!==undefined&&!['fa','en'].includes(event.locale))throw new Error('Invalid locale');
 if(event.page_path!==undefined&&(!/^\/(?!\/)[^?#]*$/.test(event.page_path)||event.page_path.length>300))throw new Error('Invalid path');
 for(const key of ['service_id','content_id','channel','campaign'])if(event[key]!==undefined&&!idPattern.test(event[key]))throw new Error('Invalid '+key);
 const financial=['payment_verified','refund_verified'].includes(event.event_name);
 if(financial&&!trustedServer)throw new Error('Financial events require trusted backend');
 if(event.order_reference!==undefined&&(!trustedServer||!idPattern.test(event.order_reference)))throw new Error('Private order reference prohibited');
 if(event.value_minor!==undefined&&(!financial||!trustedServer||!Number.isSafeInteger(event.value_minor)||event.value_minor<0))throw new Error('Invalid financial value');
 if(event.currency!==undefined&&(!financial||!/^[A-Z]{3}$/.test(event.currency)))throw new Error('Invalid currency');
 return event;
}
export function aggregateEvents(events,{trustedServer=false,minGroupSize=5}={}){
 if(!Number.isSafeInteger(minGroupSize)||minGroupSize<1)throw new Error('Invalid minimum group size');
 const seen=new Set(),groups=new Map();
 for(const event of events){
  validateEvent(event,{trustedServer});
  if(seen.has(event.event_id))continue;
  seen.add(event.event_id);
  if(event.consent==='denied')continue;
  const key=JSON.stringify([event.event_name,event.locale||'unknown',event.service_id||'none',event.channel||'unknown']);
  const row=groups.get(key)||{event_name:event.event_name,locale:event.locale||'unknown',service_id:event.service_id||'none',channel:event.channel||'unknown',count:0,value_minor:0};
  row.count++;
  if(trustedServer&&Number.isSafeInteger(event.value_minor))row.value_minor+=event.event_name==='refund_verified'?-event.value_minor:event.value_minor;
  groups.set(key,row);
 }
 return [...groups.values()].filter(row=>row.count>=minGroupSize).sort((a,b)=>b.count-a.count||a.event_name.localeCompare(b.event_name));
}
