// Assessment authoring lifecycle. Published versions are immutable and execution references explicit versions.
const transitions={DRAFT:['IN_REVIEW','RETIRED'],IN_REVIEW:['DRAFT','PUBLISHED'],PUBLISHED:['RETIRED'],RETIRED:[]};
export function transitionAssessmentVersion(version,next,{reviewer_user_id}={}){
 if(!version?.id||!transitions[version.status]?.includes(next)) throw new Error('Invalid assessment version transition');
 if(next==='PUBLISHED'&&!reviewer_user_id) throw new Error('Reviewer required for publication');
 return {...version,status:next,reviewer_user_id:next==='PUBLISHED'?reviewer_user_id:version.reviewer_user_id||null,immutable:next==='PUBLISHED'||version.immutable===true};
}
export function validateItemBank(version,items=[]){
 if(version?.status==='PUBLISHED'&&version.immutable!==true) throw new Error('Published assessment must be immutable');
 const ids=new Set();
 for(const item of items){
  if(!item.id||ids.has(item.id)||!item.item_code||!item.response_type) throw new Error('Unique versioned item metadata required');
  ids.add(item.id);
 }
 return {assessment_version_id:version.id,item_count:items.length,valid:true};
}
