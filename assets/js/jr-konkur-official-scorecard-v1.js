/* JR Official Scorecard Manual Intake v1 | distinct from PRIVATE MOCK scorecards.
 * Pure data validation; all data is SELF_REPORTED, not verified with Sanjesh.
 * No formula, rank conversion, eligibility assessment or probability model.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JRKonkurOfficialScorecard=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const groups=Object.freeze(['MATHEMATICS','EXPERIMENTAL_SCIENCES','HUMANITIES','ARTS','FOREIGN_LANGUAGES']);
 const fields=Object.freeze({
  year:Object.freeze({type:'year'}),
  group:Object.freeze({type:'group'}),
  rankQuota:Object.freeze({type:'integer',min:1,max:99999999}),
  rankCountry:Object.freeze({type:'integer',min:1,max:99999999}),
  examScore:Object.freeze({type:'score',min:0,max:999999.9999}),
  schoolScore:Object.freeze({type:'score',min:0,max:999999.9999}),
  finalScore:Object.freeze({type:'score',min:0,max:999999.9999}),
  grade11:Object.freeze({type:'grade',min:0,max:20}),
  grade12:Object.freeze({type:'grade',min:0,max:20}),
  quotaLabel:Object.freeze({type:'label'}),
  eligibilityDeclaration:Object.freeze({type:'eligibility'})
 });
 const digitString=x=>String(x??'').replace(/[۰-۹٠-٩]/g,c=>{
  const n=c.codePointAt(0);return String(n>=0x6f0?n-0x6f0:n-0x660);
 }).replace(/[٫]/g,'.').trim();
 function number(x,kind){
  const s=digitString(x);
  if(!s)return null;
  const pattern=kind==='integer'?/^[0-9]+$/:/^[0-9]+(?:\.[0-9]{1,4})?$/;
  if(!pattern.test(s))return NaN;
  const n=Number(s);
  if(!Number.isSafeInteger(n)&&kind==='integer')return NaN;
  return Number.isFinite(n)?n:NaN;
 }
 function inspect(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return Object.freeze({valid:false,issues:['INVALID_INPUT']});
  const issues=[],output={};
  const year=number(input.year,'integer');
  if(!Number.isInteger(year)||year<1404||year>1406)issues.push('INVALID_CYCLE');
  else output.year=year;
  if(!groups.includes(input.group))issues.push('INVALID_EXAM_GROUP');
  else output.group=input.group;
  for(const [key,spec] of Object.entries(fields)){
   if(key==='year'||key==='group')continue;
   const raw=input[key];
   if(raw===undefined||raw===null||String(raw).trim()==='')continue;
   if(spec.type==='label'){
    const value=String(raw).trim();
    if(value.length>80||/[\x00-\x1f<>]/.test(value))issues.push('INVALID_QUOTA_LABEL');
    else output[key]=value;
    continue;
   }
   if(spec.type==='eligibility'){
    if(!['SELF_REPORTED_YES','SELF_REPORTED_NO','UNKNOWN'].includes(raw))issues.push('INVALID_DECLARATION');
    else output[key]=raw;
    continue;
   }
   const val=number(raw,spec.type==='integer'?'integer':'score');
   if(!Number.isFinite(val)||val<spec.min||val>spec.max)issues.push('INVALID_'+key.toUpperCase());
   else output[key]=val;
  }
  if(!['rankQuota','rankCountry','examScore','schoolScore','finalScore','grade11','grade12'].some(k=>Object.hasOwn(output,k)))
   issues.push('NO_SCORECARD_METRICS');
  return Object.freeze({
   valid:issues.length===0,issues:Object.freeze([...new Set(issues)]),
   report:issues.length===0?Object.freeze(output):null,
   evidenceType:'USER_SELF_REPORT',
   officialVerification:'NOT_PERFORMED',
   eligibilityStatus:'NOT_ASSESSED',
   rankConversionEnabled:false,
   admissionProbabilityEnabled:false,
   officialScoreFormulaApplied:false,
   schemaReview:'PROVISIONAL_FIELD_FAMILIES_NOT_YEAR_SPECIFIC',
   nextStep:'Verify values and applicable year-specific rules directly in the official Sanjesh scorecard'
  });
 }
 return {groups,fields,inspect,digitString};
});
