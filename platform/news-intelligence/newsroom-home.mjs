/**
 * Premium bilingual education-news homepage renderer.
 * Approved public articles only; no speculative feeds or fake engagement.
 * Uses a client-side filter ONLY for the currently displayed story cards.
 */
import {assert,plain,safeText,utcInstant,publicHttps} from './contracts.mjs';
import {NEWS_CATEGORIES} from './taxonomy.mjs';
const SITE='https://drjavadrezazadeh.com';
const e=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const path=p=>typeof p==='string'&&/^\/(?:fa|en)\/[a-z0-9/-]+\/$/.test(p)&&
  !p.includes('//');
const asset=p=>typeof p==='string'&&
  /^\/assets\/images\/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg|avif)$/.test(p)&&
  !p.includes('..');
const escapeArr=arr=>arr.map(e);
function safeStory(s,lang){
  return plain(s)&&s.ownerApproved===true&&s.publicationState==='PUBLISHED'&&
    s.language===lang&&path(s.path)&&s.path.startsWith('/'+lang+'/')&&
    safeText(s.headline,8,180)&&safeText(s.summary,20,600)&&
    asset(s.featuredImage)&&safeText(s.imageAlt,5,300)&&
    utcInstant(s.publishedAt);
}
export function renderNewsroomHome({language='fa',stories=[],examEvents=[],
  currentUtc,siteReleaseApproved=false}={}){
  assert(['fa','en'].includes(language)&&Array.isArray(stories)&&
    stories.length<=300&&Array.isArray(examEvents)&&
    examEvents.length<=200&&utcInstant(currentUtc),
    'NEWS_HOME_INPUT_INVALID');
  assert(siteReleaseApproved===true,'NEWS_HOME_PUBLIC_RELEASE_NOT_APPROVED');
  const isFa=language==='fa',home='/'+language+'/',news=isFa?'/fa/akhbar/':'/en/news/';
  const copy=isFa?{
    brand:'مرکز هوشمند اخبار آموزش و آزمون‌ها',intro:'اطلاعیه‌های معتبر، تحلیل‌های آموزشی و مسیر اقدام پس از خبر',
    urgent:'خبر فوری',latest:'تازه‌ترین خبرها',calendar:'تقویم آزمون‌ها و مهلت‌ها',
    topics:'موضوعات خبری',search:'جست‌وجو در خبرهای نمایش‌داده‌شده',
    noMatch:'خبری در این فهرست با عبارت شما پیدا نشد.',
    more:'مطالعه خبر و راهنمای اقدام',source:'منبع رسمی',
    today:'امروز',privacy:'تنظیم خبرنامه و هشدارهای من',
    note:'برای تاریخ‌های حساس، اطلاعیه رسمی مرجع نهایی است.'
  }:{
    brand:'Education & Examination News Intelligence',
    intro:'Verified educational announcements, insights and practical next steps',
    urgent:'Breaking',latest:'Latest Education News',
    calendar:'Examination Calendar & Deadlines',
    topics:'News Topics',search:'Filter the stories shown on this page',
    noMatch:'No story in this list matches your search.',
    more:'Read story and practical guidance',source:'Official source',
    today:'Today',privacy:'My newsletter and reminders',
    note:'For consequential dates and regulations, the official issuing source is authoritative.'
  };
  const approved=stories.filter(s=>safeStory(s,language))
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const featured=approved.find(s=>s.priority==='P0')??approved[0]??null;
  const featuredId=featured?.id;
  const rest=approved.filter(s=>s.id!==featuredId).slice(0,48);
  const events=examEvents.filter(x=>plain(x)&&
    x.schema==='jr.jrei.exam-event.v1'&&
    x.status==='OFFICIAL_DATE_REVIEWED'&&
    x.ownerPublicationApproved===true&&utcInstant(x.startsAt)&&
    Date.parse(x.startsAt)>=Date.parse(currentUtc)&&
    safeText(isFa?x.titleFa:x.titleEn,8,220))
    .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt))
    .slice(0,12);
  const cards=rest.map(s=>'<article class="ni-card" data-ni-story>'+
    '<a href="'+e(s.path)+'"><img src="'+e(s.featuredImage)+
    '" alt="'+e(s.imageAlt)+'" width="800" height="450" loading="lazy">'+
    '<div class="ni-card-copy"><p class="ni-label">'+e(s.category??'')+
    '</p><h3>'+e(s.headline)+'</h3><p>'+e(s.summary)+
    '</p><time datetime="'+e(s.publishedAt)+'">'+e(s.publishedAt.slice(0,10))+
    '</time><span class="ni-action">'+e(copy.more)+'</span></div></a></article>').join('');
  const hero=featured?'<section class="ni-feature"><a href="'+e(featured.path)+'">'+
    '<img src="'+e(featured.featuredImage)+'" alt="'+e(featured.imageAlt)+'">'+
    '<div><span class="ni-tag">'+e(featured.priority==='P0'?copy.urgent:copy.latest)+
    '</span><h2>'+e(featured.headline)+'</h2><p>'+e(featured.summary)+'</p>'+
    '<span class="ni-action">'+e(copy.more)+'</span></div></a></section>':'';
  const calendar='<aside class="ni-calendar"><h2>'+e(copy.calendar)+'</h2>'+
    '<ul>'+events.map(x=>'<li><strong>'+e(x.startsAt.slice(0,10))+
      '</strong> <span>'+e(isFa?x.titleFa:x.titleEn)+'</span>'+
      '<a href="'+e(x.sourceUrl)+'" rel="noopener external">'+
      e(copy.source)+'</a></li>').join('')+'</ul>'+
    '<p class="ni-note">'+e(copy.note)+'</p></aside>';
  const categories='<nav class="ni-categories" aria-label="'+e(copy.topics)+'">'+
    NEWS_CATEGORIES.map(c=>'<span class="ni-category">'+e(isFa?c.fa:c.en)+
      '</span>').join('')+'</nav>';
  const template='<!doctype html><html lang="'+language+'" dir="'+(isFa?'rtl':'ltr')+
    '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="index,follow"><title>'+e(copy.brand)+'</title>'+
    '<meta name="description" content="'+e(copy.intro)+'">'+
    '<link rel="canonical" href="'+SITE+news+'">'+
    '<link rel="alternate" hreflang="fa" href="'+SITE+'/fa/akhbar/">'+
    '<link rel="alternate" hreflang="en" href="'+SITE+'/en/news/">'+
    '<link rel="stylesheet" href="/assets/css/news-intelligence.css">'+
    '</head><body class="ni-newsroom ni-home"><a class="ni-skip" href="#ni-home-main">'+
    e(isFa?'پرش به متن اصلی':'Skip to content')+'</a>'+
    '<header class="ni-header"><a href="'+home+'">'+e(copy.brand)+'</a>'+
    '<nav><a href="'+home+'">'+e(isFa?'خانه':'Home')+'</a>'+
    '<a href="'+news+'">'+e(isFa?'اخبار':'News')+'</a>'+
    '<a href="'+(isFa?'/fa/customer-dashboard/':'/en/account/')+'">'+
    e(copy.privacy)+'</a></nav></header>'+
    '<main id="ni-home-main" class="ni-home-shell">'+
    '<header class="ni-home-heading"><p class="ni-kicker">JREI NEWS INTELLIGENCE</p>'+
    '<h1>'+e(copy.brand)+'</h1><p>'+e(copy.intro)+'</p></header>'+
    categories+hero+'<section class="ni-archive-search" data-ni-archive-search data-ni-language="'+language+'"></section>'+
    '<div class="ni-home-columns"><section class="ni-news-feed">'+
    '<h2>'+e(copy.latest)+'</h2>'+
    '<label for="ni-filter">'+e(copy.search)+'</label>'+
    '<input id="ni-filter" data-ni-list-filter type="search" autocomplete="off" maxlength="160" placeholder="'+e(copy.search)+'">'+
    '<p data-ni-empty-result hidden>'+e(copy.noMatch)+'</p>'+
    '<div class="ni-grid" data-ni-news-cards>'+cards+'</div></section>'+
    calendar+'</div></main>'+
    '<script defer src="/assets/js/news-reader.js"></script>'+
    '<script defer src="/assets/js/news-search.js"></script></body></html>';
  return Object.freeze({schema:'jr.jrei.newsroom-home-render.v1',
    language,canonical:SITE+news,html:template,
    approvedStoryCount:approved.length,approvedCalendarCount:events.length,
    filterScope:'VISIBLE_CARDS_ONLY',
    publicationNotPerformed:true,requiresExistingApprovedPublisher:true});
}
