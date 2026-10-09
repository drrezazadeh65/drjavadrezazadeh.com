/** External SEO integrations. No credentials stored and no automatic live-site changes. */
const sources=Object.freeze([
 {id:'pagespeed',label:'Google PageSpeed Insights',kind:'performance',auth:'optional-api-key',endpoint:'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'},
 {id:'gtmetrix',label:'GTmetrix',kind:'performance',auth:'server-side-api-key',endpoint:'https://gtmetrix.com/api/2.0'},
 {id:'google-search-central',label:'Google Search Central',kind:'guidance',url:'https://developers.google.com/search/docs'},
 {id:'web-dev',label:'web.dev',kind:'guidance',url:'https://web.dev/'},
 {id:'bing-webmaster',label:'Bing Webmaster Guidelines',kind:'guidance',url:'https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a'}
]);
export function seoSources(){return sources.map(x=>({...x}))}
export function pageSpeedRequest(siteUrl,{strategy='mobile',apiKey}={}){
 const target=new URL(siteUrl);if(!['https:','http:'].includes(target.protocol))throw Error('Unsupported URL scheme');
 if(!['mobile','desktop'].includes(strategy))throw Error('Invalid strategy');
 const url=new URL(sources[0].endpoint);url.searchParams.set('url',target.href);url.searchParams.set('strategy',strategy);
 for(const category of ['performance','accessibility','best-practices','seo'])url.searchParams.append('category',category);
 if(apiKey)url.searchParams.set('key',apiKey);
 return {url:url.href,method:'GET',secretInUrl:Boolean(apiKey)};
}
export function summarizePageSpeed(report){
 const categories=report?.lighthouseResult?.categories;if(!categories)throw Error('Invalid PageSpeed response');
 const scores={};for(const id of ['performance','accessibility','best-practices','seo'])scores[id]=typeof categories[id]?.score==='number'?Math.round(categories[id].score*100):null;
 return {scores,finalUrl:report.id??null,fetchedAt:report.analysisUTCTimestamp??null,source:'pagespeed',verifiedFromApi:true};
}
export function gtmetrixIntegrationStatus({serverProxyConfigured=false,credentialsConfigured=false}={}){
 return {source:'gtmetrix',ready:serverProxyConfigured&&credentialsConfigured,reason:!serverProxyConfigured?'Requires authenticated server-side proxy':!credentialsConfigured?'Requires API credentials':null,exposesCredentialsInBrowser:false};
}
export function researchFeed(items=[]){if(!Array.isArray(items))throw TypeError('Items must be an array');return items.filter(x=>x&&sources.some(s=>s.id===x.source&&s.kind==='guidance')&&/^https:\/\//.test(x.url??'')&&typeof x.title==='string').map(x=>({source:x.source,title:x.title,url:x.url,publishedAt:x.publishedAt??null,verified:false}));}
