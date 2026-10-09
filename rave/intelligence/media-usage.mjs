/** Canonical media usage index; backend must persist and authorize changes. */
const KEY=/^[a-z0-9][a-z0-9_-]{2,100}$/;
export function buildMediaUsageIndex(usages=[]){
 const result=new Map();
 for(const u of usages){
  if(!u||!KEY.test(u.mediaId||'')||typeof u.page!=='string'||!/^\/(fa|en)\//.test(u.page)||typeof u.slot!=='string'||!u.slot.trim())throw new Error('Invalid media usage');
  const list=result.get(u.mediaId)||[];
  if(!list.some(x=>x.page===u.page&&x.slot===u.slot))list.push(Object.freeze({page:u.page,slot:u.slot}));
  result.set(u.mediaId,list);
 }
 return result;
}
export function listMediaUsages(index,mediaId){if(!KEY.test(mediaId))throw new Error('Invalid media ID');return [...(index.get(mediaId)||[])];}
export function replaceMediaReferences(usages,oldId,newId){
 if(!KEY.test(oldId)||!KEY.test(newId))throw new Error('Invalid media ID');
 return usages.map(u=>u.mediaId===oldId?{...u,mediaId:newId}:u);
}
export function mediaDeletionDecision(index,mediaId){const references=listMediaUsages(index,mediaId);return {allowed:references.length===0,referenceCount:references.length,references};}
