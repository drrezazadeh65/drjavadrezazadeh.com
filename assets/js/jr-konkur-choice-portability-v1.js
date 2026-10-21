/* JR Konkur: portable 1405 preliminary choice drafts.
 * User-controlled local JSON only. No authenticating, networking, storage,
 * official admission checks or official maximum-choice claims.
 */
(function(root,factory){
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JRKonkurChoicePortability=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const schema='jr-konkur-1405-choice-draft-v1';
 const version=1,year=1405,maximumLocalChoices=150,maximumFileBytes=131072;
 const groups=new Set(['','HUMANITIES','EXPERIMENTAL_SCIENCES','MATHEMATICS','ARTS','FOREIGN_LANGUAGES']);
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
 const exact=(obj,keys)=>obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.keys(obj).length===keys.length&&keys.every(k=>own(obj,k));
 const badNote=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;
 function validateRows(input){
  if(!Array.isArray(input)||input.length>maximumLocalChoices)throw new TypeError('Draft exceeds local safety limit');
  const codes=new Set(),out=[];
  for(const item of input){
   if(!exact(item,['code','note','group','year','source']))throw new TypeError('Invalid choice fields');
   if(item.year!==year||item.source!==null)throw new TypeError('Official verification is unsupported');
   if(typeof item.code!=='string'||!/^[0-9]{5}$/.test(item.code)||codes.has(item.code))
    throw new TypeError('Invalid or duplicate programme code');
   if(typeof item.note!=='string'||item.note.length>140||badNote.test(item.note))
    throw new TypeError('Invalid choice note');
   if(typeof item.group!=='string'||!groups.has(item.group))throw new TypeError('Unknown exam group');
   codes.add(item.code);
   out.push(Object.freeze({year,code:item.code,note:item.note,group:item.group,source:null}));
  }
  return Object.freeze(out);
 }
 function exportDraft(choices){
  const rows=validateRows(choices);
  if(!rows.length)throw new TypeError('No preliminary choices');
  const envelope={
   schema,version,admissionYear:year,
   evidenceStatus:'SELF_REPORTED_UNVERIFIED',
   maximumChoiceRuleStatus:'NOT_VERIFIED',
   entries:rows.map((r,i)=>({position:i+1,code:r.code,group:r.group,note:r.note}))
  };
  const json=JSON.stringify(envelope,null,2)+'\n';
  if(new TextEncoder().encode(json).byteLength>maximumFileBytes)throw new TypeError('Draft file is too large');
  return Object.freeze({filename:'jr-konkur-1405-preliminary-draft.json',
   mediaType:'application/json;charset=utf-8',json,count:rows.length,
   verified:false,admissionProbability:null});
 }
 function importDraft(text){
  if(typeof text!=='string'||text.length>maximumFileBytes)throw new TypeError('Invalid file size');
  let decoded;
  try{decoded=JSON.parse(text.replace(/^\uFEFF/,''));}
  catch{throw new TypeError('Malformed JSON draft');}
  if(!exact(decoded,['schema','version','admissionYear','evidenceStatus','maximumChoiceRuleStatus','entries'])||
   decoded.schema!==schema||decoded.version!==version||decoded.admissionYear!==year||
   decoded.evidenceStatus!=='SELF_REPORTED_UNVERIFIED'||decoded.maximumChoiceRuleStatus!=='NOT_VERIFIED'||
   !Array.isArray(decoded.entries)||!decoded.entries.length||decoded.entries.length>maximumLocalChoices)
   throw new TypeError('Unsupported or unsafe draft envelope');
  const rows=decoded.entries.map((r,index)=>{
   if(!exact(r,['position','code','group','note'])||r.position!==index+1)
    throw new TypeError('Invalid or reordered draft positions');
   return {year,code:r.code,group:r.group,note:r.note,source:null};
  });
  const choices=validateRows(rows);
  return Object.freeze({schema,choices,count:choices.length,officiallyVerified:false,
   admissionProbability:null});
 }
 return {schema,maximumLocalChoices,maximumFileBytes,exportDraft,importDraft};
});
