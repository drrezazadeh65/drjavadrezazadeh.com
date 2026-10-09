/** Versioned, offline Golden Talent questionnaire governance. */
export function validateTalentInstrument(instrument){
 if(!instrument||typeof instrument.id!=='string'||!instrument.id.trim()||!/^\d+\.\d+\.\d+$/.test(instrument.version)||!Array.isArray(instrument.items)||!instrument.items.length)throw new TypeError('Invalid instrument');
 const ids=new Set(),dimensions=new Set();
 for(const item of instrument.items){
  if(!item||typeof item.id!=='string'||!item.id.trim()||ids.has(item.id)||typeof item.dimension!=='string'||!item.dimension.trim()||!Number.isSafeInteger(item.maxScore)||item.maxScore<1||typeof item.promptFa!=='string'||!item.promptFa.trim())throw new Error('Invalid or duplicate item');
  ids.add(item.id);dimensions.add(item.dimension);
 }
 return {id:instrument.id,version:instrument.version,itemCount:ids.size,dimensions:[...dimensions],valid:true,psychometricallyValidated:false,productionTouched:false};
}
export function evaluateTalentResponseQuality(instrument,responses){
 const schema=validateTalentInstrument(instrument);
 if(!Array.isArray(responses))throw new TypeError('Invalid responses');
 const known=new Set(instrument.items.map(i=>i.id)),seen=new Set(),issues=[];
 for(const answer of responses){
  if(!answer||!known.has(answer.itemId)){issues.push('unknown_item');continue}
  if(seen.has(answer.itemId))issues.push('duplicate_response');
  seen.add(answer.itemId);
  const item=instrument.items.find(i=>i.id===answer.itemId);
  if(!Number.isSafeInteger(answer.score)||answer.score<0||answer.score>item.maxScore)issues.push('invalid_score');
 }
 for(const id of known)if(!seen.has(id))issues.push('missing_response');
 return {instrument:schema.id,version:schema.version,complete:issues.length===0,issues:[...new Set(issues)],eligibleForScoring:issues.length===0,productionTouched:false};
}
