/** In-memory bounded news search model; storage/index adapters remain external. */
import {assert,plain,safeText} from './contracts.mjs';
const normalized=s=>s.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
  .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const words=s=>normalized(s).split(/\s+/).filter(x=>x.length>=2);
export function searchPublishedNews({query,articles,language='fa',
  category=null,country=null,afterUtc=null,beforeUtc=null,limit=20}={}){
  assert(safeText(query,2,160)&&Array.isArray(articles)&&articles.length<=5000&&
    ['fa','en'].includes(language)&&
    (category===null||safeText(category,2,60))&&
    (country===null||/^[A-Z]{2}$/.test(country))&&
    Number.isInteger(limit)&&limit>=1&&limit<=100,
    'NEWS_SEARCH_INVALID');
  const tokens=[...new Set(words(query))].slice(0,12);
  assert(tokens.length>0,'NEWS_SEARCH_NO_TERMS');
  const rows=[];
  for(const a of articles){
    if(!plain(a)||a.publicationState!=='PUBLISHED'||a.ownerApproved!==true||
      a.language!==language||(category!==null&&a.category!==category)||
      (country!==null&&a.country!==country))continue;
    if(afterUtc&&Date.parse(a.publishedAt)<Date.parse(afterUtc))continue;
    if(beforeUtc&&Date.parse(a.publishedAt)>Date.parse(beforeUtc))continue;
    const title=normalized(a.title??''),summary=normalized(a.summary??''),
      body=normalized(a.searchExcerpt??'');
    const score=tokens.reduce((n,t)=>n+(title.includes(t)?6:0)+
      (summary.includes(t)?3:0)+(body.includes(t)?1:0),0);
    if(score)rows.push({id:a.id,url:a.publicUrl,title:a.title,
      summary:a.summary,publishedAt:a.publishedAt,score});
  }
  rows.sort((a,b)=>b.score-a.score||String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return Object.freeze({query,language,count:rows.length,
    results:rows.slice(0,limit),searchPageIndexable:false});
}
