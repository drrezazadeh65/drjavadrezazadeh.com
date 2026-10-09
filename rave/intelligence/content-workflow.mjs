/** Pure content workflow model. Persistence, authentication and deployment are server responsibilities. */
const LOCALES=new Set(['fa','en']);
const STATES=new Set(['draft','review','published','archived']);
const SLUG=/^[a-z0-9][a-z0-9-]{0,119}$/;
function validate(item){
 if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('Invalid content');
 if(!LOCALES.has(item.locale)||!SLUG.test(item.slug||''))throw new Error('Invalid locale or slug');
 if(typeof item.title!=='string'||!item.title.trim()||item.title.length>240)throw new Error('Invalid title');
 if(typeof item.body!=='string'||item.body.length>200000)throw new Error('Invalid body');
 if(!STATES.has(item.status))throw new Error('Invalid status');
 if(!Number.isSafeInteger(item.revision)||item.revision<1)throw new Error('Invalid revision');
 return item;
}
export function createDraft({locale,slug,title,body=''}){
 return Object.freeze(validate({locale,slug,title,body,status:'draft',revision:1}));
}
export function reviseContent(item,changes,{expectedRevision}={}){
 validate(item);
 if(expectedRevision!==item.revision)throw new Error('Revision conflict');
 if(item.status==='archived')throw new Error('Archived content cannot be edited');
 const permitted=['title','body'];if(Object.keys(changes).some(k=>!permitted.includes(k)))throw new Error('Protected content field');
 return Object.freeze(validate({...item,...changes,status:'draft',revision:item.revision+1}));
}
export function transitionContent(item,next,{authorized=false}={}){
 validate(item);if(!authorized)throw new Error('Publishing authorization required');
 const allowed={draft:['review'],review:['draft','published'],published:['archived','draft'],archived:[]};
 if(!allowed[item.status].includes(next))throw new Error('Invalid content transition');
 return Object.freeze(validate({...item,status:next,revision:item.revision+1}));
}
export function contentPath(item){validate(item);return '/'+item.locale+'/'+item.slug+'/';}
