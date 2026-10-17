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
 if(!contracts.childElementCount)contracts.append(el('li','','هیچ قرارداد امضاشده یا فعالی برای این حساب ثبت نشده است. تا تأیید حقوقی و امضای معتبر، فروش اثر فعال نمی‌شود.'));
 section.append(el('h3','','قراردادهای مؤلف و مدارک امضا'),contracts);
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
