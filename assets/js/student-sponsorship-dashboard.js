/* Safeguarded private sponsor workspace: never infer entitlement from a receipt, URL or local storage. */
(()=>{
 'use strict';
 const shell=document.querySelector('[data-student-support-workspace]');
 if(!shell)return;
 const status=shell.querySelector('[data-support-portal-status]');
 const list=shell.querySelector('[data-support-cases]');
 const form=shell.querySelector('[data-support-need-form]');
 const select=form.querySelector('[name="caseId"]');
 const submit=form.querySelector('button[type="submit"]');
 const formStatus=shell.querySelector('[data-support-need-status]');
 const root=(window.location.pathname.startsWith('/en/'))?'/en/':'/fa/';
 const say=(text,state='')=>{status.textContent=text;status.dataset.state=state};
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=String(text??'');return el};
 const parseInteger=s=>Number.isSafeInteger(Number(s))?Number(s):NaN;
 const formatAmount=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('fa-IR').format(Number(n))+' تومان':'';
 function drawCase(record){
   const card=node('article','','cd-sponsor-case');
   card.append(node('div',record.role==='approved_sponsor'?'حامی تأییدشده':'دانش‌آموز / سرپرست','cd-sponsor-case-meta'));
   card.append(node('h3',record.studentName||record.alias||'پروندهٔ حمایتی'));
   card.append(node('p','شناسه پرونده: '+String(record.code||'—')));
   const needs=node('h4','نیازهای مجاز و تأییدشده');card.append(needs);
   if(Array.isArray(record.needs)&&record.needs.length){
      const ul=document.createElement('ul');
      for(const item of record.needs){
        ul.append(node('li',String(item.safe_summary||'')+' · '+formatAmount(item.amount_toman)+' · '+String(item.status||'')));
      }
      card.append(ul);
   }else card.append(node('p','هنوز نیازی برای نمایش این نقش تأیید نشده است.','cd-sponsor-empty'));
   const updates=node('h4','روند پیگیری');updates.style.marginTop='14px';card.append(updates);
   if(Array.isArray(record.progress)&&record.progress.length){
     const ul=document.createElement('ul');
     for(const step of record.progress)ul.append(node('li',step.safe_summary||''));
     card.append(ul);
   }else card.append(node('p','گزارش پیشرفت تأییدشده‌ای برای نمایش وجود ندارد.','cd-sponsor-empty'));
   if(Array.isArray(record.sponsors)&&record.sponsors.length&&record.role==='student_or_guardian'){
     card.append(node('p','حامیانی که نمایش نامشان را پذیرفته‌اند: '+record.sponsors.join('، ')));
   }
   card.append(node('p','هیچ شماره تماس، نشانی یا پیام مستقیم در این فضا ردوبدل نمی‌شود.','cd-sponsor-case-meta'));
   return card;
 }
 const ledgerList=shell.querySelector('[data-contributions-list]');
 const ledgerStatus=shell.querySelector('[data-contributions-status]');
 const focusName={general:'صندوق عمومی فرصت برابر',scholarship:'بورسیه و شهریه',books:'کتاب و لوازم آموزشی',
   services:'خدمات آموزشی',essentials:'پوشاک و نیازهای ضروری'};
 async function loadPendingGiving(){
  const target=shell.querySelector('[data-pending-giving]');
  if(!target)return;
  target.textContent='';
  try{
   const response=await fetch('/api/commerce/history',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   if(data.ok!==true||!Array.isArray(data.orders))return;
   const donations=data.orders.filter(order=>Array.isArray(order.items)&&
    order.items.length===1&&order.items[0].sku==='support:students');
   if(!donations.length)return;
   const title=node('h3','وضعیت تراکنش‌های اخیر حمایت مالی');
   target.append(title);
   for(const order of donations.slice(0,10)){
    const verified=order.state==='paid'&&order.paymentVerified===true;
    const label=verified?'پرداخت تأییدشده':order.state==='pending'?'در انتظار پرداخت':
      'پرداخت تأیید نشده';
    const row=node('p',label+' · '+formatAmount(order.amountToman)+' · '+String(order.createdAt||''));
    target.append(row);
    if(verified){
     const receipt=node('details','','cd-donor-ledger-item');
     receipt.append(node('summary','مشاهده تأییدیه پرداخت'));
     receipt.append(node('p','شماره پیگیری داخلی: '+String(order.id||'')));
     receipt.append(node('p','مبلغ: '+formatAmount(order.amountToman)));
     receipt.append(node('p','تاریخ ثبت پرداخت: '+String(order.paidAt||'')));
     receipt.append(node('small','این تأییدیه بر پایه سند تطبیق‌یافته درگاه است؛ فاکتور مالیاتی یا سند تسویه بانکی نیست.'));
     target.append(receipt);
    }
   }
  }catch(_){target.textContent='وضعیت تراکنش‌های اخیر فعلاً قابل دریافت نیست.'}
 }
 async function loadContributions(){
  if(!ledgerList||!ledgerStatus)return;
  try{
   const r=await fetch('/api/student-support/my-contributions',{credentials:'include',cache:'no-store'});
   if(r.status===401){
     ledgerStatus.textContent='برای مشاهدهٔ پرداخت‌های متعلق به خود، با ایمیل تأییدشده وارد شوید. حمایت مالی بدون ثبت‌نام همچنان آزاد است.';
     return;
   }
   if(!r.ok)throw Error('ledger_unavailable');
   const data=await r.json();
   if(data.ok!==true||data.authenticated!==true||data.noStudentIdentity!==true||!Array.isArray(data.items))throw Error('invalid_ledger');
   ledgerList.replaceChildren();
   if(!data.items.length){
     ledgerStatus.textContent='هیچ پرداخت تأییدشده‌ای به ایمیل حساب فعلی مرتبط نیست. کمک‌های بدون ایمیل به‌طور خودکار به این حساب متصل نمی‌شوند.';
     return;
   }
   let total=0;
   for(const item of data.items){
    if(!item||!Number.isSafeInteger(item.amountToman)||item.amountToman<1000||
      !['legacy-voluntary','talented-students-v1'].includes(item.programme))continue;
    const row=node('article','','cd-donor-ledger-item');
    row.append(node('strong',item.programme==='talented-students-v1'
      ?'حمایت از دانش‌آموزان مستعد کم‌بضاعت':'حمایت داوطلبانهٔ گذشته'));
    row.append(node('span',formatAmount(item.amountToman),'cd-donor-ledger-money'));
    const subtitle=item.programme==='talented-students-v1'
      ?(focusName[item.focus]||focusName.general)+' · تخصیص در انتظار تأیید نیاز'
      :'پرداخت تاریخی؛ بدون انتساب خودکار به دانش‌آموز';
    row.append(node('small',subtitle));
    row.append(node('small','شناسه: '+String(item.orderId||'').slice(0,8)+'… · '+String(item.paidAt||'')));
    ledgerList.append(row);
    total+=item.amountToman;
   }
   if(!ledgerList.children.length){ledgerStatus.textContent='اطلاعات قابل‌تأییدی برای نمایش موجود نیست.';return}
   ledgerList.hidden=false;
   ledgerStatus.textContent='تعداد '+ledgerList.children.length.toLocaleString('fa-IR')+' حمایتِ پرداخت‌شده · مجموع '+formatAmount(total)+'؛ هیچ پرداختی بدون سند به دانش‌آموز خاصی تخصیص داده نشده است.';
  }catch(_){ledgerStatus.textContent='سابقهٔ پرداخت شخصی موقتاً در دسترس نیست؛ هیچ سابقه‌ای از حافظهٔ محلی یا داده ساختگی ساخته نمی‌شود.'}
 }
 async function load(){
  say('در حال بررسی دسترسی امن و مجوزهای حمایت تحصیلی…');
  await loadContributions();
  await loadPendingGiving();
  try{
    const h=await fetch('/api/student-support/health',{credentials:'include',cache:'no-store'});
    if(!h.ok)throw Error('unavailable');
    const health=await h.json();
    if(!health.ok||health.service!=='student-support')throw Error('unavailable');
    if(!health.caseSchemaReady){
      say('حمایت مالی مهمان در فروشگاه در دسترس است. پرونده‌های خصوصی تا نصب پایگاه دادهٔ حمایت، تأیید سرپرست و تکمیل کنترل‌های دسترسی فعال نمی‌شوند.','waiting');return;
    }
    const r=await fetch('/api/student-support/portal',{credentials:'include',cache:'no-store'});
    if(r.status===401){say('برای مشاهدهٔ پرونده‌های خصوصی، با ایمیل تأییدشده وارد شوید. پرداخت حمایت بدون ثبت‌نام امکان‌پذیر است.','waiting');return}
    if(!r.ok)throw Error('unavailable');
    const data=await r.json();
    if(!data.ok||!Array.isArray(data.cases)||data.private!==true)throw Error('unavailable');
    list.replaceChildren();
    if(!data.cases.length){
      say('حساب شما فعال است، اما هنوز هیچ پروندهٔ دانش‌آموزی با مجوز معتبر به شما اختصاص نیافته است. اطلاعات دیگران نمایش داده نمی‌شود.','ready');return;
    }
    for(const record of data.cases){list.append(drawCase(record))}
    list.hidden=false;
    say('فقط پرونده‌هایی نمایش داده می‌شوند که برای این حساب و با رضایت‌های معتبر مجازند.','ready');
    const own=data.cases.filter(x=>x.role==='student_or_guardian');
    if(own.length){
      select.replaceChildren(node('option','انتخاب پروندهٔ مرتبط'));
      select.firstChild.value='';
      for(const c of own){const opt=node('option',(c.alias||'پرونده')+' · '+c.code);opt.value=c.caseId;select.append(opt)}
      form.hidden=false;
    }
  }catch(_){say('بازیابی دادهٔ خصوصی در دسترس نیست؛ هیچ اطلاعات محلی یا ساختگی جایگزین نمی‌شود.','error')}
 }
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   const caseId=select.value;
   const category=form.querySelector('[name="category"]').value;
   const summary=form.querySelector('[name="summary"]').value.trim();
   const amountToman=parseInteger(form.querySelector('[name="amountToman"]').value);
   if(!caseId||summary.length<12||summary.length>320||!Number.isSafeInteger(amountToman)||amountToman<1000||amountToman>100000000){
     formStatus.textContent='شناسه پرونده، شرح نیاز (۱۲ تا ۳۲۰ نویسه) و مبلغ معتبر را بررسی کنید.';return;
   }
   submit.disabled=true;
   formStatus.textContent='در حال ثبت خصوصی برای بازبینی تیم مسئول…';
   try{
     const r=await fetch('/api/student-support/needs',{
       method:'POST',credentials:'include',cache:'no-store',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({caseId,category,summary,amountToman})
     });
     const data=await r.json();
     if(!r.ok||data.ok!==true||data.state!=='proposed')throw Error('unverified');
     form.querySelector('[name="summary"]').value='';
     formStatus.textContent='درخواست با وضعیت «در انتظار بررسی» ثبت شد و برای حامی قابل مشاهده نیست.';
   }catch(_){
     formStatus.textContent='ثبت نیاز تأیید نشد؛ برای جلوگیری از تکرار درخواست با پشتیبانی پیگیری کنید.';
   }
   // Ambiguous response may already have committed. Prevent double submission.
 });
 load();
})();
