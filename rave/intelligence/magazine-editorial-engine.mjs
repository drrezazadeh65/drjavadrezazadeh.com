/** Standalone editorial magazine workflow. No publishing or network side effects. */
const STATES=['draft','fact-check','editorial-review','approved','scheduled','published'];
const TRANSITIONS={draft:['fact-check'], 'fact-check':['editorial-review','draft'], 'editorial-review':['approved','draft'], approved:['scheduled','draft'],scheduled:['published','draft'],published:[]};
export function validateMagazineArticle(article){
 if(!article||typeof article.id!=='string'||!article.id.trim()||!['fa','en'].includes(article.locale)||typeof article.title!=='string'||!article.title.trim()||typeof article.body!=='string'||!article.body.trim())throw new TypeError('Invalid magazine article');
 if(article.canonical&&(!/^\/(fa|en)\//.test(article.canonical)||!article.canonical.startsWith('/'+article.locale+'/')))throw new Error('Invalid localized canonical');
 const status=article.status??'draft';
 if(!STATES.includes(status))throw new Error('Invalid status');
 return {id:article.id,locale:article.locale,status,readyForPublication:status==='approved'||status==='scheduled',productionTouched:false};
}
export function transitionMagazineArticle(article,next,{reviewerApproved=false}={}){
 const state=validateMagazineArticle(article);
 if(!TRANSITIONS[state.status].includes(next))throw new Error('Disallowed editorial transition');
 if((next==='approved'||next==='published')&&!reviewerApproved)throw new Error('Editorial approval required');
 return {...article,status:next,revision:(article.revision??0)+1,publicationExecuted:false};
}
