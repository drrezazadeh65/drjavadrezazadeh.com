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
 block.append(heading,explanation,form,status,results);
 const existingForm=root.querySelector('.jr-kc-form');
 if(existingForm)root.insertBefore(block,existingForm);else root.append(block);
 let request=null,epoch=0;
 function reset(){
  epoch++;if(request)request.abort();request=null;submit.disabled=false;results.replaceChildren();
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();reset();const thisRequest=++epoch,controller=new AbortController();request=controller;submit.disabled=true;
  status.textContent=t('در حال بررسی داده‌های بازبینی‌شده…','Checking reviewed official records…');
  try{
   const params=new URLSearchParams({year:'1405',limit:'20',page:'1'});
   const needle=query.value.trim(),groupCode=group.value;
   if(needle.length>80)throw new Error('invalid_search');
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
    status.textContent=data.status==='OFFICIAL_CATALOGUE_NOT_READY'?
      t('کاتالوگ تأییدشده هنوز روی پایگاه داده آماده نشده است. فعلاً فقط پیش‌نویس شخصی قابل استفاده است.',
        'Approved catalogue is not yet available in the database. The personal draft remains usable.'):
      t('در این جست‌وجو هیچ رشته‌محل دارای تأیید منبع پیدا نشد.','No source-reviewed programme records matched this search.');
    return;
   }
   if(!Array.isArray(data.records)||data.records.length>50)throw new Error('invalid_official_record_set');
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
      node('p','',String(r.university||'')+(r.city?' · '+String(r.city):'')),
      node('p','',t('منبع: ','Source: ')+r.sourceDocument+
        t(' | ویرایش ',' | Revision ')+r.sourceRevision+
        t(' | صفحه PDF ',' | PDF page ')+r.sourcePdfPage),
      node('small','',t('کدرشته در کاتالوگ تأییدشده است؛ شرایط فردی و قبولی بررسی نشده‌اند.',
          'Catalogue record source-reviewed; individual eligibility and admission are not assessed.')));
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
    item.append(copy);results.append(item);
   }
   status.textContent=shown?
    t('نمایش '+shown+' رکورد دارای بازبینی منبع؛ بدون ارزیابی مجازبودن شخصی.',
      shown+' source-reviewed records shown; no personal eligibility determination.'):
    t('پاسخ کاتالوگ فاقد ردیف قابل نمایش با استناد کامل بود.','No fully sourced record could be displayed.');
  }catch(error){
   if(thisRequest===epoch&&error?.name!=='AbortError'){
    results.replaceChildren();
    status.textContent=t('داده تأییدشده در دسترس نیست؛ از پیش‌نویس شخصی استفاده کنید.',
      'Verified catalogue unavailable; the personal draft remains available.');
   }
  }finally{if(thisRequest===epoch){request=null;submit.disabled=false;}}
 });
 window.addEventListener('pagehide',()=>reset());
}
})();