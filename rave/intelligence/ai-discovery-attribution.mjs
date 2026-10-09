/** Offline lead-attribution engine for organic search and AI referrals.
 * Only user-supplied, consented event metadata; never sends data to third parties.
 */
const CHANNELS=Object.freeze(['google-organic','bing-organic','ai-referral','direct','other']);
const AI_HOSTS=new Set(['chatgpt.com','perplexity.ai','copilot.microsoft.com','gemini.google.com','claude.ai']);
const SEARCH_HOSTS=new Map([['www.google.com','google-organic'],['google.com','google-organic'],['www.bing.com','bing-organic'],['bing.com','bing-organic']]);
function host(referrer){try{const u=new URL(referrer);return ['http:','https:'].includes(u.protocol)?u.hostname.toLowerCase():null}catch{return null}}
function pathOk(p){return typeof p==='string'&&/^\/(fa|en)\/[a-z0-9/_-]*$/.test(p)&&!p.includes('//')}
export function classifyDiscoverySource({referrer='',utmSource=''}={}){
 const src=String(utmSource).trim().toLowerCase();
 if(['chatgpt','perplexity','copilot','gemini','claude'].includes(src))return {channel:'ai-referral',source:src,confidence:'campaign-tag'};
 if(src==='google'||src==='bing')return {channel:src+'-organic',source:src,confidence:'campaign-tag-unverified'};
 const hostname=host(referrer);
 if(!hostname)return {channel:'direct',source:'unknown',confidence:'unknown'};
 if(AI_HOSTS.has(hostname))return {channel:'ai-referral',source:hostname,confidence:'referrer'};
 if(SEARCH_HOSTS.has(hostname))return {channel:SEARCH_HOSTS.get(hostname),source:hostname,confidence:'referrer'};
 return {channel:'other',source:hostname,confidence:'referrer'};
}
export function summarizeDiscoveryConversions(events=[]){
 if(!Array.isArray(events))throw new TypeError('Events must be an array');
 const seen=new Set(),summary=Object.fromEntries(CHANNELS.map(channel=>[channel,{visits:0,leads:0,purchases:0,revenueMinor:0}]));
 const rejected=[];
 for(const e of events){
  if(!e||typeof e.eventId!=='string'||!e.eventId.trim()||seen.has(e.eventId)||!pathOk(e.path)||!['visit','lead','purchase'].includes(e.type)||e.consent!==true){rejected.push(e?.eventId??null);continue}
  if(e.type==='purchase'&&(!Number.isSafeInteger(e.amountMinor)||e.amountMinor<0||!['IRR','USD'].includes(e.currency))){rejected.push(e.eventId);continue}
  seen.add(e.eventId);
  const channel=classifyDiscoverySource(e).channel,record=summary[channel];
  if(e.type==='visit')record.visits++;
  if(e.type==='lead')record.leads++;
  if(e.type==='purchase'){record.purchases++;if(e.currency==='IRR'){const total=record.revenueMinor+e.amountMinor;if(!Number.isSafeInteger(total))throw new RangeError('Revenue overflow');record.revenueMinor=total}}
 }
 return {summary,rejected,reportedRevenueCurrency:'IRR',usdPurchasesExcludedFromRevenue:true,attributionIsIndicative:true,networkCalled:false,productionTouched:false};
}
