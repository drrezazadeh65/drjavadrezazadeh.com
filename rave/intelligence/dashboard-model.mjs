import {summarizeMetrics} from './metrics.mjs';
export function buildDashboard(rows,{generatedAt=new Date().toISOString()}={}){
 const metrics=summarizeMetrics(rows);
 const find=(name)=>metrics.filter(row=>row.metric===name);
 const revenue=find('gross_revenue_minor');
 const refunds=find('refunds_minor');
 const balances=new Map();
 for(const row of revenue){const key=[row.period,row.currency,row.service_id||'',row.locale||''].join('|');balances.set(key,{period:row.period,currency:row.currency,service_id:row.service_id||null,locale:row.locale||null,gross_minor:row.value,refunds_minor:0,net_minor:row.value});}
 for(const row of refunds){const key=[row.period,row.currency,row.service_id||'',row.locale||''].join('|');const existing=balances.get(key);if(!existing)continue;existing.refunds_minor+=row.value;existing.net_minor=existing.gross_minor-existing.refunds_minor;}
 return {schema:'rave.dashboard.v1',generatedAt,operational:false,search:{organic_clicks:find('organic_clicks'),impressions:find('search_impressions')},services:{views:find('service_views')},commerce:{verified_orders:find('verified_orders'),balances:[...balances.values()]},quality:{source_count:new Set(metrics.map(row=>row.source)).size,metric_rows:metrics.length,notice:'Aggregated input only; not evidence of live site connectivity'}};
}
