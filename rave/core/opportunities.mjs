const dimensions=new Set(['seo','ai_visibility','academic','content','marketing','conversion','retention']);
export function validateOpportunity(x){
 if(!x||typeof x!=='object'||!dimensions.has(x.dimension))throw new Error('Invalid dimension');
 if(typeof x.id!=='string'||!/^[-a-z0-9_]{3,80}$/.test(x.id))throw new Error('Invalid id');
 for(const k of ['impact','confidence','effort','risk'])if(!Number.isFinite(x[k])||x[k]<0||x[k]>5)throw new Error('Invalid '+k);
 if(typeof x.title!=='string'||x.title.length<5||x.title.length>200)throw new Error('Invalid title');
 return x;
}
export function scoreOpportunity(x){
 validateOpportunity(x);
 const raw=(x.impact*0.4+x.confidence*0.3+(5-x.effort)*0.2+(5-x.risk)*0.1)*20;
 return Math.round(raw*10)/10;
}
export function prioritize(items){
 const ids=new Set();
 return items.map(x=>{validateOpportunity(x);if(ids.has(x.id))throw new Error('Duplicate id');ids.add(x.id);return {...x,score:scoreOpportunity(x),execution:'review_required'};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
