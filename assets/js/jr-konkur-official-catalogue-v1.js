/* JR Konkur official catalogue explorer — read-only approved institutional facts only.
 * Extends the EXISTING Choice Studio workspace; no candidate data, scores or storage.
 * The back-end, not client-side JS, must enforce source-page and human review gates.
 */
(()=>{'use strict';
const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
for(const root of document.querySelectorAll('[data-konkur-selection]')){
 const fa=root.dataset.locale==='fa',t=(a,b)=>fa?a:b;
 const block=node('section','jr-kc-official-explorer');
 block.setAttribute('aria-label',t('جست‌وجوی کاتالوگ رسمی بازبینی‌شده','Search source-reviewed admission catalogue'));
 const heading=node('h3','',t('جست‌وجوی رشته‌محل‌های دارای تأیید منبع','Search source-reviewed programme locations'));
 const explanation=node('p','',t(
  'فقط رشته‌محل‌هایی نمایش داده می‌شوند که منبع، صفحه PDF و بازبینی انسانی آن‌ها در پایگاه داده تأیید شده باشد. جست‌وجو هیچ اطلاعات کارنامه‌ای ارسال نمی‌کند و قبولی را پیش‌بینی نمی‌کند.',
  'Only source-page and human-reviewed programme records are shown. Search does not send scorecards or predict admission.'));
 const form=node('form','jr-kc-catalogue-form');
 const label=node('label','',t('جست‌وجوی رشته یا دانشگاه (اختیاری)','Search programme or university (optional)'));
 const query=node('input','');query.type='search';query.maxLength=80;query.autocomplete='off';query.placeholder=t('عنوان عمومی رشته یا دانشگاه','Programme or university name');label.append(query);
 const groupLabel=node('label','',t('گروه آزمایشی','Examination group'));
 const group=node('select','');
 const values=[['',t('همه گروه‌ها','All groups')],['HUMANITIES',t('علوم انسانی','Humanities')],['EXPERIMENTAL_SCIENCES',t('علوم تجربی','Experimental sciences')],['MATHEMATICS',t('ریاضی و فنی','Mathematics')],['ARTS',t('هنر','Arts')],['FOREIGN_LANGUAGES',t('زبان‌های خارجی','Foreign languages')]];
 for(const [val,name] of values){const o=node('option','',name);o.value=val;group.append(o);}
 groupLabel.append(group);
 const submit=node('button','jr-kc-primary',t('جست‌وجوی داده‌های تأییدشده','Search verified catalogue'));submit.type='submit';
 form.append(label,groupLabel,submit);
 const status=node('p','jr-kc-catalogue-status',t('برای جست‌وجو، گروه یا عنوان مورد نظر را تعیین کنید.','Choose a group or title and search.'));status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const results=node('ul','jr-kc-catalogue-results');
 // Bounded progressive pagination: each request only reads a public,
 // approved, non-personal catalogue page. There is no fake total count.
 const pager=node('nav','jr-kc-catalogue-pager');
 pager.setAttribute('aria-label',t('صفحات کاتالوگ','Catalogue pages'));
 const previous=node('button','jr-kc-secondary',t('صفحه پیشین','Previous page'));
 previous.type='button';previous.disabled=true;
 const pageStatus=node('span','jr-kc-page-status','');
 pageStatus.setAttribute('aria-live','polite');
 const next=node('button','jr-kc-secondary',t('بررسی صفحه بعد','Check next page'));
 next.type='button';next.disabled=true;
 pager.append(previous,pageStatus,next);
 pager.hidden=true;
 block.append(heading,explanation,form,status,results,pager);
 const existingForm=root.querySelector('.jr-kc-form');
 if(existingForm)root.insertBefore(block,existingForm);else root.append(block);
 let request=null,epoch=0,currentPage=1,lastFilter=null;
 const PAGE_SIZE=20,MAX_PAGE=250;
 // Search is a PUBLIC GET route and can appear in origin request logs.
 // Reject obvious contact details before constructing its URL. This is
 // defensive hygiene, not a general-purpose personal-data classifier.
 function unsafePublicSearch(input){
  const value=String(input||'').normalize('NFKC');
  if(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)||
     /(?:https?:\/\/|www\.|\S+@\S+)/iu.test(value))return true;
  const ascii=value.replace(/[۰-۹٠-٩]/gu,ch=>{
    const cp=ch.codePointAt(0);
    return String(cp>=0x6f0?cp-0x6f0:cp-0x660);
  });
  const joined=ascii.replace(/[^\p{L}\p{N}]/gu,'');
  return /[0-9]{9,}/u.test(joined);
 }
 function reset(){
  epoch++;if(request)request.abort();request=null;
  submit.disabled=false;previous.disabled=true;next.disabled=true;
  results.replaceChildren();results.removeAttribute('aria-busy');
  pager.hidden=true;
 }
 // Changing a filter invalidates all earlier results, pagination and
 // evidence labels. Nothing is persisted in account, URL or browser storage.
 const changeFilter=()=>{
  if(!lastFilter)return;
  lastFilter=null;currentPage=1;reset();
  status.textContent=t('جست‌وجو تغییر کرد. دوباره جست‌وجو کنید.',
    'Search filters changed; submit a new search.');
 };
 query.addEventListener('input',changeFilter);
 group.addEventListener('change',changeFilter);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  lastFilter={query:query.value.trim(),group:group.value};
  loadPage(1);
 });
 previous.addEventListener('click',()=>{if(currentPage>1&&lastFilter)loadPage(currentPage-1);});
 next.addEventListener('click',()=>{if(currentPage<MAX_PAGE&&lastFilter)loadPage(currentPage+1);});
 async function loadPage(page){
  if(!lastFilter||!Number.isInteger(page)||page<1||page>MAX_PAGE)return;
  reset();
  const thisRequest=++epoch,controller=new AbortController();
  request=controller;submit.disabled=true;
  previous.disabled=true;next.disabled=true;
  results.setAttribute('aria-busy','true');
  const timeout=setTimeout(()=>controller.abort(),15000);
  status.textContent=t('در حال بررسی داده‌های بازبینی‌شده…','Checking reviewed official records…');
  try{
   const params=new URLSearchParams({year:'1405',limit:String(PAGE_SIZE),page:String(page)});
   const needle=lastFilter.query,groupCode=lastFilter.group;
   if([...needle].length>80||unsafePublicSearch(needle))
     throw new Error('unsafe_public_search');
   if(needle)params.set('q',needle);
   if(groupCode)params.set('group',groupCode);
   const response=await fetch('/api/konkur/programmes?'+params.toString(),{
    method:'GET',credentials:'omit',cache:'no-store',
    headers:{Accept:'application/json'},signal:controller.signal
   });
   if(!response.ok)throw new Error('catalogue_unavailable');
   const data=await response.json();
   if(thisRequest!==epoch||!root.isConnected)return;
   if(data?.ok!==true||data?.year!==1405||data?.admissionProbabilityEnabled!==false||
      data?.officialApplicationSubmitted!==false||data?.eligibilityAssessment!=='NOT_PERFORMED')
     throw new Error('invalid_official_data_contract');
   const ready=data.status==='SOURCE_REVIEWED_CATALOGUE'&&data.sourceVerification==='HUMAN_REVIEWED';
   if(!ready){
    currentPage=page;
    const pending=data.status==='OFFICIAL_CATALOGUE_NOT_READY';
    status.textContent=pending?
      t('کاتالوگ بازبینی‌شده هنوز آماده نشده است. پیش‌نویس شخصی همچنان در دسترس است.',
        'Source-reviewed catalogue is unavailable. The personal draft remains available.'):
      t('در این صفحه هیچ رشته‌محل بازبینی‌شده‌ای یافت نشد.',
        'No source-reviewed programme records on this page.');
    pager.hidden=pending||page===1;
    previous.disabled=pending||page===1;
    next.disabled=true;
    pageStatus.textContent=t('صفحه ','Page ')+String(page)+
      t(' · تعداد کل نامشخص است',' · total unknown');
    return;
   }
   if(!Array.isArray(data.records)||data.records.length>PAGE_SIZE
      ||data.page!==page||data.limit!==PAGE_SIZE)
     throw new Error('invalid_official_record_set');
   let shown=0;
   for(const r of data.records){
    if(r.year!==1405||typeof r.programmeCode!=='string'||!/^[0-9]{5}$/.test(r.programmeCode)||
       !Number.isInteger(r.sourcePdfPage)||r.sourcePdfPage<=0||
       typeof r.sourceDocument!=='string'||!r.sourceDocument.trim()||
       !Number.isInteger(r.sourceRevision)||r.sourceRevision<1||
       r.eligibilityStatus!=='NOT_ASSESSED'||r.officialRegistration!==false)continue;
    shown++;
    const item=node('li','jr-kc-catalogue-item');
    item.append(node('strong','',r.programmeCode+' — '+String(r.programme||'')),
      node('p','',String(r.university||'')+
        (r.campus?' · '+String(r.campus):'')+
        (r.city?' · '+String(r.city):'')),
      node('p','',t('سال منبع: ','Source cycle: ')+String(r.year)+
        t(' · منبع: ',' · Source: ')+r.sourceDocument+
        t(' · ویرایش ',' · Revision ')+r.sourceRevision+
        t(' · صفحه PDF ',' · PDF page ')+r.sourcePdfPage));
    const facts=node('dl','jr-kc-source-facts');
    // Missing source fields stay unknown; a proposed fee or capacity must
    // never be invented from current-year expectations or another provider.
    for(const [name,value] of [
      [t('نوع پذیرش ثبت‌شده','Recorded admission route'),r.admissionTrack],
      [t('مقطع ثبت‌شده','Recorded degree'),r.degree],
      [t('وضعیت شهریه در منبع','Source tuition category'),r.tuitionStatus],
      [t('ظرفیت مندرج در دفترچه','Guide-listed capacity'),r.capacity]
    ]){
      const term=node('dt','',name),val=node('dd','',
        value===null||value===undefined||value===''?
          t('نامشخص','Unknown'):String(value));
      facts.append(term,val);
    }
    item.append(facts,node('small','',t(
      'این اطلاعات متعلق به ویرایش بازبینی‌شده سال درج‌شده است، نه ظرفیت یا شهریه زنده. شرایط فردی، اصلاحیه‌ها و احتمال قبولی نیازمند بررسی جداگانه‌اند.',
      'Facts come from the reviewed edition and year shown, not live seat or tuition availability. Individual eligibility, amendments and admission chance require separate review.')));
    const copy=node('button','jr-kc-secondary',t('انتقال کد به پیش‌نویس','Copy code to draft'));
    copy.type='button';
    copy.addEventListener('click',()=>{
     const personalCode=root.querySelector('.jr-kc-form input');
     const personalNote=root.querySelectorAll('.jr-kc-form input')[1];
     if(!personalCode||!personalNote)return;
     personalCode.value=r.programmeCode;
     personalNote.value=(String(r.programme||'')+' — '+String(r.university||'')).slice(0,140);
     personalCode.focus();
     status.textContent=t('کد برای افزودن به پیش‌نویس آماده شد؛ بررسی فردی همچنان لازم است.',
       'Code copied for your draft; personal eligibility still requires separate review.');
    });
    // This is an explicit visitor action on PUBLIC verified-source text.
    // It never copies scores, identities, eligibility, private drafts or
    // supposed admission chances into the separate Choice Studio.
    const compare=node('button','jr-kc-secondary',t(
      'افزودن نام به مقایسه شخصی',
      'Add name to personal comparison'));
    compare.type='button';
    compare.addEventListener('click',()=>{
      const studio=document.querySelector('[data-choice-studio]');
      if(!studio){
        status.textContent=t('استودیوی انتخاب در این صفحه بارگذاری نشده است.',
          'Choice Studio is not available on this page.');
        return;
      }
      const nameFields=[...studio.querySelectorAll('.jr-cs-path input[type="text"]')];
      const input=nameFields.find(field=>!field.value.trim());
      if(!input){
        status.textContent=t(
          'هر دو نام در مقایسه شخصی پر شده‌اند. برای جلوگیری از حذف انتخاب قبلی، نام موردنظر را خودتان تغییر دهید.',
          'Both personal comparison names are filled. Change a name manually to preserve previous choices.');
        nameFields[0]?.focus();
        return;
      }
      input.value=(String(r.programme||'')+' — '+String(r.university||'')).slice(0,90);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      studio.scrollIntoView({behavior:'auto',block:'start'});
      input.focus({preventScroll:true});
      status.textContent=t(
        'فقط نام رشته و دانشگاه منتقل شد. وزن‌ها، مجازبودن و برآورد شما باید جداگانه تعیین شوند.',
        'Only the public programme and university name was copied. Priorities, eligibility and ratings remain separately assessed.');
    });
    item.append(copy,compare);results.append(item);
   }
   currentPage=page;
   pager.hidden=false;
   pageStatus.textContent=t('صفحه ','Page ')+String(page)+
     t(' · تعداد کل تأییدشده مشخص نیست',' · reviewed total unknown');
   previous.disabled=page===1;
   // Exactly PAGE_SIZE rows indicates that another page MAY exist, not
   // that it actually does. The button is intentionally "Check next page".
   next.disabled=data.records.length<PAGE_SIZE||page>=MAX_PAGE;
   status.textContent=shown?
    t('نمایش '+shown+' رکورد بازبینی‌شده از صفحه '+page+
      '؛ جمع کل نامشخص و مجازبودن فردی بررسی نشده است.',
      shown+' source-reviewed records from page '+page+
      '; total unknown and individual eligibility unassessed.'):
    t('پاسخ فاقد ردیف قابل نمایش با استناد کامل بود.',
      'No fully sourced record could be displayed.');
  }catch(error){
   if(thisRequest===epoch){
    results.replaceChildren();
    status.textContent=error?.message==='unsafe_public_search'?
      t('جست‌وجو فقط برای نام عمومی رشته یا دانشگاه است. اطلاعات شخصی، شماره تماس یا لینک وارد نکنید.',
        'Search public programmes and universities only; do not enter contact details, personal IDs or links.'):
      error?.name==='AbortError'?
      t('درخواست متوقف شد یا پاسخ دیر رسید. می‌توانید دوباره جست‌وجو کنید.',
        'The request was interrupted or timed out. You may search again.'):
      t('کاتالوگ بازبینی‌شده در دسترس نیست؛ پیش‌نویس شخصی همچنان قابل استفاده است.',
        'The source-reviewed catalogue is unavailable; the personal draft remains usable.');
   }
  }finally{
   clearTimeout(timeout);
   if(thisRequest===epoch){
    request=null;submit.disabled=false;
    results.removeAttribute('aria-busy');
   }
  }
 }
 window.addEventListener('pagehide',()=>{lastFilter=null;reset();});
}
})();