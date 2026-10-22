/* JR owner educational draft price control — NO PUBLIC PRICE ACTIVATION.
 * Persistent drafts in canonical Bertina operations DB only after separate
 * additive schema migration. Current approved commerce is untouched.
 * Owner MFA, super-admin RBAC and CSRF are re-checked by the PHP API.
 */
(() => {
  'use strict';
  const host=document.getElementById('ops-education-offers');
  const workspace=document.getElementById('ops-workspace');
  if(!host||!workspace)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,eng)=>en?eng:fa;
  const root=host.querySelector('[data-edu-price-editor]');
  if(!root)return;
  const $=name=>root.querySelector('[data-edu-price-'+name+']');
  const select=$('select'),price=$('value'),status=$('state');
  const review=$('review'),rationale=$('rationale'),refresh=$('refresh'),save=$('save');
  const form=root.querySelector('form');
  if(!select||!price||!status||!review||!rationale||
    !refresh||!save||!form)return;
  const number=new Intl.NumberFormat(en?'en-US':'fa-IR');
  const permanentlyFree=new Set([
    'talent-intro','rcas-intro','bahar-intro','scorecard-intro'
  ]);
  let requestId=0,controller=null,busy=false,inventory=null,proposalMap=new Map();
  const canRead=()=>!workspace.hidden&&host.open&&!document.hidden;
  const setStatus=message=>{status.textContent=message;};
  const api=async(path,signal,extra={})=>{
    const response=await fetch('/api/admin/operations/'+path,{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},signal,...extra
    });
    if(!response.ok)throw Error(response.status===403?'MFA_REQUIRED':'API_UNAVAILABLE');
    return response.json();
  };
  const lock=disabled=>{
    select.disabled=disabled;price.disabled=disabled;review.disabled=disabled;
    rationale.disabled=disabled;save.disabled=disabled;
  };
  const reset=()=>{
    requestId++;controller?.abort();controller=null;inventory=null;
    proposalMap=new Map();busy=false;lock(true);refresh.disabled=false;
    select.replaceChildren();rationale.value='';price.value='';
    setStatus(T('وضعیت قیمت‌ها به‌صورت خصوصی هنوز دریافت نشده است.',
      'Draft state has not been retrieved.'));
  };
  function inspect(preserveStatus=false){
    const id=select.value;
    const offer=proposalMap.get(id);
    if(!offer){lock(true);return;}
    const saved=(inventory?.drafts||[]).find(row=>row.id===id);
    const amount=saved?.proposedPriceToman??offer.proposedPriceToman;
    const free=permanentlyFree.has(id);
    price.value=String(free?0:amount);
    rationale.value=saved?.rationale??'';
    review.value=saved?.reviewState??'DRAFT';
    price.disabled=!inventory?.canEdit||free;
    review.disabled=!inventory?.canEdit;
    rationale.disabled=!inventory?.canEdit;
    save.disabled=!inventory?.canEdit;
    save.dataset.currentRevision=String(saved?.rowRevision??0);
    if(!preserveStatus)status.textContent=inventory?.canEdit
      ?T('این تغییر صرفاً پیش‌نویس داخلی است؛ هیچ خدمت یا پرداختی فعال نمی‌شود.',
        'This edits an internal proposal only; no service or checkout is activated.')
      :T('پایگاه داده پیش‌نویس هنوز آماده نیست یا مجوز ویرایش ندارید.',
        'Draft storage is not installed or your role cannot edit.');
  }
  async function load(){
    if(!canRead()||busy)return false;
    const serial=++requestId;
    controller?.abort();controller=new AbortController();
    const signal=controller.signal;busy=true;lock(true);refresh.disabled=true;
    setStatus(T('در حال دریافت قیمت‌های پیشنهادی با مجوز مدیر…',
      'Retrieving authorized draft price inventory…'));
    try {
      const [catalogue,drafts]=await Promise.all([
        api('educational-offers',signal),api('educational-price-drafts',signal)
      ]);
      if(serial!==requestId||!canRead())return false;
      if(catalogue?.ok!==true||catalogue.schema!=='jr.educational-offers.admin-readonly.v1'||
        catalogue.canActivate!==false||
        !Array.isArray(catalogue.offers)||catalogue.offers.length>30||
        drafts?.ok!==true||drafts.schema!=='jr.education-price-drafts.owner-v1'||
        drafts.canActivate!==false||drafts.publiclyPurchasable!==false||
        !Array.isArray(drafts.drafts)||drafts.drafts.length>30)
        throw Error('INVALID_REGISTRY');
      const map=new Map();
      for(const offer of catalogue.offers){
        if(!offer||typeof offer.id!=='string'||
          !Number.isSafeInteger(offer.proposedPriceToman)||
          offer.proposedPriceToman<0||offer.publiclyPurchasable!==false)
          throw Error('INVALID_CATALOGUE');
        map.set(offer.id,offer);
      }
      proposalMap=map;inventory=drafts;select.replaceChildren();
      for(const offer of catalogue.offers){
        const option=document.createElement('option');
        option.value=offer.id;
        option.textContent=(en?offer.titleEn:offer.titleFa)+' · '+
          number.format(offer.proposedPriceToman)+T(' تومان (پیشنهاد)',' toman (draft)');
        select.append(option);
      }
      select.disabled=!inventory.canEdit;
      inspect();
      if(!inventory.canEdit)setStatus(T(
        'مدیریت پیش‌نویس‌ها تا نصب مهاجرت افزایشی دیتابیس یا تأیید نقش مدیر در حالت فقط‌خواندنی است.',
        'Draft editing remains read-only until the additive DB migration and verified owner role.'
      ));
      return true;
    }catch(error){
      if(serial!==requestId||error?.name==='AbortError')return false;
      inventory=null;lock(true);select.replaceChildren();
      setStatus(error?.message==='MFA_REQUIRED'
        ?T('احراز هویت دومرحله‌ای مدیر لازم است.',
          'Recent administrator MFA is required.')
        :T('منبع خصوصی آماده نیست. وضعیت فروش و قیمت‌های فعلی تغییر نکرده است.',
          'Private source unavailable. Existing prices and sales are unchanged.'));
      return false;
    }finally{
      if(serial===requestId){busy=false;refresh.disabled=false;controller=null;}
    }
  }
  select.addEventListener('change',inspect);
  refresh.addEventListener('click',load);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!canRead()||!inventory?.canEdit)return;
    const id=select.value;
    const offer=proposalMap.get(id);
    const amount=Number(price.value);
    const rev=Number(save.dataset.currentRevision);
    const why=rationale.value.trim();
    if(!offer||!Number.isSafeInteger(amount)||amount<0||amount>100000000||
       !Number.isSafeInteger(rev)||rev<0||why.length>300||
       (permanentlyFree.has(id)&&amount!==0)||
       !['DRAFT','SUBMITTED_FOR_REVIEW'].includes(review.value)){
      setStatus(T('مبلغ، توضیح یا وضعیت پیش‌نویس نامعتبر است.',
        'Invalid draft price, rationale or review state.'));
      return;
    }
    const serial=++requestId;
    const previous=select.value;controller?.abort();
    controller=new AbortController();busy=true;lock(true);refresh.disabled=true;
    setStatus(T('در حال ذخیره پیش‌نویس در حساب مدیر…',
      'Saving owner-only draft after fresh MFA verification…'));
    try{
      const mfa=await api('session',controller.signal);
      if(serial!==requestId||!canRead())return;
      if(mfa?.ok!==true||mfa.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(mfa.csrfToken||''))
        throw Error('MFA_REQUIRED');
      const payload={
        id,proposedPriceToman:amount,expectedRevision:rev,
        reviewState:review.value,rationale:why,
        activate:false,publiclyPurchasable:false
      };
      const response=await api('educational-price-drafts',controller.signal,{
        method:'POST',
        headers:{
          Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':mfa.csrfToken
        },
        body:JSON.stringify(payload)
      });
      if(serial!==requestId||!canRead())return;
      if(response?.ok!==true||response.schema!=='jr.education-price-draft-change.v1'||
        response.publiclyPurchasable!==false||response.canActivate!==false)
        throw Error('UNCONFIRMED');
      // Re-read source of truth before reflecting the new draft state.
      inventory=null;busy=false;refresh.disabled=false;
      const reloaded=await load();
      // The intentional independent GET increments requestId by one.
      // Compare to that successor, not the preceding POST request serial.
      if(requestId!==serial+1||!reloaded||!inventory?.drafts){
        setStatus(T('پاسخ ثبت دریافت شد، اما بازخوانی مستقل از پایگاه داده تأیید نشد. دوباره وضعیت را دریافت کنید.',
          'Save response received, but independent database reread was not confirmed. Refresh the draft inventory.'));
        return;
      }
      const found=inventory.drafts.find(entry=>entry.id===id);
      if(!found||found.rowRevision!==response.rowRevision||
        found.proposedPriceToman!==amount){
        setStatus(T('وضعیت نهایی ذخیره‌سازی با پاسخ سرور تطبیق نکرد. قبل از ادامه بازخوانی کنید.',
          'Saved revision could not be reconciled with the server snapshot. Refresh before proceeding.'));
        return;
      }
      if(proposalMap.has(previous)){select.value=previous;inspect(true);}
      setStatus(T('پیش‌نویس در پایگاه داده مادر تأیید شد؛ فروش و مجوز دسترسی فعال نشده‌اند.',
        'Owner draft reread and confirmed. Sale and entitlements remain inactive.'));
      window.dispatchEvent(new CustomEvent('jr:education-offer-draft-saved',{
        detail:{offerId:id,publiclyPurchasable:false}
      }));
    }catch(error){
      if(serial!==requestId||error?.name==='AbortError')return;
      setStatus(error?.message==='MFA_REQUIRED'
        ?T('اعتبار تأیید دومرحله‌ای منقضی شده است.',
          'Administrator MFA has expired.')
        :T('ثبت پیش‌نویس تأیید نشد؛ برای جلوگیری از تعارض، فهرست را دوباره بارگذاری کنید.',
          'Draft change not confirmed. Reload to resolve a possible revision conflict.'));
    }finally{
      if(serial===requestId){busy=false;refresh.disabled=false;inspect(true);}
    }
  });
  host.addEventListener('toggle',()=>{
    if(host.open)load();
    else reset();
  });
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)reset();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)reset();
  });
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
})();
