export const channels=['x','facebook','linkedin','youtube','aparat'];
export function validateItem(item){
 if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[-a-z0-9]{3,80}$/.test(item.id))throw new Error('Invalid id');
 if(typeof item.url!=='string'||!item.url.startsWith('https://drjavadrezazadeh.com/'))throw new Error('Invalid canonical URL');
 if(!['fa','en'].includes(item.lang))throw new Error('Invalid language');
 if(typeof item.title!=='string'||item.title.trim().length<8)throw new Error('Invalid title');
 if(item.approved!==true)throw new Error('Content is not approved for distribution');
 return item;
}
export function preparePost(item,channel){
 validateItem(item);
 if(!channels.includes(channel))throw new Error('Unsupported channel');
 const url=new URL(item.url);
 url.searchParams.set('utm_source',channel);
 url.searchParams.set('utm_medium','social');
 url.searchParams.set('utm_campaign','rave_organic');
 const link=url.toString();
 const lead=channel==='linkedin'?item.title+' — '+(item.summary||''):item.title;
 const text=channel==='x'?(lead.slice(0,220)+'\n'+link):lead+'\n'+link;
 return {id:item.id+'-'+channel,channel,sourceId:item.id,lang:item.lang,text,link,mode:'draft',approved:item.approved,requiresMedia:['youtube','aparat'].includes(channel)};
}
export function buildQueue(items,selected=channels){
 const seen=new Set();
 return items.flatMap(item=>selected.map(channel=>{
  const post=preparePost(item,channel);
  if(seen.has(post.id))throw new Error('Duplicate post');seen.add(post.id);
  return post;
 }));
}
