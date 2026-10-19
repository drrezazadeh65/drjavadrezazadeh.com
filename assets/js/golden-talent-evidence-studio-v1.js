/* Golden Talent Evidence Studio — adult-only, in-memory, NON-SCORED educational reflection.
 * Does not infer a talent, save an account, collect minor records or upload form values.
 */
(()=>{
'use strict';
const root=document.querySelector('[data-gt-evidence-studio]');
if(!root)return;
const form=root.querySelector('[data-gt-evidence-form]');
const list=root.querySelector('[data-gt-evidence-list]');
const add=root.querySelector('[data-gt-evidence-add]');
const counter=root.querySelector('[data-gt-evidence-count]');
const summary=root.querySelector('[data-gt-evidence-summary]');
const feedback=root.querySelector('[data-gt-evidence-feedback]');
const clear=root.querySelector('[data-gt-evidence-clear]');
const copy=root.querySelector('[data-gt-evidence-copy]');
const print=root.querySelector('[data-gt-evidence-print]');
if(!form||!list||!add||!counter||!summary||!feedback||!clear||!copy||!print)return;
const fa=document.documentElement.lang==='fa';
const t=fa?{
 ready:'کاربرگ آماده است. هیچ داده‌ای به سرور ارسال یا در مرورگر ذخیره نمی‌شود.',
 invalid:'پیش از تهیه مرور، یک پرسش آموزشی مشخص وارد کنید.',
 full:'برای این کاربرگ حداکثر شش شاهد قابل ثبت است.',
 source:'منبع شاهد',observation:'مشاهده واقعی',reliability:'محدودیت شاهد',
 delete:'حذف شاهد',note:'شاهد',unknown:'هنوز نامشخص',
 fields:{question:'پرسش آموزشی',context:'زمینه و فرصت',alternatives:'تفسیرهای رقیب یا شواهد مخالف',action:'تجربه کم‌خطر بعدی',review:'زمان و معیار بازبینی'},
 headings:{sources:'شواهد با منشأ مشخص',known:'آنچه واقعاً مشاهده شده',interpreted:'احتمال‌ها، نه نتیجه قطعی',
 limits:'نااطمینانی و شواهد ناکافی',action:'اقدام قابل بازبینی'},
 evidenceEmpty:'هنوز هیچ شاهدی ثبت نشده؛ نتیجه‌گیری درباره استعداد مجاز نیست.',
 caution:'این مرور، نمره استعداد، تشخیص، رتبه‌بندی یا توصیه قطعی تحصیلی نیست. ثبت نام، عکس، مشخصات دانش‌آموز یا هر داده خصوصی دیگری مجاز نیست.',
 created:'مرور آموزشیِ بدون نمره ساخته شد؛ مشاهده و تفسیر از هم جدا مانده‌اند.',
 deleted:'همه ورودی‌ها و خروجی‌های این صفحه پاک شدند.',
 copied:'مرور کپی شد؛ محل نگهداری یا ارسال آن را خودتان کنترل کنید.',
 copyError:'کپی خودکار ممکن نشد. متن مرور را انتخاب و به‌صورت دستی کپی کنید.'
}:{
 ready:'Worksheet ready. Your entries are never uploaded or saved by this tool.',
 invalid:'Enter a specific educational question before creating a review.',
 full:'This worksheet holds at most six pieces of evidence.',
 source:'Evidence source',observation:'What was actually observed',reliability:'Limits of this observation',
 delete:'Remove evidence',note:'Evidence',unknown:'Not established',
 fields:{question:'Educational question',context:'Context and opportunity',alternatives:'Alternative explanations or contradictory evidence',action:'A low-stakes next step',review:'Review time and criterion'},
 headings:{sources:'Evidence with identifiable provenance',known:'Observations, not labels',
 interpreted:'Tentative interpretations only',limits:'Uncertainty and missing evidence',action:'Revisable next step'},
 evidenceEmpty:'No evidence has been recorded. No talent conclusion can be drawn.',
 caution:'This is not a talent score, diagnosis, rank or definitive educational prescription. Do not enter names, photos, learner IDs or other private pupil data.',
 created:'Unscored educational review prepared. Observations and interpretations remain separate.',
 deleted:'All inputs and results were cleared from this page.',
 copied:'Review copied. You decide where to store or share it.',
 copyError:'Automatic copy was unavailable. Select and copy the review text manually.'
};
const sources=fa?[
 ['LEARNER_SELF','روایت و تجربه خود یادگیرنده'],
 ['PARENT','مشاهده والد (غیرشناسه‌دار)'],
 ['TEACHER','مشاهده معلم (غیرشناسه‌دار)'],
 ['PERFORMANCE','نمونه عملکرد یا تکلیف'],
 ['RECORD','الگوی سوابق (بدون نمره و شناسه شخصی)'],
 ['CONTEXT','زمینه، فرصت و امکانات']
]:[
 ['LEARNER_SELF','Learner voice and experience'],
 ['PARENT','Parent observation (anonymous)'],
 ['TEACHER','Teacher observation (anonymous)'],
 ['PERFORMANCE','Learning or performance sample'],
 ['RECORD','Recorded pattern (no personal record)'],
 ['CONTEXT','Context and opportunity']
];
const maxEvidence=6;
const maxLen=350;
let serial=0;
let last='';
function make(tag,text,cls){
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=String(text);
 if(cls)n.className=cls;
 return n;
}
function val(input){return String(input?.value||'').trim().slice(0,maxLen)}
function notice(message){feedback.textContent=message}
function resetOutput(){
 last='';
 summary.replaceChildren();
 summary.hidden=true;
 copy.hidden=true;
 print.hidden=true;
}
function count(){
 const n=list.querySelectorAll('[data-gt-evidence-item]').length;
 counter.textContent=n+' / '+maxEvidence;
 add.disabled=n>=maxEvidence;
}
function labelInput(labelText,input){
 const label=make('label',undefined,'jr-gt-field');
 label.append(make('span',labelText),input);
 return label;
}
function textField(tag,name,rows=2){
 const input=document.createElement(tag);
 input.name=name;
 input.maxLength=maxLen;
 input.autocomplete='off';
 if(tag==='textarea')input.rows=rows;
 if(tag==='input')input.type='text';
 return input;
}
function addEvidence(){
 if(list.querySelectorAll('[data-gt-evidence-item]').length>=maxEvidence){
  notice(t.full);return;
 }
 const id=++serial;
 const item=make('fieldset',undefined,'jr-gt-evidence-item');
 item.setAttribute('data-gt-evidence-item',String(id));
 item.append(make('legend',t.note+' '+String(id).padStart(2,'0')));
 const area=make('div',undefined,'jr-gt-field-grid');
 const type=document.createElement('select');
 type.name='source-'+id;
 for(const [code,title] of sources){
  const option=make('option',title);
  option.value=code;type.append(option);
 }
 area.append(labelInput(t.source,type));
 area.append(labelInput(t.observation,textField('textarea','observation-'+id)));
 area.append(labelInput(t.reliability,textField('textarea','limit-'+id)));
 const remove=make('button',t.delete,'jr-bahar-action jr-bahar-action--quiet');
 remove.type='button';
 remove.setAttribute('data-gt-evidence-remove','');
 remove.addEventListener('click',()=>{item.remove();count();resetOutput()});
 item.append(area,remove);
 list.append(item);count();
 type.focus();
}
function evidence(){
 return [...list.querySelectorAll('[data-gt-evidence-item]')].map(item=>{
  const select=item.querySelector('select');
  const option=sources.find(([code])=>code===select?.value);
  return {source:option?.[1]||t.unknown,
    observation:val(item.querySelector('textarea[name^="observation-"]')),
    limit:val(item.querySelector('textarea[name^="limit-"]'))};
 }).filter(x=>x.observation||x.limit);
}
function summaryLine(parent,label,textValue){
 const box=make('section',undefined,'jr-gt-summary-row');
 box.append(make('h4',label));
 box.append(make('p',textValue||t.unknown));
 parent.append(box);
}
function build(){
 const names=['question','context','alternatives','action','review'];
 const input=Object.fromEntries(names.map(name=>[name,val(form.elements.namedItem(name))]));
 if(!input.question){
  resetOutput();notice(t.invalid);form.elements.namedItem('question')?.focus();return;
 }
 const records=evidence();
 const panel=make('div',undefined,'jr-gt-summary');
 panel.append(make('h3',fa?'نقشه شواهد و تصمیم قابل بازبینی':'Evidence map and revisable learning plan'));
 summaryLine(panel,t.fields.question,input.question);
 const section=make('section',undefined,'jr-gt-summary-row');
 section.append(make('h4',t.headings.sources));
 const ordered=make('ol');
 for(const record of records){
  const row=make('li');
  row.append(make('strong',record.source+': '));
  row.append(make('span',record.observation||t.unknown));
  if(record.limit)row.append(make('small',(fa?' · محدودیت: ':' · limitation: ')+record.limit));
  ordered.append(row);
 }
 section.append(records.length?ordered:make('p',t.evidenceEmpty));
 panel.append(section);
 summaryLine(panel,t.fields.context,input.context);
 summaryLine(panel,t.headings.interpreted,input.alternatives);
 summaryLine(panel,t.headings.action,input.action);
 summaryLine(panel,t.fields.review,input.review);
 // Repeated observations from one provenance are not independent sources.
 // Missing observation text and unexamined rival explanations remain explicit
 // evidence limits; neither can be converted into an aptitude claim.
 const observed=records.filter(r=>r.observation);
 const distinctSources=new Set(observed.map(r=>r.source)).size;
 const warnings=[];
 if(distinctSources<2)warnings.push(fa?
   'این داده‌ها هنوز شامل مشاهده از دو نوع منبع مستقل نیستند؛ تکرار یک منبع، شاهد چندمنبعی محسوب نمی‌شود.':
   'Observations do not yet span two independent source types. Repeating one source is not multi-source evidence.');
 if(records.some(r=>!r.observation))warnings.push(fa?
   'برخی مدخل‌ها مشاهده واقعی ندارند و برای تفسیر قابل اتکا نیستند.':
   'Some entries lack an actual observation and cannot support an interpretation.');
 if(!input.alternatives)warnings.push(fa?
   'توضیح‌های رقیب یا شواهد مخالف هنوز ثبت نشده‌اند؛ تفسیر فعلی باید باز بماند.':
   'Alternative explanations or contradictory observations have not been recorded; any interpretation must remain open.');
 for(const warning of warnings)panel.append(make('p',warning,'jr-gt-summary-warning'));
 panel.append(make('p',t.caution,'jr-gt-summary-note'));
 const lines=[fa?'Golden Talent · نقشه آموزشی شواهد':'Golden Talent · Educational evidence map'];
 for(const name of names){
  lines.push(t.fields[name]+': '+(input[name]||t.unknown));
 }
 lines.push(t.headings.sources+':');
 for(const record of records)lines.push(record.source+': '+record.observation+' | '+record.limit);
 for(const warning of warnings)lines.push(warning);
 lines.push(t.caution);
 last=lines.join('\n\n');
 summary.replaceChildren(panel);
 summary.hidden=false;
 copy.hidden=false;
 print.hidden=false;
 notice(t.created);
}
form.addEventListener('submit',event=>{event.preventDefault();build()});
form.addEventListener('input',resetOutput);
list.addEventListener('input',resetOutput);
list.addEventListener('change',resetOutput);
add.addEventListener('click',addEvidence);
clear.addEventListener('click',()=>{
 form.reset();list.replaceChildren();serial=0;count();resetOutput();notice(t.deleted);
});
copy.addEventListener('click',async()=>{
 if(!last)return;
 try{
  if(!navigator.clipboard?.writeText)throw Error('unavailable');
  await navigator.clipboard.writeText(last);notice(t.copied);
 }catch{notice(t.copyError);summary.focus()}
});
print.addEventListener('click',()=>{if(last)window.print()});
resetOutput();count();notice(t.ready);
})();
