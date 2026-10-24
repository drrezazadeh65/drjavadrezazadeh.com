/**
 * Publication-derived RSS and Google News sitemap XML generators.
 * Never includes an unpublished proposal or indexable private record.
 * Pure, no filesystem write, IndexNow ping or deployment.
 */
import {assert,plain,publicHttps,safeText,utcInstant} from './contracts.mjs';
const SITE='https://drjavadrezazadeh.com';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function normalizedPublicArticle(a,nowUtc){
  assert(plain(a)&&a.ownerApproved===true&&
    a.publicationState==='PUBLISHED'&&
    a.publisherReceiptVerified===true&&
    ['fa','en'].includes(a.language)&&
    safeText(a.title,8,180)&&safeText(a.summary,20,1000)&&
    utcInstant(a.publishedAt)&&
    Date.parse(a.publishedAt)<=Date.parse(nowUtc),
    'NEWS_XML_PUBLICATION_NOT_VERIFIED');
  const url=publicHttps(a.url);
  assert(url.startsWith(SITE+'/'+a.language+'/')&&
    !url.includes('?')&&!url.includes('#'),
    'NEWS_XML_CANONICAL_OUTSIDE_SITE');
  return Object.freeze({...a,url});
}
export function generateNewsRss({
  publishedArticles,nowUtc,language='fa',maxItems=50
}={}){
  assert(Array.isArray(publishedArticles)&&publishedArticles.length<=5000&&
    utcInstant(nowUtc)&&['fa','en'].includes(language)&&
    Number.isInteger(maxItems)&&maxItems>=1&&maxItems<=100,
    'NEWS_RSS_INPUT_INVALID');
  const list=publishedArticles.map(a=>normalizedPublicArticle(a,nowUtc))
    .filter(a=>a.language===language)
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
    .slice(0,maxItems);
  const channel=language==='fa'?'اخبار آموزش و آزمون‌ها | JREI':
    'JREI Education News & Intelligence';
  const root=language==='fa'?SITE+'/fa/akhbar/':SITE+'/en/news/';
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<rss version="2.0"><channel>'+
    '<title>'+esc(channel)+'</title><link>'+esc(root)+'</link>'+
    '<description>'+esc('Verified educational news, opportunities and official deadlines')+
    '</description><language>'+language+'</language>'+
    list.map(a=>'<item><title>'+esc(a.title)+'</title>'+
      '<link>'+esc(a.url)+'</link><guid isPermaLink="true">'+
      esc(a.url)+'</guid><pubDate>'+esc(new Date(a.publishedAt).toUTCString())+
      '</pubDate><description>'+esc(a.summary)+'</description></item>').join('')+
    '</channel></rss>';
  return Object.freeze({schema:'jr.jrei.news-rss.v1',language,xml,
    included:list.length,requiresOriginalFeedPublisher:true,
    publicationNotPerformed:true});
}
export function generateGoogleNewsSitemap({
  publishedArticles,nowUtc,publicationName='JREI Education News'
}={}){
  assert(Array.isArray(publishedArticles)&&publishedArticles.length<=5000&&
    utcInstant(nowUtc)&&safeText(publicationName,4,120),
    'NEWS_SITEMAP_INPUT_INVALID');
  const now=Date.parse(nowUtc);
  const eligible=publishedArticles.map(a=>normalizedPublicArticle(a,nowUtc))
    .filter(a=>now-Date.parse(a.publishedAt)<=48*3600000)
    .sort((a,b)=>a.url.localeCompare(b.url));
  const unique=[...new Map(eligible.map(a=>[a.url,a])).values()];
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '+
    'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'+
    unique.map(a=>'<url><loc>'+esc(a.url)+'</loc><news:news>'+
      '<news:publication><news:name>'+esc(publicationName)+
      '</news:name><news:language>'+a.language+
      '</news:language></news:publication>'+
      '<news:publication_date>'+esc(a.publishedAt)+
      '</news:publication_date><news:title>'+esc(a.title)+
      '</news:title></news:news></url>').join('')+'</urlset>';
  return Object.freeze({schema:'jr.jrei.news-sitemap.v1',
    xml,eligibleArticleCount:unique.length,
    recentOnly:true,notSubmittedToGoogle:true,
    existingNewsSitemapMustNotBeOverwrittenWithoutReview:true});
}
