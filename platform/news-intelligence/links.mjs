/** Semantic link proposals against an existing, approved public route graph. */
import {assert,plain,safeText} from './contracts.mjs';
const route=s=>typeof s==='string'&&/^\/(?:fa|en)\/[a-z0-9\/-]{0,220}$/.test(s)&&
  !s.includes('//')&&s.endsWith('/');
const norm=s=>s.normalize('NFKC').replace(/[\u064b-\u065f]/g,'')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').toLocaleLowerCase();
export function suggestSemanticLinks({article,approvedRoutes,maxLinks=8}={}){
  assert(plain(article)&&['fa','en'].includes(article.language)&&
    Array.isArray(article.topics)&&article.topics.length<=30&&
    Array.isArray(approvedRoutes)&&approvedRoutes.length<=5000&&
    Number.isInteger(maxLinks)&&maxLinks>=0&&maxLinks<=16,
    'NEWS_LINK_GRAPH_INPUT_INVALID');
  const terms=new Set(article.topics.map(norm)),lang=article.language;
  const choices=[];
  for(const page of approvedRoutes){
    if(!plain(page)||!route(page.path)||page.path.startsWith('/'+(lang==='fa'?'en':'fa')+'/')||
      page.publicIndexable!==true||page.approved!==true||
      page.private===true||page.noindex===true||
      !Array.isArray(page.topics)||!safeText(page.anchor,3,100))continue;
    const overlap=page.topics.filter(t=>terms.has(norm(t))).length;
    if(overlap===0)continue;
    choices.push({language:lang,path:page.path,anchor:page.anchor,
      reason:'Verified topical overlap: '+overlap+' matching topics',
      relevance:overlap,reciprocalCandidate:page.allowReciprocal===true});
  }
  choices.sort((a,b)=>b.relevance-a.relevance||a.path.localeCompare(b.path));
  return Object.freeze(choices.slice(0,maxLinks).map(({relevance,...item})=>item));
}
export function reciprocalLinkProposal({sourcePage,destinationPage,reason}={}){
  assert(plain(sourcePage)&&plain(destinationPage)&&
    route(sourcePage.path)&&route(destinationPage.path)&&
    sourcePage.path!==destinationPage.path&&
    sourcePage.approved===true&&destinationPage.approved===true&&
    sourcePage.publicIndexable===true&&destinationPage.publicIndexable===true&&
    safeText(reason,10,300),'NEWS_RECIPROCAL_LINK_INVALID');
  return Object.freeze({source:sourcePage.path,destination:destinationPage.path,
    reason,requiresOwnerEditorialApproval:true,
    modifyExistingPageAutomatically:false});
}
