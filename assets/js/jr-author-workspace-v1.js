/* JR Future Publishing — approved author dashboard, private no-store, real server values only. */
(()=>{'use strict';
const status=document.getElementById('author-portal-state');
const data=document.getElementById('author-portal-data');
if(!status||!data)return;
const fa=(n)=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
let authorSequence=0;
// CSV is generated only from the last 50 verified, already authorised sales in
// the private dashboard. No account identifiers, buyer data or bank details.
function downloadRecentSalesCsv(author){
 const sales=Array.isArray(author.recentSales)?author.recentSales.slice(0,50):[];
 if(!sales.length)return;
 const safe=(value)=>{
  let v=String(value??'').replace(/\r|\n/g,' ');
  if(/^[\s]*[=+@-]/.test(v))v="'"+v; // spreadsheet formula-injection defence
  return '"'+v.replace(/"/g,'""')+'"';
 };
 const header=['Reference','Booked at','Net sale (toman)','Author share (toman)','Talent fund (toman)','Author email notification','Refund settled'];
 const rows=sales.map(s=>[s.saleRef,s.bookedAt,s.netSaleToman,s.authorShareToman,s.talentFundShareToman,s.authorNotificationState,s.refundSettled?'yes':'no']);
 const csv='\uFEFF'+[header,...rows].map(line=>line.map(safe).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='jr-author-verified-recent-sales.csv';
 a.style.display='none';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node}
// Native accessible disclosure panels keep the long multi-author workspace usable
// without changing server finance, bank settlement or confidential author records.
function disclosure(label,body,count,expanded=false){
 const wrapper=el('details','jp-author-disclosure');
 if(expanded)wrapper.open=true;
 const summary=el('summary','jp-author-summary',label);
 if(Number.isInteger(count))summary.append(el('span','jp-author-count',fa(count)));
 wrapper.append(summary,body);
 return wrapper;
}
function failure(message,login){status.replaceChildren(el('h2','',message),el('p','',login?'برای دیدن داشبورد با حساب ایمیل‌تأییدشده خود وارد شوید.':'اطلاعات محرمانه یا آمار غیرتأییدشده در این وضعیت نمایش داده نمی‌شود.'));
 const link=el('a','jp-button',login?'ورود با ایمیل':'ارتباط با پشتیبانی');
 link.href=login?'/fa/login/':'/fa/tamas/';status.append(link);
}
function renderAuthor(author){
 const section=el('section','jp-card');section.append(el('p','jp-kicker','هویت مؤلف تأییدشده'),el('h2','',author.displayNameFa||author.displayNameEn||'مؤلف'));
 const cards=el('div','jp-workspace-grid');
 const items=[
 ['خریدهای قطعی دارای تأیید درگاه',fa(author.verifiedPaidOrders)],
 ['سهم تعهدشده مؤلف',fa(author.authorAccruedToman)+' تومان'],
 ['سهم ثبت‌شده صندوق استعدادها',fa(author.talentFundEarmarkedToman)+' تومان'],
 ['تسویه بانکی تأییدشده مؤلف',fa(author.authorBankSettledToman)+' تومان'],
 ['ذخیره مستقل هزینه سایت (۷٪)',fa(author.platformOperatingReserveToman)+' تومان'],
 ['تأمین بودجه هزینه‌ها، تطبیق‌شده',fa(author.platformOperatingFundingReconciledToman)+' تومان']
 ];
 for(const [label,value] of items){const box=el('div','');box.append(el('strong','',value),el('span','',label));cards.append(box)}
 section.append(cards,el('p','jp-small','مانده تسویه‌نشده مؤلف: '+fa(author.authorUnsettledToman)+' تومان. تعهد صندوق به معنی پرداخت قطعی به ذی‌نفع نیست.'));
 const unresolvedRefunds=Number(author.settledRefundsAwaitingAllocationReversal)||0;
 if(unresolvedRefunds>0){
  const warning=el('p','jp-status','هشدار مالی: '+fa(unresolvedRefunds)+' سفارش بازپرداخت‌شده هنوز فاقد ثبت معکوس کامل سهم مؤلف یا صندوق در دفتر تخصیص است. ارقام تعهد و مانده ممکن است تا تطبیق مالی اصلاح شوند. برای بررسی با مدیریت تماس بگیرید.');
  warning.setAttribute('role','alert');section.append(warning);
 }
 const works=el('ul','jp-work-list');
 for(const work of author.works||[]){const li=el('li','');li.append(el('strong','',work.title),el('small','',''));li.lastChild.textContent='وضعیت انتشار: '+String(work.publicationStatus||'نامشخص')+' · داوری علمی: '+String(work.scientificReview||'نامشخص');works.append(li)}
 if(!works.childElementCount)works.append(el('li','','هنوز اثری در حساب تأییدشده ثبت نشده است.'));
 section.append(disclosure('آثار و وضعیت داوری',works,(author.works||[]).length,true));
 const financialNotice=el('p','jp-small','توضیح هزینه‌ها: ذخیره ۷ درصدی از بودجه مستقل مجموعه تأمین می‌شود؛ از سهم مؤلف یا صندوق کم نمی‌شود و نرخ قانونی مالیات نیز محسوب نمی‌گردد. هر عدد صرفاً از ثبت‌های واقعی سمت سرور خوانده می‌شود.');
 section.append(financialNotice);
 const contracts=el('ul','jp-work-list');
 for(const c of author.contracts||[]){
  const item=el('li','');
  item.append(el('strong','','نسخه قرارداد: '+String(c.version||'نامشخص')),
              el('small','',''));
  item.lastChild.textContent='وضعیت قرارداد: '+String(c.state||'نامشخص')+' · شروع اعتبار: '+String(c.effectiveFrom||'هنوز فعال نشده');
  contracts.append(item);
 }
 if(!contracts.childElementCount)contracts.append(el('li','','هیچ قرارداد امضاشده یا فعالی ثبت نشده است. پیش‌نویس زیر فقط برای مطالعه و ارائه پیشنهاد اصلاح است و رضایت به توزیع دیجیتال باید مستقلاً ثبت شود.'));
 const contractsPanel=el('div','jp-author-detail-body');contractsPanel.append(contracts);
 const draft=author.draftContract;
 if(draft&&draft.status==='negotiation_draft_not_signed'&&Array.isArray(draft.clauses)){
  const panel=el('section','jp-card');
  panel.style.marginTop='22px';
  panel.append(el('p','jp-kicker','فقط برای مطالعه و مذاکره — بدون امضا'),
    el('h3','',String(draft.title||'پیش‌نویس قرارداد')));
  panel.append(el('p','jp-small','شناسه نسخه: '+String(draft.version||'—')));
  for(const notice of draft.notices||[]){
   panel.append(el('p','jp-status',String(notice)));
  }
  const contractBody=el('div','jp-contract-preview');
  for(const clause of draft.clauses){
   const item=el('section','');
   item.append(el('h4','',String(clause.heading||'')),el('p','',String(clause.body||'')));
   contractBody.append(item);
  }
  panel.append(contractBody);
  panel.append(el('h4','','موارد پیشنهادی برای تکمیل و اصلاح'));
  const todo=el('ul','jp-work-list');
  for(const item of draft.openPoints||[])todo.append(el('li','',String(item)));
  panel.append(todo);
  const print=el('button','jp-button','چاپ یا ذخیره قرارداد برای بازبینی');
  print.type='button';print.addEventListener('click',()=>window.print());
  panel.append(print,el('p','jp-small','این بخش امکان امضا، پذیرش نهایی یا بارگذاری مدرک ندارد. اصلاحات از مسیر مذاکره با مدیر ثبت می‌شوند.'));
  contractsPanel.append(panel);
 }
 section.append(disclosure('قراردادهای مؤلف و پیش‌نویس قابل مطالعه',contractsPanel,(author.contracts||[]).length));

 const history=el('ul','jp-work-list');
 for(const sale of author.recentSales||[]){
  const item=el('li','');
  item.append(el('strong','','فروش دارای تأیید درگاه · '+String(sale.saleRef||'—')),
              el('small','',''));
  item.lastChild.textContent='زمان ثبت: '+String(sale.bookedAt||'—')+
   ' · خالص مبلغ فروش: '+fa(sale.netSaleToman)+' تومان'+
   ' · سهم مؤلف: '+fa(sale.authorShareToman)+' تومان'+
   ' · سهم صندوق: '+fa(sale.talentFundShareToman)+' تومان'+
   ' · ذخیره مستقل سایت (۷٪): '+fa(sale.platformOperatingReserveToman)+' تومان'+
   ' · اعلان مؤلف: '+String(sale.authorNotificationState||'not_queued')+
   (sale.refundSettled?(sale.refundAllocationsUnreconciled?' · بازپرداخت تسویه‌شده؛ تخصیص مالی نیازمند تطبیق':' · بازپرداخت تسویه‌شده؛ تخصیص‌ها معکوس شده‌اند'):'');
  history.append(item);
 }
 if(!history.childElementCount)history.append(el('li','','فروش بانکی تأییدشده‌ای برای نمایش وجود ندارد؛ هیچ ردیف آزمایشی نمایش داده نمی‌شود.'));
 const historyPanel=el('div','jp-author-detail-body');
 if((author.recentSales||[]).length){
  const label=el('label','jp-author-search-label','جستجو در حداکثر ۵۰ فروش اخیر (شناسه، تاریخ یا وضعیت)');
  const search=el('input','jp-author-search');
  search.type='search';search.autocomplete='off';search.spellcheck=false;
  search.setAttribute('aria-label','جستجو در سوابق فروش مؤلف');
  const none=el('p','jp-small','هیچ فروش مطابق جستجوی شما پیدا نشد.');
  none.hidden=true;
  search.addEventListener('input',()=>{
   const query=search.value.trim().toLocaleLowerCase('fa');
   let visible=0;
   for(const item of history.children){
    const show=item.textContent.toLocaleLowerCase('fa').includes(query);
    item.hidden=!show;if(show)visible++;
   }
   none.hidden=visible!==0;
  });
  label.append(search);historyPanel.append(label,none);
 }
 if((author.recentSales||[]).length){
  const exportBtn=el('button','jp-button jp-author-export','دریافت CSV فروش‌های قطعی اخیر');
  exportBtn.type='button';
  exportBtn.addEventListener('click',()=>downloadRecentSalesCsv(author));
  historyPanel.append(exportBtn,el('p','jp-small','فایل خروجی صرفاً از حداکثر ۵۰ فروش ثبت‌شده در این صفحه تهیه می‌شود و گزارش حسابداری کامل یا تسویه بانکی نیست. فایل را محرمانه نگهداری کنید.'));
 }
 historyPanel.append(history,el('p','jp-small','فقط ۵۰ تراکنش اخیر این مؤلف نمایش داده می‌شود؛ نتایج جستجو محدود به همین موارد است. شناسه‌ها غیرقابل بازشناسی‌اند و اطلاعات خصوصی خریداران افشا نمی‌شود. «ارسال‌شدن» اعلان به معنی «خوانده‌شدن» ایمیل نیست.'));
 section.append(disclosure('سوابق فروش و وضعیت اعلان‌ها',historyPanel,(author.recentSales||[]).length));
 const onboarding=el('a','jp-button jp-author-identity-link','مشاهده و تکمیل پرونده هویتی، رزومه و اطلاعات تسویه');
 onboarding.href='#jr-author-onboarding';
 section.append(onboarding,el('p','jp-small','این داشبورد تنها گزارش وضعیت‌های ثبت‌شده است؛ درخواست تسویه، تأیید قرارداد یا واریز بانکی از طریق این پیوند به‌صورت خودکار انجام نمی‌شود.'));
 // Turn the three existing, real-data disclosure sections into a compact,
 // keyboard-accessible tabbed workspace. Keep all server author scopes intact.
 const panels=Array.from(section.querySelectorAll(':scope > .jp-author-disclosure'));
 if(panels.length===3){
  const uid='jr-author-tabs-'+(++authorSequence);
  const bar=el('div','jp-author-tablist');bar.setAttribute('role','tablist');
  bar.setAttribute('aria-label','بخش‌های داشبورد مؤلف');
  const descriptors=[['آثار و داوری',0],['قراردادها',1],['فروش و اعلان‌ها',2]];
  const buttons=[];
  let active=0;
  for(const [i,[label]] of descriptors.entries()){
   const btn=el('button','jp-author-tab',label);btn.type='button';
   btn.id=uid+'-tab-'+i;btn.setAttribute('role','tab');
   btn.setAttribute('aria-controls',uid+'-panel-'+i);
   const panel=panels[i];panel.id=uid+'-panel-'+i;
   panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',btn.id);
   panel.open=true; // each panel remains fully inspectable when selected
   bar.append(btn);buttons.push(btn);
  }
  function selectTab(index,focus){
   active=index;
   panels.forEach((panel,i)=>{panel.hidden=i!==index;});
   buttons.forEach((btn,i)=>{btn.setAttribute('aria-selected',String(i===index));btn.tabIndex=i===index?0:-1;});
   if(focus)buttons[index].focus();
  }
  buttons.forEach((button,i)=>{
   button.addEventListener('click',()=>selectTab(i,false));
   button.addEventListener('keydown',event=>{
    const key=event.key;
    let next;
    if(key==='ArrowRight')next=(i+1)%buttons.length;
    else if(key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;
    else if(key==='Home')next=0;
    else if(key==='End')next=buttons.length-1;
    else return;
    event.preventDefault();selectTab(next,true);
   });
  });
  const summary=el('p','jp-small jp-author-tabs-intro','جزئیات آثار، قراردادها و فروش را از زبانه‌های زیر ببینید. ارقام از پایگاه داده امن سایت خوانده می‌شوند.');
  section.insertBefore(summary,panels[0]);section.insertBefore(bar,panels[0]);
  selectTab(0,false);
 }
 const reload=el('button','jp-button jp-author-refresh','به‌روزرسانی اطلاعات');
 reload.type='button';
 reload.addEventListener('click',async()=>{reload.disabled=true;reload.textContent='در حال دریافت اطلاعات…';await load();});
 const updated=el('p','jp-small jp-author-updated','آخرین دریافت از سرور: '+new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date()));
 section.append(reload,updated);
 return section;
}
async function load(){
 try {
 const response=await fetch('/api/publishing/author/overview',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'}});
 if(!response.ok){failure(response.status===401?'برای دسترسی وارد شوید':response.status===403?'نقش مؤلف هنوز تأیید نشده است':'داشبورد مؤلف در حال آماده‌سازی زیرساخت امن است',response.status===401);return}
 const result=await response.json();
 if(result.ok!==true||!Array.isArray(result.authors)||!result.authors.length){failure('داده معتبر مؤلف در دسترس نیست',false);return}
 data.replaceChildren(...result.authors.map(renderAuthor));
 status.hidden=true;data.hidden=false;
 }catch(_){failure('ارتباط امن با سامانه برقرار نشد',false)}
}
load();
})();
