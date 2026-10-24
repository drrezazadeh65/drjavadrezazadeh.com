/**
 * Public bilingual exam-calendar page builder, source-only.
 * Only independently reviewed official dates with owner permission.
 * Does not create a new route, save data, send alerts or publish pages.
 */
import {assert,plain,safeText,utcInstant} from './contracts.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
const e=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/&/g,'\\u0026');
export function renderOfficialExamCalendar({events=[],locale='fa',
  publicRoute=null,nowUtc,siteReleaseApproved=false}={}){
  assert(Array.isArray(events)&&events.length<=3000&&
    ['fa','en'].includes(locale)&&utcInstant(nowUtc)&&
    typeof publicRoute==='string'&&
    publicRoute.startsWith('/'+locale+'/')&&
    /^\/(?:fa|en)\/[a-z0-9/-]+\/$/.test(publicRoute)&&
    siteReleaseApproved===true,
    'NEWS_CALENDAR_PUBLIC_RELEASE_NOT_APPROVED');
  const fa=locale==='fa';
  const approved=events.filter(x=>plain(x)&&
    x.schema==='jr.jrei.exam-event.v1'&&
    x.status==='OFFICIAL_DATE_REVIEWED'&&
    x.ownerPublicationApproved===true&&
    utcInstant(x.startsAt)&&
    Date.parse(x.startsAt)>=Date.parse(nowUtc))
    .sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const simplified=approved.map(x=>({
    eventId:x.eventId,examId:x.examId,type:x.milestone,
    title:x[fa?'titleFa':'titleEn'],startsAt:x.startsAt,
    sourceUrl:x.sourceUrl,version:x.version
  }));
  const copy=fa?{
    title:'تقویم هوشمند آزمون‌ها و مهلت‌های آموزشی',
    intro:'تاریخ‌های رسمی، تغییر مهلت‌ها و هشدارهای انتخابی شما',
    filter:'جست‌وجوی آزمون یا رویداد',
    month:'ماه رویداد',all:'همه ماه‌ها',
    source:'اطلاعیه رسمی',remind:'تنظیم هشدار',
    days:'روز پیش از رویداد',
    none:'رویداد تأییدشده‌ای مطابق انتخاب شما یافت نشد.',
    notice:'این تاریخ‌ها بر اساس منابع رسمی بررسی‌شده ارائه شده‌اند؛ پیش از اقدام، اطلاعیه اصلی را مطالعه کنید.'
  }:{
    title:'Smart Examination & Educational Deadline Calendar',
    intro:'Official dates, changed deadlines and your optional reminders',
    filter:'Search examinations and events',month:'Event month',all:'All months',
    source:'Official announcement',remind:'Set reminder',days:'Days before event',
    none:'No verified event matches the selected criteria.',
    notice:'These dates are based on reviewed official sources. Consult the original announcement before acting.'
  };
  const safeItems=json({schema:'jr.jrei.public-exam-calendar.v1',
    locale,events:simplified,serverGeneratedAt:nowUtc,
    allDatesVerifiedAgainstSourceAtPreparation:true});
  const html='<!doctype html><html lang="'+locale+'" dir="'+(fa?'rtl':'ltr')+
    '"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="index,follow"><title>'+e(copy.title)+'</title>'+
    '<meta name="description" content="'+e(copy.intro)+'">'+
    '<link rel="canonical" href="'+ORIGIN+publicRoute+'">'+
    '<link rel="stylesheet" href="/assets/css/news-intelligence.css">'+
    '</head><body class="ni-newsroom"><header class="ni-header">'+
    '<a href="/'+locale+'/">'+e(fa?'دکتر جواد رضازاده':'Dr. Javad Rezazadeh')+
    '</a></header><main class="ni-page ni-calendar-page">'+
    '<h1>'+e(copy.title)+'</h1><p class="ni-lead">'+e(copy.intro)+'</p>'+
    '<div data-ni-calendar data-ni-locale="'+locale+'">'+
    '<div class="ni-calendar-controls"><label>'+e(copy.filter)+
    '<input data-ni-calendar-filter type="search" maxlength="160"></label>'+
    '<label>'+e(copy.month)+'<select data-ni-calendar-month>'+
    '<option value="">'+e(copy.all)+'</option></select></label></div>'+
    '<p role="status" data-ni-calendar-status></p>'+
    '<div class="ni-calendar-events" data-ni-calendar-events></div></div>'+
    '<p class="ni-disclaimer">'+e(copy.notice)+'</p>'+
    '</main><script type="application/json" id="jrei-verified-calendar-data">'+
    safeItems+'</script>'+
    '<script defer src="/assets/js/news-calendar.js"></script></body></html>';
  return Object.freeze({schema:'jr.jrei.news-calendar-page.v1',
    canonical:ORIGIN+publicRoute,locale,eventCount:simplified.length,
    html,published:false,needsOriginalApprovedSitePublisher:true});
}
