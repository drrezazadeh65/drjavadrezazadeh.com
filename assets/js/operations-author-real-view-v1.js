/* JR owner View as Author — real, read-only canonical author projection.
 * Requires live SUPER_ADMIN authorization + fresh MFA for every data read.
 * No credential swap, role mutation, POST, client persistence, buyer PII or bank secrets.
 */
(()=>{'use strict';
 const workspace=document.getElementById('ops-workspace');
 const root=document.getElementById('ops-author-real-view');
 if(!workspace||!root||!workspace.contains(root))return;
 const picker=root.querySelector('[data-real-author-picker]');
 const choose=root.querySelector('[data-real-author-select]');
 const load=root.querySelector('[data-real-author-load]');
 const close=root.querySelector('[data-real-author-close]');
 const status=root.querySelector('[data-real-author-status]');
 const mount=root.querySelector('[data-real-author-content]');
 if(!picker||!choose||!load||!close||!status||!mount)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,english)=>en?english:fa;
 const money=value=>value===null||value===undefined?'—':
   new Intl.NumberFormat(en?'en-US':'fa-IR').format(value)+t(' تومان',' tomans');
 const number=value=>value===null||value===undefined?'—':
   new Intl.NumberFormat(en?'en-US':'fa-IR').format(value);
 const e=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(text!==undefined)n.textContent=String(text);return n;
 };
 let generation=0,expiryTimer=null;
 function reset(message){
  generation++;
  if(expiryTimer!==null)clearTimeout(expiryTimer);
  expiryTimer=null;
  picker.hidden=true;choose.replaceChildren();load.disabled=true;close.hidden=true;
  mount.hidden=true;mount.replaceChildren();
  status.textContent=message||'';
 }
 function valid(){
  return !workspace.hidden&&root.open&&document.visibilityState!=='hidden';
 }
 async function get(url){
  const response=await fetch(url,{method:'GET',credentials:'same-origin',
   cache:'no-store',headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'request_unavailable');
  return data;
 }
 async function mfa(){
  const session=await get('/api/admin/operations/session');
  if(session.mfaRequired!==false||!Number.isFinite(session.mfaExpiresIn)
     ||session.mfaExpiresIn<=0)throw Error('admin_mfa_required');
  if(expiryTimer!==null)clearTimeout(expiryTimer);
  expiryTimer=setTimeout(()=>reset(t(
   'نشست دومرحله‌ای پایان یافت؛ اطلاعات خصوصی پاک شد.','MFA expired; private data cleared.'
  )),Math.max(1000,Math.min(session.mfaExpiresIn,600)*1000));
 }
 const li=(parent,...children)=>{parent.append(...children);return parent;};
 const item=(label,value)=>li(e('div','jr-ar-stat'),e('span','',label),e('strong','',value));
 const blank=()=>e('p','jr-ar-empty',t('مورد تأییدشده‌ای ثبت نشده است.','No verified records.'));
 const withList=(rows,render)=>{const list=e('ul','jr-ar-list');
  if(!rows?.length){list.append(e('li','',t('موردی ثبت نشده است.','No records.')));return list;}
  rows.forEach(value=>list.append(render(value)));return list;
 };
 function render(author){
  mount.replaceChildren();
  const screen=e('div','jr-ar-screen');
  const header=e('div','jr-ar-head');
  li(header,e('p','jr-ar-tag',t('نمای واقعی مؤلف · مدیر اصلی','REAL AUTHOR VIEW · SUPER ADMIN')),
   e('h3','',en?(author.displayNameEn||author.displayNameFa):(author.displayNameFa||author.displayNameEn)),
   e('p','jr-ar-warning',t(
    'در حال مشاهده داده‌های واقعی مؤلف با دسترسی صرفاً خواندنی هستید. شما وارد حساب مؤلف نشده‌اید.',
    'You are inspecting the real author data with read-only administrator access. You have not signed in as the author.'
   )));
  screen.append(header);
  const metrics=e('div','jr-ar-stats');
  const finance=[
   [t('خریدهای تأییدشده','Verified paid orders'),number(author.verifiedPaidOrders)],
   [t('سهم تعهدشده مؤلف','Accrued author share'),money(author.authorAccruedToman)],
   [t('سهم صندوق استعدادها','Talent fund allocation'),money(author.talentFundEarmarkedToman)],
   [t('تسویه بانکی تأییدشده','Bank-verified settlement'),money(author.authorBankSettledToman)],
   [t('مانده تسویه‌نشده','Unsettled amount'),money(author.authorUnsettledToman)],
   [t('ذخیره هزینه مستقل سایت','Separate platform reserve'),money(author.platformOperatingReserveToman)]
  ];
  finance.forEach(([label,value])=>metrics.append(item(label,value)));
  screen.append(metrics);
  if(Number(author.settledRefundsAwaitingAllocationReversal)>0)
   screen.append(e('p','jr-ar-warning',t(
    'هشدار: برخی بازپرداخت‌های قطعی هنوز تخصیص معکوس کامل ندارند.',
    'Warning: some settled refunds still await complete allocation reversals.'
   )));
  const descriptions=[
   ['works',t('آثار','Works')],
   ['sales',t('فروش','Sales')],
   ['contracts',t('قراردادها','Contracts')],
   ['notifications',t('اعلان‌ها','Notifications')],
   ['settlement',t('تسویه','Settlement')]
  ];
  const nav=e('div','jr-ar-tabs');nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label',t('بخش‌های داشبورد مؤلف','Author dashboard sections'));
  const panels=e('div','jr-ar-panels'),tabs=[],contents=[];
  descriptions.forEach(([key,label],i)=>{
   const button=e('button','jr-ar-tab',label),panel=e('section','jr-ar-panel');
   button.type='button';button.id='jr-ar-tab-'+key;button.setAttribute('role','tab');
   button.setAttribute('aria-controls','jr-ar-panel-'+key);
   panel.id='jr-ar-panel-'+key;panel.setAttribute('role','tabpanel');
   panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
   nav.append(button);panels.append(panel);tabs.push(button);contents.push(panel);
  });
  contents[0].append(withList(author.works,work=>li(e('li'),
   e('strong','',work.title||t('بدون عنوان','Untitled')),
   e('p','',t('وضعیت انتشار: ','Publication: ')+(work.publicationStatus||'—')),
   e('p','',t('بازبینی علمی: ','Scientific review: ')+(work.scientificReview||'—')))));
  contents[1].append(withList(author.recentSales,sale=>li(e('li'),
   e('strong','',t('شناسه غیرقابل بازیابی فروش: ','Irreversible sale reference: ')+(sale.saleRef||'—')),
   e('p','',t('ثبت: ','Booked: ')+(sale.bookedAt||'—')),
   e('p','',t('سهم مؤلف: ','Author allocation: ')+money(sale.authorShareToman)),
   e('p','',t('سهم حمایت: ','Talent fund allocation: ')+money(sale.talentFundShareToman)),
   e('p','',sale.refundAllocationsUnreconciled?t('نیازمند تطبیق بازپرداخت','Refund allocation reconciliation required'):'')
  )));
  contents[2].append(withList(author.contracts,contract=>li(e('li'),
   e('strong','',t('نسخه قرارداد: ','Contract version: ')+(contract.version||'—')),
   e('p','',t('وضعیت: ','Status: ')+(contract.state||'—')),
   e('p','',t('آغاز اعتبار: ','Effective: ')+(contract.effectiveFrom||'—')))));
  contents[3].append(withList(author.recentSales,sale=>li(e('li'),
   e('strong','',t('فروش: ','Sale: ')+(sale.saleRef||'—')),
   e('p','',t('وضعیت اعلان مؤلف: ','Author notification: ')+(sale.authorNotificationState||'not_queued')))));
  contents[4].append(
   e('p','jr-ar-note',t('مبالغ بر پایه دفتر ثبت سرور هستند؛ تعهد به معنی پرداخت بانکی یا واریز کمک نیست.',
    'Amounts reflect server ledger entries. Accrual is not confirmed payout or charitable disbursement.')),
   item(t('تأمین تطبیق‌شده هزینه‌های مستقل','Reconciled independent platform funding'),
    money(author.platformOperatingFundingReconciledToman)),
   e('p','jr-ar-note',t(
    'اطلاعات حساب بانکی، هویت و مدارک از این نمای عمومی مدیر نمایش داده نمی‌شوند. پرونده محرمانه هویت در بخش بررسی مؤلفان باقی می‌ماند.',
    'Bank credentials, private identity and documents are excluded. Use the existing protected author review area for identity workflows.'
   )));
  function selected(i,focus=false){
   tabs.forEach((button,index)=>{
    button.setAttribute('aria-selected',index===i?'true':'false');
    button.tabIndex=index===i?0:-1;contents[index].hidden=index!==i;
   });if(focus)tabs[i].focus();
  }
  tabs.forEach((button,i)=>{
   button.addEventListener('click',()=>selected(i));
   button.addEventListener('keydown',event=>{
    let to=null;
    if(event.key==='Home')to=0;
    else if(event.key==='End')to=tabs.length-1;
    else if(event.key==='ArrowRight')to=(i+1)%tabs.length;
    else if(event.key==='ArrowLeft')to=(i-1+tabs.length)%tabs.length;
    if(to!==null){event.preventDefault();selected(to,true);}
   });
  });
  selected(0);
  screen.append(nav,panels,e('p','jr-ar-foot',t(
   'نمای مدیریتی فقط خواندنی؛ بدون جعل هویت، پرداخت، امضا، ویرایش یا صدور مجوز.',
   'Read-only administration: no impersonation, payment, signature, mutation or authorization grant.'
  )));
  mount.append(screen);mount.hidden=false;close.hidden=false;
 }
 async function directory(){
  if(!valid())return;
  reset(t('در حال تأیید هویت مدیر و دریافت فهرست مؤلفان…','Verifying owner MFA and loading authors…'));
  const id=generation;
  try{
   await mfa();if(id!==generation||!valid())return;
   const result=await get('/api/admin/operations/author-view');
   if(id!==generation||!valid())return;
   const authors=result.authors||[];
   const option=e('option','',t('مؤلف را انتخاب کنید','Select an author'));option.value='';
   choose.append(option);
   authors.forEach(author=>{
    const el=e('option','',en?(author.displayNameEn||author.displayNameFa):
      (author.displayNameFa||author.displayNameEn));
    el.value=author.id;choose.append(el);
   });
   picker.hidden=false;choose.value='';load.disabled=true;
   status.textContent=authors.length?
    t('مؤلف را انتخاب کنید؛ اطلاعات واقعی تنها پس از انتخاب بارگذاری می‌شوند.',
      'Choose an author; live records load only after selection.'):
    t('مؤلفی با حساب فعال و تأییدشده یافت نشد.','No author with an active approved account.');
  }catch(error){
   if(id===generation&&valid())status.textContent=t(
    'دسترسی مجاز نیست یا زیرساخت داده مؤلف در دسترس نیست: ',
    'Access denied or author data unavailable: ')+String(error.message||'unavailable');
  }
 }
 async function openSelected(){
  if(!valid()||!choose.value)return;
  const id=++generation,target=choose.value;load.disabled=true;
  mount.replaceChildren();mount.hidden=true;close.hidden=true;
  status.textContent=t('در حال بررسی مجوز و دریافت داشبورد واقعی…','Checking authorization and loading real author dashboard…');
  try{
   await mfa();if(id!==generation||!valid())return;
   const result=await get('/api/admin/operations/author-view?authorId='+encodeURIComponent(target));
   if(id!==generation||!valid()||choose.value!==target)return;
   if(result.readOnly!==true||result.impersonation!==false||!result.author)
    throw Error('unsafe_projection');
   render(result.author);
   status.textContent=t('داده‌های واقعی بارگذاری شدند. نمایش فقط خواندنی است.',
     'Real author records loaded in read-only mode.');
  }catch(error){if(id===generation&&valid())status.textContent=t(
   'دریافت نمای مؤلف ممکن نشد: ','Unable to load author view: ')+String(error.message||'unavailable');}
  finally{if(id===generation&&!picker.hidden)load.disabled=!choose.value;}
 }
 choose.addEventListener('change',()=>{
  generation++;mount.replaceChildren();mount.hidden=true;close.hidden=true;
  load.disabled=!choose.value;
  status.textContent=t('برای بارگذاری داده‌های واقعی، «مشاهده» را بزنید.',
    'Select View to load real records.');
 });
 load.addEventListener('click',openSelected);
 close.addEventListener('click',()=>{
  generation++;mount.hidden=true;mount.replaceChildren();close.hidden=true;
  status.textContent=t('نمای مؤلف بسته و اطلاعات خصوصی پاک شد.','Author view closed; private data cleared.');
 });
 root.addEventListener('toggle',()=>root.open?directory():reset());
 workspace.addEventListener('jr:operations-locked',()=>{reset();root.open=false;});
 new MutationObserver(()=>{if(workspace.hidden)reset();}).observe(workspace,{
  attributes:true,attributeFilter:['hidden']
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 window.addEventListener('pagehide',()=>reset());
 if(location.hash==='#ops-author-real-view'&&!workspace.hidden)root.open=true;
 window.addEventListener('hashchange',()=>{if(location.hash==='#ops-author-real-view'&&!workspace.hidden)root.open=true;});
})();
