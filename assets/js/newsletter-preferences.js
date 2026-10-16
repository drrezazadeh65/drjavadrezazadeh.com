/* JR Newsletter v1 — native, first-party, verified account preferences only. */
(()=>{'use strict';
 const roots=[...document.querySelectorAll('[data-jr-newsletter]')];
 if(!roots.length)return;
 const lang=document.documentElement.lang==='en'?'en':'fa',fa=lang==='fa';
 const words={
  fa:{heading:'خبرنامه و اطلاع‌رسانی انتخابی',subheading:'موضوعات دلخواهتان را خودتان انتخاب کنید. تنها ایمیل تأییدشده حساب شما استفاده می‌شود.',
  consent:'با دریافت ایمیل‌های موضوعات انتخابی موافقم و می‌دانم می‌توانم هر زمان لغو کنم.',
  adult:'تأیید می‌کنم که ۱۸ سال یا بیشتر دارم.',
  save:'ذخیره ترجیحات',saving:'در حال ذخیره…',ready:'ترجیحات خبرنامه قابل مدیریت است.',
  pending:'ترجیحات ثبت می‌شوند؛ ارسال واقعی ایمیل هنوز در این سرور تأیید نشده است.',
  done:'ترجیحات با موفقیت ذخیره شد.',off:'عضویت موضوعی لغو شد.',
  failed:'ذخیره تأیید نشد؛ لطفاً دوباره تلاش کنید.',load:'در حال دریافت تنظیمات…'},
  en:{heading:'Email newsletter preferences',subheading:'Choose precisely which published updates you want. Only your verified account email is used.',
  consent:'I consent to receive updates for the selected topics and understand I can withdraw at any time.',
  adult:'I confirm that I am 18 or older.',
  save:'Save preferences',saving:'Saving…',ready:'Newsletter preferences are available.',
  pending:'Preferences can be recorded; actual email delivery is not yet verified on this host.',
  done:'Your preferences were saved.',off:'Topic subscriptions withdrawn.',
  failed:'Could not confirm the change. Please retry.',load:'Loading preferences…'}
 }[lang];
 const topics={
  ARTICLES:fa?'مقاله‌ها و مطالب تازه':'New articles and publications',
  BOOKS:fa?'کتاب‌ها و فروشگاه':'Books and bookstore',
  EVENTS:fa?'وبینارها و رویدادها':'Events and webinars',
  SERVICES:fa?'خدمات و مشاوره':'Services and consultations',
  GOLDEN_TALENT:'Golden Talent',
  JHELA:'JHELA'
 };
 const E=(name,className,text)=>{const el=document.createElement(name);if(className)el.className=className;if(text)el.textContent=text;return el;};
 let sharedCsrf='',deliveryActive=false;
 function responseError(){for(const root of roots){root.replaceChildren();root.hidden=true;}}
 const root=roots[0]; // one integrated account panel per dashboard
 const heading=E('h3','jr-newsletter-title',words.heading);
 const intro=E('p','jr-newsletter-intro',words.subheading);
 const status=E('p','jr-newsletter-status',words.load);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const form=E('form','jr-newsletter-form');
 const field=E('fieldset','jr-newsletter-topics'),legend=E('legend','',fa?'موضوعات مورد علاقه':'Topics of interest');
 field.append(legend);
 const selection=new Map();
 for(const [id,label] of Object.entries(topics)){
  const line=E('label','jr-newsletter-option');const box=E('input');box.type='checkbox';box.name='topic';box.value=id;
  line.append(box,document.createTextNode(label));field.append(line);selection.set(id,box);
 }
 const consents=E('div','jr-newsletter-consents');
 function checkLine(text){
  const label=E('label','jr-newsletter-check');const input=E('input');input.type='checkbox';
  label.append(input,document.createTextNode(text));consents.append(label);return input;
 }
 const consent=checkLine(words.consent),adult=checkLine(words.adult);
 const button=E('button','jr-newsletter-save',words.save);button.type='submit';
 const disclaimer=E('p','jr-newsletter-honesty','');
 form.append(field,consents,button);root.replaceChildren(heading,intro,status,form,disclaimer);
 function consentState(){
  const some=[...selection.values()].some(x=>x.checked);
  consents.hidden=!some;
  if(!some){consent.checked=false;adult.checked=false;}
 }
 for(const box of selection.values())box.addEventListener('change',consentState);
 async function request(method,body=null){
  const opts={method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(body!==null){opts.headers['Content-Type']='application/json';opts.headers['X-JR-Newsletter-CSRF']=sharedCsrf;opts.body=JSON.stringify(body);}
  const resp=await fetch('/api/newsletter/preferences',opts);
  if(!resp.ok)throw new Error('newsletter_http_'+resp.status);
  const data=await resp.json();
  if(data?.ok!==true||data?.schema!=='newsletter-preferences-v1')throw new Error('invalid_newsletter_response');
  return data;
 }
 async function init(){
  try{
   const health=await fetch('/api/newsletter/health',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!health.ok)throw new Error('newsletter_unavailable');
   const info=await health.json();
   if(info?.ok!==true||info?.ready!==true)throw new Error('newsletter_schema_not_ready');
   const data=await request('GET');
   if(data.emailVerified!==true||typeof data.csrfToken!=='string'||!/^[a-f0-9]{64}$/i.test(data.csrfToken)||
      !Array.isArray(data.selected)||!Array.isArray(data.topics)||data.consentVersion!=='newsletter-v1')throw new Error('invalid_account_newsletter');
   sharedCsrf=data.csrfToken;deliveryActive=data.deliveryActive===true;
   for(const [key,box] of selection){box.checked=data.selected.includes(key);box.disabled=!data.topics.includes(key);}
   consent.checked=false;adult.checked=false;consentState();
   status.textContent=words.ready;disclaimer.textContent=deliveryActive?'':words.pending;
   root.hidden=false;
  }catch(_){responseError();}
 }
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();
  const selected=[...selection].filter(([_,box])=>box.checked).map(([key])=>key);
  if(selected.length&&(!consent.checked||!adult.checked)){
   status.textContent=fa?'لطفاً رضایت آگاهانه و تأیید سن را مشخص کنید.':'Please confirm consent and adult age.';return;
  }
  button.disabled=true;button.textContent=words.saving;status.textContent=words.saving;
  try{
   const result=await request('POST',{topics:selected,consentVersion:'newsletter-v1',locale:lang,
    consentGiven:selected.length>0&&consent.checked,adultConfirmed:selected.length>0&&adult.checked});
   if(!Array.isArray(result.selected))throw new Error('confirmation_missing');
   status.textContent=result.selected.length?words.done:words.off;
   for(const [key,box] of selection)box.checked=result.selected.includes(key);
   consent.checked=false;adult.checked=false;consentState();
  }catch(_){status.textContent=words.failed;}
  finally{button.disabled=false;button.textContent=words.save;}
 });
 init();
})();