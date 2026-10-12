/* Stage14: MFA-only read-only growth report. Unknown != zero. */
(() => {
  'use strict';
  const button=document.querySelector('[data-ops-growth-refresh]');
  const status=document.querySelector('[data-ops-growth-status]');
  const view=document.querySelector('[data-ops-growth-results]');
  if(!button||!status||!view)return;
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
    if(document.querySelector('#ops-workspace')?.hidden)return;
    button.disabled=true;view.replaceChildren();status.textContent=t('در حال بررسی شواهد واقعی سرور…','Checking server evidence…');
    try{
      const response=await fetch('/api/admin/operations/growth',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'MFA':'UNAVAILABLE');
      const data=await response.json();if(!data.ok||data.schema!=='stage14-growth-evidence-v1')throw new Error('UNAVAILABLE');
      const counts=data.leadMetrics?.counts||null;
      view.append(
        cell(t('درخواست‌های ثبت‌شده با رضایت','Consented intake records'),number(counts?.total),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های نیازمند بررسی','New intake requests'),number(counts?.new),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های واجد شرایط','Qualified intake requests'),number(counts?.qualified),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('لغو رضایت','Consent withdrawals'),number(counts?.withdrawn),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درآمد خالص تسویه‌شده (تومان)','Net bank-settled revenue (toman)'),number(data.revenue?.netSettledToman),data.revenue?.status||'UNVERIFIED'),
        cell(t('سفارش‌های واقعاً تسویه‌شده','Reconciled paid orders'),number(data.revenue?.paidOrderCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('خدمات و کتاب تحویل‌شده','Verified fulfilments'),number(data.revenue?.verifiedDeliveredCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('نرخ تبدیل ارگانیک','Verified organic conversion rate'),data.organicTraffic?.qualifiedConversionRate,data.organicTraffic?.source||'UNVERIFIED')
      );
      status.textContent=t('آخرین پاسخ سرور: ','Server observation: ')+String(data.asOf||'')
        +' — '+t('کلیک، پیش‌نویس ایمیل یا آغاز پرداخت، درآمد قطعی محسوب نمی‌شود.','Clicks, email drafts and payment starts are never settled revenue.');
    }catch(e){
      view.replaceChildren();status.textContent=e.message==='MFA'
        ?t('ورود مدیر یا تأیید دومرحله‌ای لازم است.','Administrator session or recent MFA required.')
        :t('داده معتبر دریافت نشد؛ هیچ رقم تخمینی نمایش داده نمی‌شود.','Verified data unavailable; no estimates are shown.');
    }finally{button.disabled=false;}
  });
})();
