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
 const heading=el('h2','',t('فهرست مقدماتی انتخاب رشته ۱۴۰۵','Preliminary Konkur 1405 selection list'));
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
 const list=el('ol','jr-kc-list');
 const print=el('button','jr-kc-secondary',t('چاپ گزارش مقدماتی','Print preliminary report'));print.type='button';
 const clear=el('button','jr-kc-secondary',t('حذف همه انتخاب‌ها','Clear all'));clear.type='button';
 const buttons=el('div','jr-kc-actions');buttons.append(print,clear);
 const official=el('a','jr-kc-official',t('بررسی اطلاعیه‌های سازمان سنجش','Review official Sanjesh notices'));official.href='https://www.sanjesh.org/';official.rel='noopener noreferrer';official.target='_blank';
 const footer=el('p','jr-kc-note',t('هیچ اطلاعاتی ذخیره یا ارسال نمی‌شود. ورود نهایی به سامانه رسمی فقط توسط داوطلب انجام می‌شود.','No information is stored or sent. Candidates must submit their final lists themselves through the official system.'));
 const report=el('section','jr-kc-report');report.hidden=true;
 root.append(heading,guidance,form,status,count,list,buttons,official,footer,report);
 let choices=[];const say=(a,b)=>{status.textContent=t(a,b);};
 function draw(){
  list.replaceChildren();
  count.textContent=t('تعداد انتخاب‌ها: ','Choices: ')+new Intl.NumberFormat(fa?'fa-IR':'en-US').format(choices.length);
  choices.forEach((c,i)=>{
   const row=el('li','jr-kc-item');
   const details=el('div','jr-kc-item-details');
   details.append(el('strong','',(i+1)+'. '+c.code),el('p','',c.note||t('عنوان نامشخص','Unverified title')),
    el('small','',t('کد و شرایط پذیرش هنوز تأیید نشده‌اند.','Code and eligibility not yet verified.')));
   const controls=el('div','jr-kc-controls');
   const up=el('button','',t('↑ بالاتر','↑ Up'));up.type='button';up.disabled=i===0;
   const down=el('button','',t('↓ پایین‌تر','↓ Down'));down.type='button';down.disabled=i===choices.length-1;
   const remove=el('button','',t('حذف','Remove'));remove.type='button';
   up.setAttribute('aria-label',t('بالا بردن انتخاب ','Move choice up ')+(i+1));
   down.setAttribute('aria-label',t('پایین بردن انتخاب ','Move choice down ')+(i+1));
   remove.setAttribute('aria-label',t('حذف انتخاب ','Remove choice ')+(i+1));
   const move=to=>{const next=F.reorder(choices,i,to);if(!next)return;choices=next;draw();list.querySelectorAll('.jr-kc-item')[to]?.querySelector('button')?.focus();say('ترتیب انتخاب‌ها اصلاح شد.','Selection order updated.');};
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
  report.hidden=false;root.classList.add('jr-kc-printing');window.print();
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();const value=normalize(code.value);
  if(!/^[0-9]{5}$/.test(value)){say('کد باید دقیقاً پنج رقم باشد.','Code must contain exactly five digits.');code.focus();return;}
  if(choices.some(x=>x.code===value)){say('این کدرشته تکراری است.','Duplicate programme code.');return;}
  choices.push({year:1405,code:value,note:note.value.trim().slice(0,140),group:group.value,source:null});
  code.value='';note.value='';draw();say('به پیش‌نویس افزوده شد؛ نیازمند تطبیق رسمی است.','Added to draft; official verification required.');code.focus();
 });
 print.addEventListener('click',printReport);
 clear.addEventListener('click',()=>{choices=[];draw();say('پیش‌نویس پاک شد.','Draft cleared.');});
 window.addEventListener('afterprint',()=>{report.hidden=true;root.classList.remove('jr-kc-printing');});
 window.addEventListener('pagehide',()=>{choices=[];report.replaceChildren();});
 draw();
 });
})();