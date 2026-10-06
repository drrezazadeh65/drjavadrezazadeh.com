// Content lifecycle validation for future CMS integration.
const transitions={DRAFT:['IN_REVIEW'],IN_REVIEW:['APPROVED','REJECTED'],APPROVED:['PUBLISHED','DRAFT'],PUBLISHED:['SUPERSEDED'],REJECTED:['DRAFT'],SUPERSEDED:[]};
export function validateContentTransition(current,next){
 if(!transitions[current]?.includes(next)) throw new Error('Invalid content transition');
 return next;
}
export function publicationRequirements({status,reviewer_user_id,index_state,canonical,title,description}={}){
 if(status==='PUBLISHED'&&!reviewer_user_id) throw new Error('Reviewed revision required');
 if(index_state==='INDEX'&&(!canonical||!title||!description)) throw new Error('Indexable publication metadata required');
 return {valid:true};
}
