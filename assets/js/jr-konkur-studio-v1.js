/* JR Konkur workspace — extends Choice Studio, 1405 preliminary choices only.
 * No uploads, account access, storage, external calls or admission-probability claims.
 */
(()=>{'use strict';
 const F=window.JRKonkurFoundation;if(!F)return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const normalize=x=>String(x||'').replace(/[۰-۹٠-٩]/g,c=>{const v=c.codePointAt(0);return String(v>=0x6f0?v-0x6f0:v-0x660);}).trim();
 document.querySelectorAll('[data-konkur-selection]').forEach(root=>{
 const fa=root.dataset.locale==='fa',t=(a,b)=>fa?a:b;
 root.classList.add('jr-konkur-workspace');
 const heading=el('h3','',t('فهرست مقدماتی انتخاب رشته ۱۴۰۵','Preliminary Konkur 1405 selection list'));
 const guidance=el('p','jr-kc-intro',t(
 'کدرشته‌ها را از دفترچه‌های رسمی سازمان سنجش وارد کنید. فهرست شما صرفاً پیش‌نویس شخصی است؛ صحت کدها، تعداد مجاز انتخاب‌ها و شرایط پذیرش هنوز تطبیق داده نشده‌اند.',
 'Enter codes from the official Sanjesh guides. This is a personal preliminary draft; codes, selection limits and admission eligibility have not been verified.'));
 const form=el('form','jr-kc-form');
 const codeLabel=el('label','',t('کدرشته‌محل پنج‌رقمی','Five-digit programme code'));
 const code=el('input');code.type='text';code.inputMode='numeric';code.maxLength=5;code.autocomplete='off';code.required=true;codeLabel.append(code);
 const noteLabel=el('label','',t('عنوان رشته و دانشگاه (یادداشت اختیاری)','Programme/university (optional note)'));
 const note=el('input');note.type='text';note.maxLength=140;note.autocomplete='off';noteLabel.append(note);
 const groupLabel=el('label','',t('گروه آزمایشی','Examination group'));
 const group=el('select');[['',t('انتخاب نشده','Not selected')],['HUMANITIES',t('انسانی','Humanities')],['EXPERIMENTAL_SCIENCES',t('تجربی','Experimental')],['MATHEMATICS',t('ریاضی','Mathematics')],['ARTS',t('هنر','Arts')],['FOREIGN_LANGUAGES',t('زبان (منبع هنوز بررسی نشده)','Languages (source pending)')]].forEach(([value,label])=>{const option=el('option','',label);option.value=value;group.append(option);});groupLabel.append(group);
 const add=el('button','jr-kc-primary',t('افزودن انتخاب','Add choice'));add.type='submit';
 form.append(codeLabel,noteLabel,groupLabel,add);
 const status=el('p','jr-kc-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const count=el('p','jr-kc-count','');
 const filterLabel=el('label','jr-kc-filter-label',t('جست‌وجو در انتخاب‌های ثبت‌شده','Search your draft choices'));
 const filter=el('input','jr-kc-filter');filter.type='search';filter.maxLength=80;
 filter.autocomplete='off';filter.placeholder=t('کد رشته، عنوان یا گروه','Programme code, title or group');
 filterLabel.append(filter);
 const filterCount=el('p','jr-kc-filter-count','');filterCount.setAttribute('role','status');
 filterCount.setAttribute('aria-live','polite');
 const list=el('ol','jr-kc-list');
 const review=el('button','jr-kc-secondary jr-kc-review-draft',t('بازبینی پیش‌نویس پیش از ثبت','Review draft before official submission'));review.type='button';
 const reviewPanel=el('section','jr-kc-review-panel');reviewPanel.setAttribute('aria-live','polite');
 reviewPanel.setAttribute('aria-label',t('هشدارهای بررسی دستی پیش‌نویس','Manual verification cautions for the draft'));
 const print=el('button','jr-kc-secondary',t('چاپ گزارش مقدماتی','Print preliminary report'));print.type='button';
 const save=el('button','jr-kc-secondary jr-kc-save-draft',t('دریافت پیش‌نویس شخصی','Download private draft'));save.type='button';
 const fileLabel=el('label','jr-kc-import-label',t('انتخاب فایل پیش‌نویس قبلی (JSON)','Select previous draft file (JSON)'));
 const importFile=el('input','jr-kc-import-file');importFile.type='file';importFile.accept='.json,application/json';
 fileLabel.append(importFile);
 const preview=el('p','jr-kc-import-preview','');preview.setAttribute('role','status');preview.setAttribute('aria-live','polite');
 const apply=el('button','jr-kc-secondary jr-kc-apply-import',t('جایگزینی با فایل بررسی‌شده','Replace with reviewed file'));apply.type='button';apply.disabled=true;
 const clear=el('button','jr-kc-secondary',t('حذف همه انتخاب‌ها','Clear all'));clear.type='button';
 const buttons=el('div','jr-kc-actions');buttons.append(review,print,save,clear);
 const portable=el('div','jr-kc-portability');
 const portableNote=el('p','jr-kc-portability-note',t(
  'نسخه شخصی فقط با اقدام شما دانلود یا از فایل انتخاب‌شده بازیابی می‌شود. یادداشت‌ها ممکن است اطلاعات خصوصی شما را داشته باشند؛ فایل را محفوظ نگه دارید. پیش‌نمایش واردات چیزی را تغییر نمی‌دهد. محدودیت ۱۵۰ مورد فقط حفاظ فنی است، نه سقف رسمی انتخاب رشته.',
  'A private draft is downloaded or restored only when you act. Notes may contain personal information; protect the file. Previewing an import changes nothing. The 150-entry limit is only a local technical safeguard, NOT an official selection limit.'));
 portable.append(fileLabel,preview,apply,portableNote);
 const official=el('a','jr-kc-official',t('بررسی اطلاعیه‌های سازمان سنجش','Review official Sanjesh notices'));official.href='https://www.sanjesh.org/';official.rel='noopener noreferrer';official.target='_blank';
 const footer=el('p','jr-kc-note',t('هیچ اطلاعاتی ذخیره یا ارسال نمی‌شود. ورود نهایی به سامانه رسمی فقط توسط داوطلب انجام می‌شود.','No information is stored or sent. Candidates must submit their final lists themselves through the official system.'));
 const report=el('section','jr-kc-report');report.hidden=true;
 root.append(heading,guidance,form,status,count,filterLabel,filterCount,list,buttons,reviewPanel,portable,official,footer,report);
 let choices=[],pendingImport=null,importGeneration=0;
 const say=(a,b)=>{status.textContent=t(a,b);};
 const resetImport=()=>{pendingImport=null;apply.disabled=true;preview.textContent='';importFile.value='';importGeneration++;};
 function draw(){
  reviewPanel.replaceChildren();
  list.replaceChildren();
  count.textContent=t('تعداد انتخاب‌ها: ','Choices: ')+new Intl.NumberFormat(fa?'fa-IR':'en-US').format(choices.length);
  const filterActive=filter.value.trim().length>0;
  const visible=F.filterDraftChoices(choices,filter.value);
  filterCount.textContent=t('نمایش ','Showing ')+
   new Intl.NumberFormat(fa?'fa-IR':'en-US').format(visible.length)+
   t(' مورد از ',' of ')+
   new Intl.NumberFormat(fa?'fa-IR':'en-US').format(choices.length)+
   t(' انتخاب، بدون تغییر ترتیب اصلی.',' choices, preserving original order.')+
   (filterActive?t(' برای تغییر اولویت‌ها، جست‌وجو را پاک کنید.',
    ' Clear the search before changing preference order.'):'');
  if(!visible.length&&choices.length)
   list.append(el('li','jr-kc-filter-empty',t('نتیجه‌ای یافت نشد؛ جست‌وجو را پاک کنید.',
    'No matches; clear the search to see your choices.')));
  visible.forEach(({choice:c,index:i})=>{
   const row=el('li','jr-kc-item');row.dataset.choiceIndex=String(i);
   const details=el('div','jr-kc-item-details');
   details.append(el('strong','',(i+1)+'. '+c.code),el('p','',c.note||t('عنوان نامشخص','Unverified title')),
    el('small','',t('کد و شرایط پذیرش هنوز تأیید نشده‌اند.','Code and eligibility not yet verified.')));
   const controls=el('div','jr-kc-controls');
   const up=el('button','',t('↑ بالاتر','↑ Up'));up.type='button';up.disabled=filterActive||i===0;
   const down=el('button','',t('↓ پایین‌تر','↓ Down'));down.type='button';down.disabled=filterActive||i===choices.length-1;
   const remove=el('button','',t('حذف','Remove'));remove.type='button';
   up.setAttribute('aria-label',t('بالا بردن انتخاب ','Move choice up ')+(i+1));
   down.setAttribute('aria-label',t('پایین بردن انتخاب ','Move choice down ')+(i+1));
   remove.setAttribute('aria-label',t('حذف انتخاب ','Remove choice ')+(i+1));
   const move=to=>{const next=F.reorder(choices,i,to);if(!next)return;choices=next;draw();[...list.querySelectorAll('.jr-kc-item')].find(item=>item.dataset.choiceIndex===String(to))?.querySelector('button')?.focus();say('ترتیب انتخاب‌ها اصلاح شد.','Selection order updated.');};
   up.addEventListener('click',()=>move(i-1));down.addEventListener('click',()=>move(i+1));
   remove.addEventListener('click',()=>{choices.splice(i,1);draw();say('انتخاب حذف شد.','Choice removed.');});
   controls.append(up,down,remove);row.append(details,controls);list.append(row);
  });
 }
 function printReport(){
  if(!choices.length){say('ابتدا انتخابی وارد کنید.','Add a choice first.');return;}
  report.replaceChildren();
  report.append(el('h2','',t('گزارش مقدماتی انتخاب رشته ۱۴۰۵','Preliminary Konkur 1405 report')),
   el('p','',t('غیررسمی؛ بدون تأیید صحت کدرشته، احراز شرایط یا احتمال قبولی.','Unofficial; codes, eligibility and admission chances are NOT verified.')),
   el('p','',t('تاریخ تهیه: ','Generated: ')+new Date().toLocaleString(fa?'fa-IR':'en-GB')));
  const rows=el('ol');choices.forEach(c=>rows.append(el('li','',c.code+(c.note?' — '+c.note:''))));report.append(rows);
  const audit=F.inspectList(choices,{year:1405});
  report.append(el('p','',t('هشدار: تعداد مجاز انتخاب‌ها هنوز از مقررات رسمی تأیید نشده است.','Warning: maximum permitted choices has not been verified.')),
   el('p','',t('همه کدها باید در دفترچه رسمی و اصلاحیه‌های معتبر ۱۴۰۵ بررسی شوند.','Check all codes against applicable official 1405 guides and amendments.')),
   el('p','',t('تعداد هشدارهای ماشینی: ','Automated cautions: ')+audit.warnings.length));
  const readiness=F.reviewPreliminaryDraft(choices);
  report.append(el('h3','',t('چک‌لیست بازبینی رسمی (تکمیل‌نشده)','Official verification checklist (incomplete)')));
  const auditList=el('ul');
  const auditNotes=[
   t('اصالت و وجود همه کدرشته‌ها در آخرین دفترچه بررسی شود.','Check all programme codes against current official guides.'),
   t('اصلاحیه‌های معتبر و ضوابط خاص دانشگاه‌ها بررسی شود.','Review applicable amendments and institution-specific conditions.'),
   t('تعداد مجاز انتخاب‌ها در چرخه ۱۴۰۵ تأیید شود.','Verify the permitted selection count for the 1405 cycle.'),
   t('گروه، سهمیه، شرایط فردی و وضعیت مجازبودن انتخاب رشته با کارنامه رسمی تطبیق داده شود.',
     'Confirm group, quota, individual conditions and admission eligibility against the official scorecard.'),
   t('ارسال نهایی فقط در سامانه رسمی توسط داوطلب انجام شود.',
     'The candidate must submit the final list through the official system.')
  ];
  for(const message of auditNotes)auditList.append(el('li','',message));
  report.append(auditList,el('p','',t('وضعیت: نیازمند بررسی دستی رسمی · تعداد گروه‌های نامشخص: ',
   'Status: manual official verification required · unspecified exam groups: ')+
   new Intl.NumberFormat(fa?'fa-IR':'en-US').format(readiness.missingGroupCount)));
  report.hidden=false;root.classList.add('jr-kc-printing');window.print();
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();const value=normalize(code.value);
  if(!/^[0-9]{5}$/.test(value)){say('کد باید دقیقاً پنج رقم باشد.','Code must contain exactly five digits.');code.focus();return;}
  if(choices.some(x=>x.code===value)){say('این کدرشته تکراری است.','Duplicate programme code.');return;}
  if(choices.length>=150){say('سقف فنی پیش‌نویس موقت ۱۵۰ انتخاب است؛ این سقف رسمی نیست.','The local draft safety cap is 150 entries; this is not an official limit.');return;}
  choices.push({year:1405,code:value,note:note.value.trim().slice(0,140),group:group.value,source:null});
  code.value='';note.value='';draw();say('به پیش‌نویس افزوده شد؛ نیازمند تطبیق رسمی است.','Added to draft; official verification required.');code.focus();
 });
 save.addEventListener('click',()=>{
  const portableApi=window.JRKonkurChoicePortability;
  if(!portableApi){say('امکان دریافت فایل در دسترس نیست.','File export is unavailable.');return;}
  try{
   const result=portableApi.exportDraft(choices);
   const url=URL.createObjectURL(new Blob([result.json],{type:result.mediaType}));
   const link=el('a');link.href=url;link.download=result.filename;link.hidden=true;
   root.append(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1200);
   say('فایل موقت در دستگاه دریافت شد؛ هیچ داده‌ای به سرور ارسال نشد.',
    'Private draft downloaded locally; no data were sent to the server.');
  }catch{
   say('ابتدا یک پیش‌نویس معتبر ثبت کنید.','Create a valid draft first.');
  }
 });
 importFile.addEventListener('change',async()=>{
  const current=++importGeneration;
  pendingImport=null;apply.disabled=true;preview.textContent='';
  const file=importFile.files?.[0];if(!file)return;
  const portableApi=window.JRKonkurChoicePortability;
  if(!portableApi||file.size>portableApi.maximumFileBytes){
   preview.textContent=t('فایل نامعتبر یا بیش از حد مجاز است.','Invalid or oversized file.');return;
  }
  try{
   const text=await file.text();
   if(current!==importGeneration)return;
   const parsed=portableApi.importDraft(text);
   pendingImport=parsed.choices;apply.disabled=false;
   preview.textContent=t('فایل معتبر شناسایی شد. تعداد انتخاب‌ها: ','Valid file preview. Choices: ')+
    new Intl.NumberFormat(fa?'fa-IR':'en-US').format(parsed.count)+
    t('؛ جایگزینی فقط با دکمه زیر انجام می‌شود.','; nothing changes until you confirm below.');
  }catch{
   if(current!==importGeneration)return;
   pendingImport=null;apply.disabled=true;
   preview.textContent=t('فایل با قالب پیش‌نویس ۱۴۰۵ سازگار نیست.','File is not a supported preliminary 1405 draft.');
  }
 });
 apply.addEventListener('click',()=>{
  if(!pendingImport)return;
  choices=pendingImport.map(c=>({...c}));filter.value='';draw();resetImport();
  say('پیش‌نویس شخصی جایگزین شد. تأیید رسمی کدرشته‌ها همچنان لازم است.',
   'Personal draft replaced. Official programme codes still require verification.');
 });
 review.addEventListener('click',()=>{
  reviewPanel.replaceChildren();
  const audit=F.reviewPreliminaryDraft(choices);
  if(!audit.choiceCount){say('برای بازبینی ابتدا انتخابی ثبت کنید.','Add a choice before reviewing.');return;}
  reviewPanel.append(el('h4','',t('چک‌لیست بازبینی غیررسمی','Unofficial draft review checklist')),
   el('p','',t('این بررسی، وجود رشته‌محل یا احراز شرایط شما را تأیید نمی‌کند.',
    'This checklist does not verify programme existence or your eligibility.')));
  const items=[
   [audit.invalidCodeCount,audit.invalidCodeCount?
    t('کدهایی با قالب نادرست باید اصلاح شوند.','Fix codes with invalid formatting.'):
    t('قالب پنج‌رقمی کدها بررسی شد؛ اصالت کدها تأیید نشده است.',
      'Five-digit formatting checked; codes are not authenticated.')],
   [audit.duplicateCodeCount,t('انتخاب‌های تکراری را بررسی کنید.','Review duplicate choices.')],
   [audit.cycleMismatchCount,t('سال پذیرش انتخاب‌ها را بررسی کنید.','Review the admission cycle.')],
   [audit.missingGroupCount,t('گروه آزمایشی تعیین‌نشده را تکمیل و با دفترچه تطبیق دهید.',
    'Specify missing examination groups and check against the guide.')],
   [null,t('تمام کدرشته‌ها، ظرفیت‌ها، ضوابط و اصلاحیه‌ها باید با منابع رسمی سال جاری بررسی شوند.',
     'Verify every programme, capacity, condition and amendment in official sources.')],
   [null,t('سقف مجاز انتخاب‌ها و وضعیت مجازبودن داوطلب هنوز تأیید نشده است.',
     'Official selection limits and candidate eligibility are not established.')],
   [null,t('ثبت نهایی تنها توسط داوطلب در سامانه رسمی انجام می‌شود.',
     'Only the candidate can submit the final application through the official system.')]
  ];
  const list=el('ol','jr-kc-review-list');
  for(const [count,message] of items){
   if(count===0)continue;
   list.append(el('li','',count===null?message:
    new Intl.NumberFormat(fa?'fa-IR':'en-US').format(count)+' — '+message));
  }
  reviewPanel.append(list,el('small','',t(
   'وضعیت: نیازمند بررسی رسمی؛ این گزارش نتیجه پذیرش یا احتمال قبولی نیست.',
   'Status: official verification required; not an admission result or probability estimate.')));
  say('چک‌لیست غیررسمی آماده شد.','Unofficial checklist prepared.');
 });
 filter.addEventListener('input',draw);
 print.addEventListener('click',printReport);
 clear.addEventListener('click',()=>{choices=[];filter.value='';draw();resetImport();say('پیش‌نویس پاک شد.','Draft cleared.');});
 window.addEventListener('afterprint',()=>{report.hidden=true;root.classList.remove('jr-kc-printing');});
 window.addEventListener('pagehide',()=>{choices=[];pendingImport=null;report.replaceChildren();});
 draw();
 });
})();