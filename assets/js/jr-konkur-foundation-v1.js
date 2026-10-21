/* JR Konkur source-gated selection foundation v1.0. No admission predictions.
 * Pure, deterministic, memory-only: no network, storage, identity or scorecard handling.
 * Official eligibility can only be established by separately reviewed annual rules.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JRKonkurFoundation=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const STATUSES=Object.freeze({
  ELIGIBLE:'ELIGIBLE_VERIFIED',INELIGIBLE:'INELIGIBLE_VERIFIED',
  INSUFFICIENT:'INSUFFICIENT_INFORMATION',REVIEW:'OFFICIAL_REVIEW_REQUIRED'
 });
 const TYPES=Object.freeze({FACT:'OFFICIAL_FACT',PREFERENCE:'USER_PREFERENCE',INTERPRETATION:'RESEARCH_OR_PROFESSIONAL_INTERPRETATION'});
 const safeText=v=>typeof v==='string'?v.trim():'';
 const safeYear=v=>Number.isInteger(v)&&v>=1300&&v<=1500?v:null;
 function officialSource(source,year){
  if(!source||typeof source!=='object')return false;
  return safeText(source.documentId).length>0&&safeText(source.version).length>0&&
   Number.isInteger(source.page)&&source.page>0&&source.year===year&&
   source.reviewStatus==='VERIFIED'&&source.superseded!==true;
 }
 function evaluate(candidate,programme,rules,coverage){
  const year=safeYear(candidate&&candidate.year);
  const code=safeText(programme&&programme.code);
  if(!year||!/^[0-9]{5}$/.test(code)||!programme||programme.year!==year)
   return {status:STATUSES.INSUFFICIENT,reasons:['CYCLE_OR_PROGRAMME_UNVERIFIED'],evidence:[]};
  if(!officialSource(programme.source,year))
   return {status:STATUSES.REVIEW,reasons:['OFFICIAL_PROGRAMME_SOURCE_UNVERIFIED'],evidence:[]};
  if(!Array.isArray(rules)||rules.length===0)
   return {status:STATUSES.INSUFFICIENT,reasons:['NO_VERIFIED_ELIGIBILITY_RULES'],evidence:[]};
  const evidence=[],reasons=[];let unknown=false,review=false,blocked=false,verified=0;
  for(const rule of rules){
   if(!rule||rule.year!==year||!officialSource(rule.source,year)||rule.reviewStatus!=='VERIFIED'){
    review=true;reasons.push('RULE_NOT_VERIFIED');continue;
   }
   if(!['equals','notEquals','oneOf'].includes(rule.operator)||!safeText(rule.field)||
      !Object.prototype.hasOwnProperty.call(candidate||{},rule.field)){
    unknown=true;reasons.push('RULE_INPUT_MISSING');continue;
   }
   const actual=candidate[rule.field];
   if(actual===null||actual===undefined||actual===''){
    unknown=true;reasons.push('RULE_INPUT_MISSING');continue;
   }
   let pass;
   if(rule.operator==='equals')pass=actual===rule.value;
   else if(rule.operator==='notEquals')pass=actual!==rule.value;
   else {if(!Array.isArray(rule.values)||rule.values.length===0){review=true;reasons.push('RULE_LOGIC_UNVERIFIED');continue;}pass=rule.values.includes(actual);}
   if(typeof pass!=='boolean'){review=true;reasons.push('RULE_LOGIC_UNVERIFIED');continue;}
   verified++;
   evidence.push({type:TYPES.FACT,ruleId:safeText(rule.id),source:rule.source});
   if(!pass){blocked=true;reasons.push('VERIFIED_RULE_CONFLICT');}
  }
  // Never infer eligibility from an arbitrary subset of otherwise valid rules.
  // A trusted backend must establish complete reviewed coverage for the actual
  // programme, year and effective official amendments before passing this context.
  const ruleSetComplete=!!coverage&&coverage.status==='VERIFIED_COMPLETE'&&
    coverage.year===year&&coverage.programmeCode===code&&coverage.serverReviewed===true&&
    officialSource(coverage.source,year);
  if(!blocked&&!review&&!unknown&&verified>0&&!ruleSetComplete)
    reasons.push('COMPLETE_OFFICIAL_RULE_COVERAGE_UNVERIFIED');
  const status=blocked?STATUSES.INELIGIBLE:
   review?STATUSES.REVIEW:unknown||verified===0?STATUSES.INSUFFICIENT:
   ruleSetComplete?STATUSES.ELIGIBLE:STATUSES.REVIEW;
  return {status,reasons:[...new Set(reasons)],evidence};
 }
 function inspectList(choices,cycle){
  const warnings=[],seen=new Set();
  if(!Array.isArray(choices))return {valid:false,warnings:[{type:'DATA_QUALITY',code:'INVALID_LIST'}]};
  const max=cycle&&Number.isInteger(cycle.maxChoices)&&cycle.maxChoices>0&&
   officialSource(cycle.source,cycle.year)?cycle.maxChoices:null;
  if(max===null)warnings.push({type:'DATA_QUALITY',code:'MAXIMUM_UNVERIFIED'});
  if(max!==null&&choices.length>max)warnings.push({type:'OFFICIAL_RULE',code:'MAXIMUM_EXCEEDED'});
  choices.forEach((item,index)=>{
   const code=safeText(item&&item.code);
   if(!code){warnings.push({type:'DATA_QUALITY',code:'MISSING_PROGRAMME_CODE',position:index+1});return;}
   const key=String(item.year)+'/'+code;
   if(seen.has(key))warnings.push({type:'DATA_QUALITY',code:'DUPLICATE_CODE',position:index+1});
   seen.add(key);
   if(!cycle||item.year!==cycle.year||!officialSource(item.source,item.year))
    warnings.push({type:'DATA_QUALITY',code:'UNVERIFIED_OR_WRONG_CYCLE',position:index+1});
  });
  return {valid:warnings.length===0,warnings,maximum:max,count:choices.length};
 }
 // Search is a view of the user's *original ordered draft*, never a reordering.
 const searchFold=value=>String(value??'').normalize('NFKC')
  .replace(/[۰-۹٠-٩]/g,ch=>{
   const n=ch.codePointAt(0);return String(n>=0x6f0?n-0x6f0:n-0x660);
  })
  .replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim().toLocaleLowerCase();
 function filterDraftChoices(choices,query=''){
  if(!Array.isArray(choices)||typeof query!=='string'||query.length>80)return [];
  const needle=searchFold(query);
  const selected=[];
  choices.forEach((choice,index)=>{
   if(!choice||typeof choice!=='object')return;
   const haystack=[choice.code,choice.note,choice.group].map(searchFold).join(' ');
   if(!needle||haystack.includes(needle))selected.push(Object.freeze({index,choice}));
  });
  return Object.freeze(selected);
 }
 function reorder(choices,from,to){
  if(!Array.isArray(choices)||!Number.isInteger(from)||!Number.isInteger(to)||
   from<0||to<0||from>=choices.length||to>=choices.length)return null;
  const result=choices.slice();result.splice(to,0,result.splice(from,1)[0]);return result;
 }
 function evidencePassport(facts,preferences,interpretations){
  const mapped=[];
  for(const f of Array.isArray(facts)?facts:[]){
   if(f&&officialSource(f.source,f.year))
    mapped.push({type:TYPES.FACT,claim:safeText(f.claim),source:f.source});
  }
  for(const p of Array.isArray(preferences)?preferences:[])
   mapped.push({type:TYPES.PREFERENCE,claim:safeText(p)});
  for(const r of Array.isArray(interpretations)?interpretations:[])
   mapped.push({type:TYPES.INTERPRETATION,claim:safeText(r),humanReview:'NOT_VERIFIED'});
  return {version:'1.0.0',evidence:mapped,admissionPredictionEnabled:false,
   nextVerification:'Check the applicable official admission guide and amendments'};
 }
 return {STATUSES,TYPES,officialSource,evaluate,inspectList,reorder,filterDraftChoices,evidencePassport};
});
