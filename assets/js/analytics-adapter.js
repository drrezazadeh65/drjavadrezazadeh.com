/* JR GA4/GTM adapter v2: one opt-in GTM loader, no direct gtag.js injection.
 * GTM container is owner-managed; all actual GA4 tags require consent
 * checks and a manual page_view mapping in GTM (automatic pageviews OFF).
 */
(()=>{
'use strict';
const CONFIG_URL='/assets/data/analytics-config.json';
const PROPERTY_ORIGIN='https://drjavadrezazadeh.com';
const state={config:null,ready:false,loaded:false,pageSent:false,started:false,ui:null,lastCheckout:0,clarityUi:null,claritySent:false};
const DENIED={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
const GRANTED={analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
const BLOCKED_SEGMENTS=new Set([
 'api','app','admin','account','customer-dashboard','assessments','assessment','observer','student',
 'guardian','dashboard','login','register','recover','bazyabi-hesab','checkout','cart','payment-start',
 'payment-return','payment-result','receipt','order','orders','profile','relationships','consents',
 'documents','reports','inbox','privacy','password','settings','callback','submission','submit'
]);
const isValid=config=>config?.enabled===true&&config.provider==='GA4'&&
 config.tag_transport==='GTM_ONLY'&&config.measurement_id==='G-C3C7NQQNWX'&&
 /^GTM-[A-Z0-9]{4,15}$/.test(String(config.gtm_container_id||''))&&
 config.consent?.required===true;
const locale=()=>document.documentElement.lang==='fa'?'fa':document.documentElement.lang==='en'?'en':'und';
const consentGranted=()=>{
 try{return localStorage.getItem(state.config?.consent?.storage_key||'jr-analytics-consent-v2')===
   (state.config?.consent?.granted_value||'granted');}catch(_){return false;}
};
const safeRoute=()=>{
 // Even GTM automatic session events could otherwise include the browser URL.
 // Do not inject any Google tag when the URL has query or fragment content.
 if((typeof location.search==='string'&&location.search.length>0)||
    (typeof location.hash==='string'&&location.hash.length>0))return null;
 const path=location.pathname;
 if(typeof path!=='string'||path.length>540||path.includes('//')||/%(?:2f|5c)/i.test(path))return null;
 let decoded;
 try{decoded=decodeURIComponent(path).normalize('NFC');}catch(_){return null;}
 if(decoded.length>180||decoded.includes('//'))return null;
 // Only ordinary public /fa/ or /en/ slugs; private account and form routes
 // are excluded, including when the path is percent-encoded.
 if(decoded!=='/'&&!/^\/(?:fa|en)\/(?:[\p{L}0-9_-]+\/){0,6}$/u.test(decoded))return null;
 const parts=decoded.toLowerCase().split('/').filter(Boolean);
 if(parts.some(part=>BLOCKED_SEGMENTS.has(part)||/[0-9]{5,}/.test(part)))return null;
 return decoded.split('/').map(encodeURIComponent).join('/');
};
const canTrack=()=>state.ready&&state.loaded&&consentGranted()&&safeRoute()!==null;

function gtag(){
 window.dataLayer.push(arguments);
}
function emit(event,attributes){
 if(!canTrack())return false;
 window.dataLayer.push(Object.assign({event,jr_locale:locale()},attributes));
 return true;
}
function pageView(){
 if(!canTrack()||state.pageSent)return false;
 const path=safeRoute();
 const sent=emit('jr_page_view',{
   page_path:path,page_location:PROPERTY_ORIGIN+path,page_referrer:'',jr_page_type:'public'
 });
 if(sent)state.pageSent=true;
 return sent;
}
function installGtm(){
 if(!state.ready||state.loaded||!consentGranted()||safeRoute()===null)return false;
 // Fail closed if another independent Google Tag or GTM container already exists.
 if(document.querySelector('script[src*="googletagmanager.com/"]')||
    document.querySelector('script[data-jr-analytics]'))return false;
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||gtag;
 window.gtag('consent','default',DENIED);
 window.gtag('consent','update',GRANTED);
 window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
 const script=document.createElement('script');
 script.async=true;
 script.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(state.config.gtm_container_id);
 script.dataset.jrAnalytics='gtm';
 document.head.appendChild(script);
 state.loaded=true;
 pageView();
 return true;
}
function safeCode(value,allowed){
 const text=typeof value==='string'?value:'';
 return allowed.includes(text)?text:null;
}
function sendIntent(detail){
 if(!canTrack())return;
 const key=safeCode(detail?.event_key,state.config.allowed_client_events||[]);
 const surface=typeof detail?.surface==='string'&&/^[a-z][a-z0-9_-]{0,39}$/i.test(detail.surface)?
   detail.surface:'unknown';
 const target=safeCode(detail?.target_kind,['ACTION','EMAIL','LINK']);
 if(!key||!target)return;
 // Ignore caller-supplied route, query, form values and all personal identifiers.
 emit('jr_intent',{intent_key:key,jr_surface:surface,jr_target_kind:target,
  page_path:safeRoute(),page_location:PROPERTY_ORIGIN+safeRoute(),page_referrer:''});
}
function beginCheckout(){
 if(!canTrack())return false;
 const now=Date.now();
 if(now-state.lastCheckout<2000)return false;
 state.lastCheckout=now;
 // Intent only; not a purchase. No cart items, price, transaction ID or PII.
 return emit('jr_begin_checkout',{page_path:safeRoute(),page_location:PROPERTY_ORIGIN+safeRoute(),page_referrer:''});
}
function viewItem(kind){
 const category=safeCode(kind,['book','academic_service','course']);
 if(!category)return false;
 return emit('jr_view_item',{jr_item_category:category,page_path:safeRoute(),
  page_location:PROPERTY_ORIGIN+safeRoute(),page_referrer:''});
}
/* Clarity is never loaded by source HTML. An explicitly reviewed GTM tag may
 * respond ONLY to this bounded event, after separate session-recording consent.
 * Keep production Clarity config disabled until masked-page and SPA tests pass.
 */
const clarityEligible=()=>{
 const c=state.config?.clarity;
 return c?.enabled===true&&c?.project_id==='z0mzp0dp74'&&
  c.delivery==='GTM_ONLY'&&c?.consent?.required===true&&
  c.consent.separate_from_ga4===true&&
  Array.isArray(c.allowlisted_public_routes)&&
  c.allowlisted_public_routes.includes(safeRoute())&&
  ['/fa/','/en/'].includes(safeRoute())&&
  !document.querySelector('form,input,textarea,[contenteditable]');
};
const clarityGranted=()=>{
 try{return localStorage.getItem(state.config.clarity.consent.storage_key)===
   state.config.clarity.consent.granted_value;}catch(_){return false;}
};
function clarityAllowed(){
 if(!canTrack()||!clarityEligible()||!clarityGranted()||state.claritySent)return false;
 const sent=emit('jr_clarity_allowed',{jr_clarity_project:'z0mzp0dp74',
  page_path:safeRoute(),page_location:PROPERTY_ORIGIN+safeRoute(),page_referrer:''});
 if(sent)state.claritySent=true;
 return sent;
}
function clarityConsentUpdate(granted){
 if(!clarityEligible()||!canTrack())return false;
 const c=state.config.clarity.consent;
 try{localStorage.setItem(c.storage_key,granted?c.granted_value:c.denied_value);}catch(_){return false;}
 if(granted)clarityAllowed();
 if(state.clarityUi)state.clarityUi.hidden=true;
 // A loaded recorder cannot be reliably unloaded from a dynamic document.
 // A full navigation prevents continued recording after withdrawal.
 if(!granted&&state.claritySent&&typeof location.reload==='function')location.reload();
 return true;
}
function clarityControl(){
 if(!clarityEligible()||!canTrack()||!document.body||state.clarityUi)return;
 const fa=locale()==='fa',bar=document.createElement('section');
 bar.dataset.jrClarityRecordingConsent='';
 bar.setAttribute('role','region');
 bar.setAttribute('aria-label',fa?'اجازه ضبط تعاملات عمومی':'Session recording preferences');
 bar.style.cssText='position:fixed;z-index:101;inset:auto 12px 74px;max-width:500px;margin-inline:auto;padding:14px 16px;border:1px solid #aa8b45;border-radius:14px;background:#181714;color:#f7f2e6;box-shadow:0 4px 18px #0008;font:inherit';
 const p=document.createElement('p');
 p.textContent=fa?'آیا اجازه ضبط تعاملات همین صفحه عمومی برای بهبود تجربه کاربری را می‌دهید؟ این مجوز جدا از آمار بازدید است. صفحات خصوصی و پاسخ‌های ارزیابی هرگز در این طرح ضبط نمی‌شوند.':
  'Allow session recording on this public landing page to improve usability? This is separate from analytics consent. Private pages and assessment responses are excluded.';
 const yes=document.createElement('button'),no=document.createElement('button');
 for(const button of [yes,no]){
  button.type='button';
  button.style.cssText='margin:6px 8px 0 0;padding:8px 13px;min-height:44px;border-radius:8px;cursor:pointer';
 }
 yes.textContent=fa?'اجازه ضبط می‌دهم':'Allow recording';
 no.textContent=fa?'اجازه نمی‌دهم':'Decline recording';
 yes.addEventListener('click',()=>clarityConsentUpdate(true));
 no.addEventListener('click',()=>clarityConsentUpdate(false));
 bar.append(p,yes,no);
 document.body.appendChild(bar);state.clarityUi=bar;
 let saved=null;
 try{saved=localStorage.getItem(state.config.clarity.consent.storage_key);}catch(_){}
 bar.hidden=saved===state.config.clarity.consent.granted_value||
  saved===state.config.clarity.consent.denied_value;
 const manage=document.createElement('button');
 manage.type='button';manage.dataset.jrClarityPreferences='';
 manage.textContent=fa?'تنظیمات ضبط جلسه':'Recording preferences';
 manage.style.cssText='position:fixed;z-index:100;inset:auto 12px 40px auto;padding:5px 8px;border-radius:8px;font:inherit';
 manage.addEventListener('click',()=>{bar.hidden=false;});
 document.body.appendChild(manage);
}
function consentUpdate(granted){
 if(!state.ready)return false;
 try{
  localStorage.setItem(state.config.consent.storage_key,
    granted?state.config.consent.granted_value:state.config.consent.denied_value);
 }catch(_){return false;}
 if(state.loaded&&typeof window.gtag==='function')
  window.gtag('consent','update',granted?GRANTED:DENIED);
 if(granted&&!state.loaded)installGtm();
 if(granted&&state.loaded)pageView();
 if(granted){clarityControl();clarityAllowed();}
 if(!granted&&state.claritySent&&typeof location.reload==='function')location.reload();
 if(state.ui)state.ui.hidden=true;
 return true;
}
function consentControl(){
 if(!state.ready||safeRoute()===null||!document.body)return;
 const isFa=locale()==='fa';
 const bar=document.createElement('section');
 bar.dataset.jrConsentNotice='';
 bar.setAttribute('role','region');
 bar.setAttribute('aria-label',isFa?'تنظیمات آمار بازدید':'Analytics choices');
 bar.style.cssText='position:fixed;z-index:99;inset:auto 12px 12px;max-width:500px;margin-inline:auto;padding:14px 16px;border:1px solid #aa8b45;border-radius:14px;background:#181714;color:#f7f2e6;box-shadow:0 4px 18px #0008;font:inherit';
 const p=document.createElement('p');
 p.textContent=isFa?
  'اجازه می‌دهید آمار ناشناس بازدیدهای عمومی با گوگل آنالیتیکس بررسی شود؟ بدون اجازه، هیچ برچسب تحلیلی بارگذاری نمی‌شود.':
  'Allow anonymous analytics for public pages? No analytics tag loads without your permission.';
 const yes=document.createElement('button');
 const no=document.createElement('button');
 for(const button of [yes,no]){
  button.type='button';
  button.style.cssText='margin:6px 8px 0 0;padding:8px 13px;min-height:44px;border-radius:8px;cursor:pointer';
 }
 yes.textContent=isFa?'می‌پذیرم':'Allow analytics';
 no.textContent=isFa?'نمی‌پذیرم':'Decline';
 yes.addEventListener('click',()=>consentUpdate(true));
 no.addEventListener('click',()=>consentUpdate(false));
 bar.append(p,yes,no);
 document.body.appendChild(bar);
 state.ui=bar;
 let saved=null;
 try{saved=localStorage.getItem(state.config.consent.storage_key);}catch(_){}
 bar.hidden=saved===state.config.consent.granted_value||saved===state.config.consent.denied_value;
 const preferences=document.createElement('button');
 preferences.type='button';
 preferences.dataset.jrAnalyticsPreferences='';
 preferences.textContent=isFa?'تنظیمات آمار بازدید':'Analytics preferences';
 preferences.style.cssText='position:fixed;z-index:98;inset:auto 12px 8px auto;padding:5px 8px;border-radius:8px;font:inherit';
 preferences.addEventListener('click',()=>{bar.hidden=false;});
 document.body.appendChild(preferences);
}
async function init(){
 if(state.started)return;
 state.started=true;
 try{
  const response=await fetch(CONFIG_URL,{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)return;
  const config=await response.json();
  state.config=config;
  state.ready=isValid(config);
  if(!state.ready)return;
  if(consentGranted())installGtm();
  consentControl();
  clarityControl();
  clarityAllowed();
 }catch(_){}
}
window.addEventListener('JR_CONVERSION_INTENT',event=>sendIntent(event.detail||{}));
window.JRAnalyticsConsent={
 status:()=>state.ready&&consentGranted(),
 grant:()=>consentUpdate(true),
 deny:()=>consentUpdate(false)
};
window.JRClarityConsent=Object.freeze({
 status:()=>clarityEligible()&&canTrack()&&clarityGranted(),
 grant:()=>clarityConsentUpdate(true),
 deny:()=>clarityConsentUpdate(false)
});
window.JRAnalytics=Object.freeze({
 pageView,viewItem,beginCheckout,
 // Completion events are intentionally not exported to the browser. Payment,
 // registration, lead and newsletter success require verified server evidence.
});
init();
})();
