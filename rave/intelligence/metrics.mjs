const validId=/^[a-zA-Z0-9_-]{3,100}$/;
export const metricDefinitions=Object.freeze({
 organic_clicks:{unit:'count',authority:'search_provider'},
 search_impressions:{unit:'count',authority:'search_provider'},
 service_views:{unit:'count',authority:'consented_analytics'},
 verified_orders:{unit:'count',authority:'commerce_backend'},
 gross_revenue_minor:{unit:'minor_currency',authority:'commerce_backend'},
 refunds_minor:{unit:'minor_currency',authority:'commerce_backend'}
});
export function validateMetric(row){
 if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Invalid metric');
 const keys=['metric','value','period','source','currency','service_id','locale','freshness_at'];
 for(const key of Object.keys(row))if(!keys.includes(key))throw new Error('Unexpected field '+key);
 const definition=metricDefinitions[row.metric];
 if(!definition)throw new Error('Unknown metric');
 if(!Number.isSafeInteger(row.value)||row.value<0)throw new Error('Invalid value');
 if(!/^\d{4}-\d\d-\d\d$/.test(row.period)||Number.isNaN(Date.parse(row.period)))throw new Error('Invalid period');
 if(!validId.test(row.source||''))throw new Error('Invalid source');
 if(row.locale!==undefined&&!['fa','en'].includes(row.locale))throw new Error('Invalid locale');
 if(row.service_id!==undefined&&!validId.test(row.service_id))throw new Error('Invalid service');
 if(definition.unit==='minor_currency'&&!/^[A-Z]{3}$/.test(row.currency||''))throw new Error('Currency required');
 if(definition.unit!=='minor_currency'&&row.currency!==undefined)throw new Error('Currency not allowed');
 if(row.freshness_at!==undefined&&(!/^\d{4}-\d\d-\d\dT/.test(row.freshness_at)||Number.isNaN(Date.parse(row.freshness_at))))throw new Error('Invalid freshness');
 return row;
}
export function summarizeMetrics(rows){
 const groups=new Map();
 for(const row of rows){validateMetric(row);const key=JSON.stringify([row.metric,row.period,row.currency||'',row.service_id||'',row.locale||'']);
 const prior=groups.get(key);if(prior&&prior.source!==row.source)throw new Error('Conflicting metric authorities');
 const next=prior?{...prior,value:prior.value+row.value}:{...row};
 if(!Number.isSafeInteger(next.value))throw new Error('Overflow');
 groups.set(key,next);
 }
 return [...groups.values()].sort((a,b)=>a.metric.localeCompare(b.metric)||a.period.localeCompare(b.period));
}
