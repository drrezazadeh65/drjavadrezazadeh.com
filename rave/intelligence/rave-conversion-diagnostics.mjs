/** Offline RAVE conversion diagnostics. Does not identify people or connect to production. */
import {analyzeRaveFunnel} from './rave-funnel-analytics.mjs';
const STAGES=['visit','engagement','lead','checkout','purchase'];
export function diagnoseRaveFunnel(events,{minimumBaseline=20}={}){
 if(!Number.isSafeInteger(minimumBaseline)||minimumBaseline<1)throw new TypeError('Invalid baseline');
 const funnel=analyzeRaveFunnel(events);
 const opportunities=[];
 for(let i=1;i<STAGES.length;i++){
  const from=STAGES[i-1],to=STAGES[i],base=funnel.counts[from],next=funnel.counts[to];
  if(base<minimumBaseline)continue;
  if(next>base){opportunities.push({from,to,status:'data-quality',reason:'stage_count_exceeds_previous',priority:'high'});continue}
  const drop=base-next,dropRate=drop/base;
  if(dropRate>=0.5)opportunities.push({from,to,status:'hypothesis',reason:'high_dropoff',drop,dropRate:Math.round(dropRate*10000)/100,priority:dropRate>=0.8?'high':'medium'});
 }
 return {funnel,opportunities,method:'descriptive-only',causalClaims:false,connected:false,productionTouched:false};
}
