/** Offline exploratory scoring. Not a validated psychometric test. */
export function scoreGoldenTalent({items=[],responses=[]}={}){
 if(!Array.isArray(items)||!Array.isArray(responses)||!items.length)throw new TypeError('Invalid inputs');
 const answers=new Map(responses.map(r=>[r.itemId,r.score]));
 if(answers.size!==responses.length)throw new Error('Duplicate answers');
 const totals={};const ids=new Set();
 for(const item of items){
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.dimension!=='string'||!item.dimension||!Number.isSafeInteger(item.maxScore)||item.maxScore<1)throw new Error('Invalid item');
  ids.add(item.id);const score=answers.get(item.id);
  if(!Number.isSafeInteger(score)||score<0||score>item.maxScore)throw new Error('Invalid response');
  const d=totals[item.dimension]??{score:0,maxScore:0};
  d.score+=score;d.maxScore+=item.maxScore;totals[item.dimension]=d;
 }
 if(answers.size!==ids.size)throw new Error('Unexpected response');
 return {dimensions:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,{...v,percent:Math.round(v.score/v.maxScore*10000)/100}])),validated:false,automaticPlacement:false,productionTouched:false};
}
