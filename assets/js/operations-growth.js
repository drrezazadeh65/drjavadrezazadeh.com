/* Stage14: MFA-only read-only growth report. Unknown != zero. */
(() => {
  'use strict';
  const button=document.querySelector('[data-ops-growth-refresh]');
  const status=document.querySelector('[data-ops-growth-status]');
  const view=document.querySelector('[data-ops-growth-results]');
  if(!button||!status||!view)return;
  let requestGeneration=0;
  const workspace=document.getElementById('ops-workspace');
  const fa=document.documentElement.lang==='fa';
  const t=(a,b)=>fa?a:b;
  const cell=(title,value,source)=>{
    const article=document.createElement('article');article.className='ops-card';
    const label=document.createElement('small');label.textContent=title;
    const n=document.createElement('div');n.className='ops-number';
    n.textContent=(value===null||value===undefined)?t('نامشخص','Unknown'):String(value);
    const cite=document.createElement('small');cite.textContent=source;
    article.append(label,n,cite);return article;
  };
  const number=value=>Number.isSafeInteger(value)?value.toLocaleString(fa?'fa-IR':'en-US'):null;
  button.addEventListener('click',async()=>{
    if(workspace?.hidden)return;
    const generation=++requestGeneration;
    button.disabled=true;view.replaceChildren();status.textContent=t('در حال بررسی شواهد واقعی سرور…','Checking server evidence…');
    try{
      const response=await fetch('/api/admin/operations/growth',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'MFA':'UNAVAILABLE');
      const data=await response.json();
      if(generation!==requestGeneration||workspace?.hidden||document.hidden)return;
      if(!data.ok||data.schema!=='stage14-growth-evidence-v1')throw new Error('UNAVAILABLE');
      const counts=data.leadMetrics?.counts||null;
      const pipeline=data.serviceSalesPipeline||null;
      view.append(
        cell(t('درخواست‌های ثبت‌شده با رضایت','Consented intake records'),number(counts?.total),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های نیازمند بررسی','New intake requests'),number(counts?.new),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های واجد شرایط','Qualified intake requests'),number(counts?.qualified),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('لغو رضایت','Consent withdrawals'),number(counts?.withdrawn),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های خدمات منتظر اقدام','Service enquiries awaiting action'),number(pipeline?.awaitingAction),
          t('تنها درخواست‌های دارای رضایت معتبر','Only active consented enquiries')),
        cell(t('درخواست‌های معطل بیش از ۲۴ ساعت','Service enquiries older than 24 hours'),number(pipeline?.awaitingOver24Hours),
          t('نیازمند بررسی پیگیری؛ نه مجوز تبلیغات','Follow-up review needed; no marketing permission')),
        cell(t('درخواست‌های معطل بیش از ۷۲ ساعت','Service enquiries older than 72 hours'),number(pipeline?.awaitingOver72Hours),
          t('اولویت بالاتر برای رسیدگی','Higher operational follow-up priority')),
        cell(t('درخواست‌های نیازمند اطلاعات تکمیلی','Enquiries needing more information'),number(pipeline?.needsAdditionalInformation),
          t('بدون ادعای رزرو یا خرید','Not evidence of booking or purchase')),
        cell(t('درآمد خالص تسویه‌شده (تومان)','Net bank-settled revenue (toman)'),number(data.revenue?.netSettledToman),data.revenue?.status||'UNVERIFIED'),
        cell(t('سفارش‌های واقعاً تسویه‌شده','Reconciled paid orders'),number(data.revenue?.paidOrderCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('خدمات و کتاب تحویل‌شده','Verified fulfilments'),number(data.revenue?.verifiedDeliveredCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('نرخ تبدیل ارگانیک','Verified organic conversion rate'),data.organicTraffic?.qualifiedConversionRate,data.organicTraffic?.source||'UNVERIFIED')
      );
      if(pipeline && Array.isArray(pipeline.topServiceQueues) && pipeline.topServiceQueues.length){
        const detail=document.createElement('details');
        detail.className='ops-panel';
        const summary=document.createElement('summary');
        summary.textContent=t('خدمات دارای درخواست منتظر پیگیری','Services with outstanding enquiries');
        detail.append(summary);
        const list=document.createElement('ol');
        for(const item of pipeline.topServiceQueues){
          const row=document.createElement('li');
          row.textContent=String(item.serviceId||'')+' — '+String(number(item.awaitingAction)??t('نامشخص','Unknown'));
          list.append(row);
        }
        detail.append(list);
        if(pipeline.topServiceQueuesTruncated){
          const note=document.createElement('small');
          note.textContent=t('فهرست به ۶ خدمت محدود است.','The list is limited to six services.');
          detail.append(note);
        }
        view.append(detail);
      }
      status.textContent=t('آخرین پاسخ سرور: ','Server observation: ')+String(data.asOf||'')
        +' — '+t('کلیک، پیش‌نویس ایمیل یا آغاز پرداخت، درآمد قطعی محسوب نمی‌شود.','Clicks, email drafts and payment starts are never settled revenue.');
    }catch(e){
      if(generation!==requestGeneration||workspace?.hidden||document.hidden)return;
      view.replaceChildren();status.textContent=e.message==='MFA'
        ?t('ورود مدیر یا تأیید دومرحله‌ای لازم است.','Administrator session or recent MFA required.')
        :t('داده معتبر دریافت نشد؛ هیچ رقم تخمینی نمایش داده نمی‌شود.','Verified data unavailable; no estimates are shown.');
    }finally{if(generation===requestGeneration)button.disabled=false;}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      requestGeneration++;
      view.replaceChildren();
      status.textContent=t('برای مشاهده دوباره، شواهد درآمد را تازه‌سازی کنید.','Refresh protected sales evidence to view again.');
      button.disabled=false;
    }
  });
})();
