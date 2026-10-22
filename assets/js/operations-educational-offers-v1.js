/* MFA-gated educational proposal inventory in EXISTING operations console.
 * Read-only, no checkout actions, no price changes, no session persistence.
 */
(() => {
  'use strict';
  const panel=document.getElementById('ops-education-offers');
  const workspace=document.getElementById('ops-workspace');
  if(!panel||!workspace)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const status=panel.querySelector('[data-edu-offers-status]');
  const cards=panel.querySelector('[data-edu-offers-list]');
  const search=panel.querySelector('[data-edu-offers-search]');
  const filter=panel.querySelector('[data-edu-offers-filter]');
  const summary=panel.querySelector('[data-edu-offers-summary]');
  const refresh=panel.querySelector('[data-edu-offers-refresh]');
  const money=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let last=null;
  let ownerDrafts=null;
  let busy=false;
  let controller=null;
  let requestSerial=0;
  const make=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  function reset(){
    requestSerial++;
    if(controller)controller.abort();
    controller=null;busy=false;refresh.disabled=false;
    last=null;ownerDrafts=null;cards.replaceChildren();summary.textContent='';
    status.textContent=T('گزارش خصوصی برای مشاهده درخواست نشده است.','Private proposal snapshot has not been requested.');
  }
  function render(){
    if(!last)return;
    const text=search.value.trim().toLocaleLowerCase(fa?'fa':'en');
    const condition=filter.value;
    const effectiveDraftPrice=o=>ownerDrafts?.get(o.id)?.proposedPriceToman??o.proposedPriceToman;
    const selected=last.offers.filter(o=>{
      const amount=effectiveDraftPrice(o);
      if(condition==='free'&&amount!==0)return false;
      if(condition==='priced'&&amount===0)return false;
      return !text||[
        o.id,o.titleEn,o.titleFa,o.engine
      ].some(value=>String(value).toLocaleLowerCase(fa?'fa':'en').includes(text));
    });
    cards.replaceChildren();
    for(const offer of selected){
      const card=make('article','jr-edu-offers__card');
      card.append(make('strong','jr-edu-offers__title',fa?offer.titleFa:offer.titleEn));
      card.append(make('small','jr-edu-offers__id',offer.id+' · '+offer.engine));
      const draftPrice=effectiveDraftPrice(offer);
      const isOwnerDraft=ownerDrafts?.has(offer.id)===true;
      const proposed=draftPrice===0
        ?T('مرحله مقدماتی بدون هزینه','Free introductory stage')
        :T(isOwnerDraft?'پیش‌نویس ثبت‌شده مالک: ':'قیمت اولیه پیشنهادی: ',
            isOwnerDraft?'Owner saved draft: ':'Initial proposed price: ')+
          money.format(draftPrice)+T(' تومان',' toman');
      card.append(make('p','jr-edu-offers__price',proposed));
      card.append(make('p','jr-edu-offers__warning',
        T('پیشنهاد تأییدنشده؛ این بخش پرداخت یا فعال‌سازی انجام نمی‌دهد.',
          'Unapproved proposal. This module cannot charge or activate a service.')));
      cards.append(card);
    }
    if(selected.length===0){
      cards.append(make('p','jr-edu-offers__empty',T('موردی مطابق فیلتر پیدا نشد.','No proposals match your filter.')));
    }
    summary.textContent=T('تعداد پیشنهادها: ','Draft proposals: ')+
      money.format(last.summary.proposals)+' · '+
      T('مقدماتی رایگان: ','Free-stage drafts: ')+
      money.format(last.summary.zeroPriceDrafts)+' · '+
      T('پیشنهادهای قیمت‌دار: ','Priced proposals: ')+
      money.format(last.summary.pricedDrafts);
  }
  async function load(){
    if(workspace.hidden||!panel.open||busy)return;
    const serial=++requestSerial;
    if(controller)controller.abort();
    controller=new AbortController();busy=true;refresh.disabled=true;
    status.textContent=T('در حال دریافت فهرست پیشنهادی از API امن مدیر…','Reading proposal inventory from the authenticated administration API…');
    try{
      const responses=await Promise.all([
        fetch('/api/admin/operations/educational-offers',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        }),
        fetch('/api/admin/operations/educational-price-drafts',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        }).catch(()=>null)
      ]);
      if(!responses[0].ok)throw new Error('unavailable');
      const data=await responses[0].json();
      const drafts=responses[1]?.ok===true?await responses[1].json():null;
      if(serial!==requestSerial||workspace.hidden||!panel.open)return;
      if(data?.ok!==true||data.schema!=='jr.educational-offers.admin-readonly.v1'
        ||data.status!=='PROPOSALS_NOT_FOR_SALE'||data.readOnly!==true
        ||data.canActivate!==false||!Array.isArray(data.offers)
        ||!data.summary||data.offers.length>30
        ||data.offers.some(o=>!o||typeof o.id!=='string'
           ||typeof o.titleFa!=='string'||typeof o.titleEn!=='string'
           ||!Number.isSafeInteger(o.proposedPriceToman)
           ||o.proposedPriceToman<0||o.publiclyPurchasable!==false))
        throw new Error('invalid-response');
      if(drafts?.ok===true&&
        drafts.schema==='jr.education-price-drafts.owner-v1'&&
        drafts.canActivate===false&&
        drafts.publiclyPurchasable===false&&
        Array.isArray(drafts.drafts)&&drafts.drafts.length<=30&&
        drafts.drafts.every(d=>d&&typeof d.id==='string'&&
          Number.isSafeInteger(d.proposedPriceToman)&&
          d.proposedPriceToman>=0&&d.proposedPriceToman<=100000000)){
        ownerDrafts=new Map(drafts.drafts.map(d=>[d.id,d]));
      }else ownerDrafts=null;
      last=data;render();
      status.textContent=ownerDrafts===null
        ?T('قیمت‌های اولیه فقط پیشنهاد هستند؛ وضعیت پیش‌نویس‌های ذخیره‌شده مالک نامشخص است و فروش فعال نیست.',
          'Initial proposals shown; saved owner drafts cannot be verified. Nothing is for sale.')
        :T('فهرست با پیش‌نویس‌های ذخیره‌شده مالک هماهنگ شد؛ هیچ محصولی برای فروش فعال نشده است.',
          'Proposal list reconciled with owner-saved drafts. No product was activated for sale.');
    }catch(e){
      if(serial!==requestSerial||e?.name==='AbortError')return;
      last=null;ownerDrafts=null;cards.replaceChildren();summary.textContent='';
      status.textContent=T('درگاه مدیریت یا مجوز دسترسی در دسترس نیست. هیچ قیمتی به‌عنوان فعال نمایش داده نمی‌شود.',
        'Administration endpoint or access is unavailable. No offers are marked live.');
    }finally{
      if(serial===requestSerial){busy=false;refresh.disabled=false;controller=null;}
    }
  }
  panel.addEventListener('toggle',()=>{
    if(panel.open)load();else if(controller)controller.abort();
  });
  refresh.addEventListener('click',load);
  // Emitted only after a separate editor independently rereads the committed
  // mother-DB revision. Never implies public price activation.
  window.addEventListener('jr:education-offer-draft-saved',()=>{
    if(panel.open&&!workspace.hidden&&!busy)load();
  });
  search.addEventListener('input',render);
  filter.addEventListener('change',render);
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)reset();
    else if(panel.open&&!last)load();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
})();