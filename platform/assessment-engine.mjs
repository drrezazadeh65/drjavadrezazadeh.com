// Provider-neutral assessment execution primitives.
// A scoring definition is executable only when a published, explicitly supplied ruleset exists.
export function freezeAssessmentSubmission({session_id,assessment_version_id,response_revision,responses=[]}={}){
 if(!session_id||!assessment_version_id||!Number.isInteger(response_revision)||response_revision<1) throw new Error('Versioned session required');
 const seen=new Set();
 const frozen=responses.map(r=>{if(!r?.item_id||seen.has(r.item_id)) throw new Error('Unique item responses required');seen.add(r.item_id);return {item_id:r.item_id,value:r.value,missing:r.missing===true};});
 return {session_id,assessment_version_id,response_revision,responses:frozen,immutable:true};
}
export function executeDeclaredScoring({snapshot,scoring_version}={}){
 if(!snapshot?.immutable) throw new Error('Frozen response snapshot required');
 if(scoring_version?.status!=='PUBLISHED'||!Array.isArray(scoring_version.rules)) throw new Error('Published explicit scoring rules required');
 const values=new Map(snapshot.responses.filter(r=>!r.missing).map(r=>[r.item_id,r.value]));
 return scoring_version.rules.map(rule=>{
  if(!rule.score_key||!Array.isArray(rule.item_ids)||!['SUM','MEAN','COUNT'].includes(rule.operation)) throw new Error('Unsupported scoring rule');
  const nums=rule.item_ids.map(id=>values.get(id)).filter(Number.isFinite);
  if(!nums.length) return {score_key:rule.score_key,raw_value:null,missing:true};
  const raw=rule.operation==='SUM'?nums.reduce((a,b)=>a+b,0):rule.operation==='MEAN'?nums.reduce((a,b)=>a+b,0)/nums.length:nums.length;
  return {score_key:rule.score_key,raw_value:raw,missing:false};
 });
}
export function interpretDeclaredScores({scores,interpretation_version}={}){
 if(interpretation_version?.status!=='PUBLISHED'||!Array.isArray(interpretation_version.rules)) throw new Error('Published explicit interpretation rules required');
 return interpretation_version.rules.flatMap(rule=>{
  const s=scores.find(x=>x.score_key===rule.score_key);
  if(!s||s.raw_value===null) return [];
  const match=(rule.bands||[]).find(b=>(b.min==null||s.raw_value>=b.min)&&(b.max==null||s.raw_value<=b.max));
  return match?[{interpretation_key:rule.interpretation_key,score_key:rule.score_key,text_value:match.text,rule_version:interpretation_version.version_number}]:[];
 });
}
