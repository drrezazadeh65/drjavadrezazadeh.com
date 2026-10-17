/* JR Future Publishing — approved author dashboard, private no-store, real server values only. */
(()=>{'use strict';
const status=document.getElementById('author-portal-state');
const data=document.getElementById('author-portal-data');
if(!status||!data)return;
const fa=(n)=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node}
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
 const works=el('ul','jp-work-list');
 for(const work of author.works||[]){const li=el('li','');li.append(el('strong','',work.title),el('small','',''));li.lastChild.textContent='وضعیت انتشار: '+String(work.publicationStatus||'نامشخص')+' · داوری علمی: '+String(work.scientificReview||'نامشخص');works.append(li)}
 if(!works.childElementCount)works.append(el('li','','هنوز اثری در حساب تأییدشده ثبت نشده است.'));
 section.append(el('h3','','آثار و وضعیت داوری'),works);
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
 section.append(el('h3','','قراردادهای مؤلف و مدارک امضا'),contracts);
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
  section.append(panel);
 }

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
   ' · اعلان مؤلف: '+String(sale.authorNotificationState||'not_queued');
  history.append(item);
 }
 if(!history.childElementCount)history.append(el('li','','فروش بانکی تأییدشده‌ای برای نمایش وجود ندارد؛ هیچ ردیف آزمایشی نمایش داده نمی‌شود.'));
 section.append(el('h3','','تاریخچه ۵۰ فروش اخیر و وضعیت اعلان‌ها'),history,
  el('p','jp-small','شناسه نمایشی فروش محرمانه و غیرقابل بازشناسی است. اطلاعات شخصی خریداران در این داشبورد ارائه نمی‌شود. وضعیت اعلان «ارسال‌شده» نیز با «دریافت/مطالعه قطعی ایمیل» متفاوت است.'));
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
