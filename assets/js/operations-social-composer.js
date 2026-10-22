/* Authenticated admin manual composer: verified public RSS items only, NEVER a sender. */
(() => {
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 const details=document.getElementById('ops-social-composer');
 const source=document.getElementById('social-source');
 const network=document.getElementById('social-network');
 const preview=document.getElementById('social-preview');
 const info=document.getElementById('social-compose-status');
 const produce=document.getElementById('social-compose');
 const copy=document.getElementById('social-copy');
 if(!workspace||!details||!source||!network||!preview||!info||!produce||!copy)return;
 const fa=document.documentElement.lang==='fa';
 const t=(f,e)=>fa?f:e;
 const origin='https://drjavadrezazadeh.com';
 const policies={
  instagram:{limit:1450,tags:5,media:true},
  facebook:{limit:900,tags:3},
  x:{limit:235,tags:2},
  telegram:{limit:1800,tags:3},
  eitaa:{limit:1700,tags:3},
  aparat:{limit:1100,tags:5,video:true},
  youtube:{limit:1800,tags:3,video:true},
  linkedin:{limit:1600,tags:3},threads:{limit:450,tags:2},
  bluesky:{limit:285,tags:2},pinterest:{limit:400,tags:3,media:true},
  tiktok:{limit:130,tags:4,video:true},mastodon:{limit:450,tags:3},
  discord:{limit:1500,tags:2},googlebusiness:{limit:750,tags:0}
 };
 const signals=[
  [/استعداد|talent/iu,'#استعدادیابی','#TalentDevelopment'],
  [/معلم|آموزش|education|teacher/iu,'#آموزش','#Education'],
  [/ارزیابی|سنجش|روایی|humanability|assessment/iu,'#سنجش_آموزشی','#EducationalAssessment'],
  [/پژوهش|دانشگاه|research/iu,'#پژوهش','#Research'],
  [/کتاب|نشر|book/iu,'#کتاب','#Books'],
  [/زبان|language/iu,'#آموزش_زبان','#LanguageEducation']
 ];
 let feed=[], generated=null, loadNonce=0;
 function note(s){info.textContent=s;}
 function safeArticle(u){
  try{
   const p=new URL(u);
   return p.origin===origin && /^\/(fa|en)\/(?!app\/|account\/|login\/|shop\/payment|customer-dashboard\/)[^?#]+/.test(p.pathname)
    && !p.username&&!p.password&&!p.hash&&!p.search;
  }catch{return false;}
 }
 function textTag(parent,tag){return parent.getElementsByTagName(tag)[0]?.textContent?.trim()||'';}
 async function loadSources(){
  if(workspace.hidden||!details.open)return;
  const current=++loadNonce;
  source.replaceChildren(new Option(t('در حال دریافت خبرها…','Loading public feed…'),''));
  produce.disabled=true;copy.disabled=true;generated=null;
  try{
   const r=await fetch('/feed.xml',{cache:'no-store',credentials:'same-origin',redirect:'error'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const xml=new DOMParser().parseFromString(await r.text(),'application/xml');
   if(xml.getElementsByTagName('parsererror').length)throw Error('Malformed RSS');
   const entries=[...xml.getElementsByTagName('item')].slice(0,100).map(item=>({
    title:textTag(item,'title'),url:textTag(item,'link'),description:textTag(item,'description')
   })).filter(x=>x.title&&safeArticle(x.url));
   if(current!==loadNonce||workspace.hidden)return;
   feed=entries;
   source.replaceChildren();
   if(!feed.length)throw Error('No eligible public RSS articles');
   for(let i=0;i<feed.length;i++){
    const o=document.createElement('option');o.value=String(i);
    o.textContent=feed[i].title;source.append(o);
   }
   produce.disabled=false;
   note(t('خوراک عمومی سایت بارگیری شد. قبل از کپی، کنونیکال مطلب بررسی می‌شود.',
     'Public feed loaded. The article canonical will be checked before copying.'));
  }catch(e){
   if(current!==loadNonce)return;
   source.replaceChildren(new Option(t('خوراک دردسترس نیست','Feed unavailable'),''));
   note(t('دریافت خوراک انجام نشد: ','Unable to load feed: ')+e.message);
  }
 }
 async function verifyArticle(item){
  if(!safeArticle(item.url))return false;
  const r=await fetch(item.url,{cache:'no-store',redirect:'error',credentials:'same-origin'});
  if(!r.ok||r.redirected)return false;
  const html=new DOMParser().parseFromString(await r.text(),'text/html');
  const can=html.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const robots=html.querySelector('meta[name="robots"]')?.getAttribute('content')||'';
  if(/noindex/i.test(robots))return false;
  try{const expected=new URL(item.url),actual=new URL(can||'',origin);
   return actual.origin===origin&&actual.pathname===expected.pathname && !actual.search&&!actual.hash;
  }catch{return false;}
 }
 const clipped=(s,max)=>{const v=Array.from(s);return v.length>max?v.slice(0,Math.max(0,max-1)).join('').trimEnd()+'…':s;};
 function draft(item,channel,campaign='editorial'){
  if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(campaign))throw Error('Invalid UTM campaign');
  const policy=policies[channel];if(!policy)throw Error('Network unavailable');
  const locale=new URL(item.url).pathname.startsWith('/en/')?'en':'fa';
  const p=new URL(item.url);
  p.searchParams.set('utm_source',channel);
  p.searchParams.set('utm_medium','social');
  p.searchParams.set('utm_campaign',campaign);
  const tags=signals.filter(a=>a[0].test(item.title+' '+item.description))
   .map(a=>locale==='en'?a[2]:a[1]).slice(0,policy.tags);
  const hashtagBlock=tags.length?'\n\n'+tags.join(' '):'';
  const suffix='\n\n'+(locale==='en'?'Read the full article:':'متن کامل را در وب‌سایت بخوانید:')+'\n'+p+hashtagBlock;
  const intro=item.title+'\n\n'+item.description;
  const body=clipped(intro,Math.max(0,policy.limit-Array.from(suffix).length))+suffix;
  const warning=policy.video?t('ویدئوی دارای حق نشر برای آپارات/یوتیوب لازم است.',
   'Rights-cleared video required for this network.'):policy.media?
   t('برای اینستاگرام رسانهٔ معتبر لازم است؛ لینک کپشن معمولاً کلیک‌پذیر نیست.',
    'Instagram requires approved media; caption links are usually not clickable.'):
   t('انتشار دستی و تأیید نهایی لازم است.','Manual publishing and final approval required.');
  return {body,warning,canonical:item.url,trackingUrl:p.toString()};
 }
 details.addEventListener('toggle',()=>{if(details.open&&!workspace.hidden)loadSources();});
 produce.addEventListener('click',async()=>{
  if(workspace.hidden)return;
  // Previews may await a permission read and canonical fetch. Invalidate
  // their pending outcome as soon as the owner signs out or changes source.
  const operation=++loadNonce;
  generated=null;copy.disabled=true;preview.value='';
  const item=feed[Number(source.value)],ch=network.value;
  if(!item||!policies[ch])return;
  produce.disabled=true;note(t('در حال تأیید آدرس عمومی مقاله…','Checking the public source article…'));
  try{
   // Server-authoritative owner preferences are consulted for each preview.
   // Preferences never authorize publishing or bypass article verification.
   const settingsRes=await fetch('/api/admin/operations/social/settings',{
     credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!settingsRes.ok)throw Error('admin_settings_unavailable');
   const settingsData=await settingsRes.json();
   if(!settingsData.ok||settingsData.schema!=='social-channel-settings-v1')
     throw Error('admin_settings_invalid');
   const options=settingsData.settings?.[ch]||null;
   if(options?.draftEnabled===false)throw Error('drafting_disabled_by_owner');
   const locale=new URL(item.url).pathname.startsWith('/en/')?'en':'fa';
   if(options?.draftLocale && options.draftLocale!=='both' && options.draftLocale!==locale)
     throw Error('article_language_not_in_channel_preferences');
   if(!await verifyArticle(item))throw Error('Article 200/indexability/self-canonical validation failed');
   if(workspace.hidden||operation!==loadNonce)return;
   generated=draft(item,ch,options?.utmCampaign||'editorial');
   preview.value=generated.body;
   copy.disabled=false;
   note(generated.warning+' '+t('این متن فقط پیش‌نویس است؛ هیچ پیامی ارسال نشده است.',
     'This is a draft; no message has been sent.'));
  }catch(e){
   if(!workspace.hidden&&operation===loadNonce)
     note(t('تأیید مقاله ناموفق بود: ','Source verification failed: ')+e.message);
  }finally{
   if(!workspace.hidden&&operation===loadNonce)produce.disabled=false;
  }
 });
 const invalidate=()=>{
  loadNonce++;generated=null;copy.disabled=true;preview.value='';
  note(t('برای محتوای جدید، دوباره پیش‌نمایش بسازید.','Generate a new preview for changed inputs.'));
 };
 source.addEventListener('change',invalidate);network.addEventListener('change',invalidate);
 copy.addEventListener('click',async()=>{
  if(workspace.hidden||!generated)return;
  try{
   await navigator.clipboard.writeText(preview.value);
   note(t('متن پیش‌نویس کپی شد؛ ارسال آن صرفاً دستی است.',
     'Draft copied. Publication remains an entirely manual action.'));
  }catch(e){note(t('کپی خودکار ممکن نشد؛ متن را انتخاب و کپی کنید.',
    'Clipboard unavailable. Select and copy the preview manually.'));}
 });
 const clearPrivateDraft=()=>{
  loadNonce++;feed=[];generated=null;source.replaceChildren();
  preview.value='';copy.disabled=true;produce.disabled=true;note('');
 };
 const observer=new MutationObserver(()=>{if(workspace.hidden)clearPrivateDraft();});
 observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
 workspace.addEventListener('jr:operations-locked',()=>{
  details.open=false;clearPrivateDraft();
 });
})();
