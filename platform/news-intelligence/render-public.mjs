/**
 * Public bilingual NewsArticle page renderer: only signed-off content.
 * HTML is escaped; no raw markup from scraped sources or model output.
 * No filesystem writes, routing changes, build or publication.
 */
import {assert,plain,publicHttps,safeText,utcInstant} from './contracts.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const para=t=>String(t).trim().split(/\n\n+/).filter(Boolean)
  .map(p=>'<p>'+esc(p).replace(/\n/g,'<span class="ni-soft-break"> </span>')+'</p>').join('\n');
const validRoute=s=>typeof s==='string'&&
  /^\/(?:fa\/akhbar|en\/news-insights)\/[a-z0-9-]+\/$/.test(s);
const localAsset=s=>typeof s==='string'&&
  /^\/assets\/images\/[a-zA-Z0-9_\/.-]+\.(?:webp|png|jpe?g|avif)$/.test(s)&&
  !s.includes('..');
function jsonScript(value){return JSON.stringify(value).replace(/</g,'\\u003c')
  .replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');}
function linkList(items){
  return items.map(x=>'<li><a href="'+esc(x.path)+'">'+esc(x.anchor)+'</a></li>').join('');
}
export function renderPublicNewsPage({article,language,route,otherLanguageRoute,
  featuredImage,sourceTitle,publicationDate,modifiedDate,
  relatedLinks=[],publisherAuthorization=null,
  organization='JREI Education News & Intelligence'}={}){
  assert(plain(article)&&
    article.publicationState==='PUBLISHED'&&
    article.ownerApproved===true&&
    plain(publisherAuthorization)&&
    publisherAuthorization.source==='ORIGINAL_AUTHENTICATED_CMS'&&
    publisherAuthorization.exactStoredApprovalDigest===article.approvalDigest&&
    publisherAuthorization.sourceAndRightsRechecked===true&&
    publisherAuthorization.bilingualRouteReservationsVerified===true&&
    publisherAuthorization.publicActivationApproved===true&&
    publisherAuthorization.publishedByOriginalCms===true&&
    ['fa','en'].includes(language)&&validRoute(route)&&
    validRoute(otherLanguageRoute)&&route.startsWith('/'+language+'/')&&
    otherLanguageRoute.startsWith('/'+(language==='fa'?'en':'fa')+'/')&&
    localAsset(featuredImage)&&safeText(sourceTitle,3,160)&&
    utcInstant(publicationDate)&&utcInstant(modifiedDate)&&
    Date.parse(modifiedDate)>=Date.parse(publicationDate)&&
    Date.parse(publicationDate)<=Date.now()&&
    Array.isArray(relatedLinks)&&relatedLinks.length<=16,
    'NEWS_PUBLIC_RENDER_NOT_AUTHORIZED');
  const d=article[language];assert(plain(d)&&
    safeText(d.headline,8,180)&&safeText(d.description,40,320)&&
    safeText(d.summary,20,1000)&&safeText(d.body,40,30000)&&
    safeText(d.nextSteps,10,3000)&&safeText(d.imageAlt,5,300),
    'NEWS_PUBLIC_RENDER_CONTENT_INCOMPLETE');
  const official=publicHttps(article.sourceUrl);
  const internal=relatedLinks.filter(x=>plain(x)&&
    x.language===language&&validRoute(x.path)&&x.path!==route&&
    safeText(x.anchor,3,120));
  const canonical=ORIGIN+route, alternate=ORIGIN+otherLanguageRoute;
  const isFa=language==='fa';
  const label=isFa?{
    home:'خانه',news:'اخبار',source:'منبع رسمی خبر',next:'پس از این خبر چه کنیم؟',
    related:'مطالب مرتبط',assistant:'این خبر برای آینده آموزشی من چه معنایی دارد؟',
    assistantHelp:'سؤال خود را درباره این خبر از دستیار هوشمند JREI بپرسید.',
    official:'مشاهده منبع اصلی',updated:'آخرین به‌روزرسانی',disclaimer:
    'تاریخ‌ها و مقررات را پیش از هر اقدام با منبع رسمی تطبیق دهید.'
  }:{
    home:'Home',news:'News',source:'Official source',next:'What should I do next?',
    related:'Related reading',assistant:'What does this news mean for my educational future?',
    assistantHelp:'Ask the JREI educational assistant about this announcement.',
    official:'View original announcement',updated:'Updated',disclaimer:
    'Always confirm deadlines and regulations with the official issuing authority.'
  };
  const alternates={
    fa:isFa?canonical:alternate,en:isFa?alternate:canonical
  };
  const schema={'@context':'https://schema.org','@type':'NewsArticle',
    headline:d.headline,description:d.description,inLanguage:language,
    mainEntityOfPage:canonical,datePublished:publicationDate,
    dateModified:modifiedDate,image:[ORIGIN+featuredImage],
    publisher:{'@type':'Organization',name:organization,url:ORIGIN},
    isAccessibleForFree:true};
  const meta='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="index,follow,max-image-preview:large">'+
    '<title>'+esc(d.headline)+'</title><meta name="description" content="'+esc(d.description)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<link rel="alternate" hreflang="fa" href="'+esc(alternates.fa)+'">'+
    '<link rel="alternate" hreflang="en" href="'+esc(alternates.en)+'">'+
    '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(d.headline)+'">'+
    '<meta property="og:description" content="'+esc(d.description)+'">'+
    '<meta property="og:url" content="'+esc(canonical)+'">'+
    '<meta property="og:image" content="'+esc(ORIGIN+featuredImage)+'">'+
    '<meta name="twitter:card" content="summary_large_image">'+
    '<script type="application/ld+json">'+jsonScript(schema)+'</script>'+
    '<link rel="stylesheet" href="/assets/css/style.css">'+
    '<link rel="stylesheet" href="/assets/css/public-v2.css">'+
    '<link rel="stylesheet" href="/assets/css/jr-ecosystem-design-v2.css">'+
    '<link rel="stylesheet" href="/assets/css/news-intelligence.css">'+
    '<link rel="stylesheet" href="/assets/css/assistant.css">';
  const body='<a class="ni-skip" href="#ni-main">'+esc(isFa?'رفتن به محتوا':'Skip to content')+'</a>'+
    '<header class="ni-header"><a href="/'+language+'/">'+esc(isFa?'دکتر جواد رضازاده یزدلی':'Dr. Javad Rezazadeh')+'</a>'+
    '<nav aria-label="News"><a href="/'+language+'/">'+esc(label.home)+'</a>'+
    '<a href="'+(isFa?'/fa/akhbar/':'/en/news-insights/')+'">'+esc(label.news)+'</a></nav></header>'+
    '<main id="ni-main" class="ni-page"><article class="ni-article">'+
    '<nav class="ni-breadcrumb" aria-label="Breadcrumb"><a href="/'+language+'/">'+esc(label.home)+'</a>'+
    ' / <a href="'+(isFa?'/fa/akhbar/':'/en/news-insights/')+'">'+esc(label.news)+'</a></nav>'+
    '<header><p class="ni-kicker">'+esc(article.priority??'')+'</p>'+
    '<h1>'+esc(d.headline)+'</h1><p class="ni-lead">'+esc(d.summary)+'</p>'+
    '<time datetime="'+esc(publicationDate)+'">'+esc(publicationDate.slice(0,10))+'</time>'+
    ' · '+esc(label.updated)+' <time datetime="'+esc(modifiedDate)+'">'+esc(modifiedDate.slice(0,10))+'</time></header>'+
    '<figure><img src="'+esc(featuredImage)+'" alt="'+esc(d.imageAlt)+'" width="1600" height="900" loading="eager" decoding="async"></figure>'+
    '<div class="ni-body">'+para(d.body)+'</div>'+
    '<section class="ni-next"><h2>'+esc(label.next)+'</h2>'+para(d.nextSteps)+'</section>'+
    '<section class="ni-source"><h2>'+esc(label.source)+'</h2><p>'+esc(sourceTitle)+': '+
    '<a rel="noopener external" href="'+esc(official)+'">'+esc(label.official)+'</a></p></section>'+
    (internal.length?'<section class="ni-related"><h2>'+esc(label.related)+'</h2><ul>'+
      linkList(internal)+'</ul></section>':'')+
    '<section class="ni-assistant" data-jrei-news-context="'+esc(article.id??'')+'">'+
    '<h2>'+esc(label.assistant)+'</h2><p>'+esc(label.assistantHelp)+'</p>'+
    '<p class="ni-assistant-slot" data-jrei-existing-assistant-slot></p></section>'+
    '<p class="ni-disclaimer">'+esc(label.disclaimer)+'</p>'+
    '</article></main><script defer src="/assets/js/assistant.js"></script>'+ 
    '<script defer src="/assets/js/news-assistant.js"></script>';
  return Object.freeze({schema:'jr.jrei.rendered-article.v1',
    language,route,canonical,
    html:'<!doctype html><html lang="'+language+'" dir="'+(isFa?'rtl':'ltr')+
      '"><head>'+meta+'</head><body class="ni-newsroom">'+body+'</body></html>',
    publicationNotPerformed:true,ownerApproved:true,
    onlySourceHtmlGenerated:true,
    requiresApprovedExistingSitePublisher:true});
}
