/** Offline RAVE analytics: aggregate anonymized funnel events without network access. */
const STAGES=['visit','engagement','lead','checkout','purchase'];
export function analyzeRaveFunnel(events=[]){
 if(!Array.isArray(events))throw new TypeError('Events must be an array');
 const counts=Object.fromEntries(STAGES.map(s=>[s,0]));
 for(const event of events){
  if(!event||!STAGES.includes(event.stage))throw new Error('Invalid funnel stage');
  if(event.count!==undefined&&(!Number.isSafeInteger(event.count)||event.count<0))throw new Error('Invalid event count');
  counts[event.stage]+=event.count??1;
 }
 const rates={};
 for(let i=1;i<STAGES.length;i++){
  const prior=counts[STAGES[i-1]],current=counts[STAGES[i]];
  rates[STAGES[i]]=prior?Math.round(current/prior*10000)/100:null;
 }
 const warnings=[];
 for(let i=1;i<STAGES.length;i++)if(counts[STAGES[i]]>counts[STAGES[i-1]])warnings.push({stage:STAGES[i],reason:'non_monotonic_aggregate'});
 return {counts,rates,warnings,source:'offline-supplied-events',connected:false,productionTouched:false};
}
