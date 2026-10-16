/* JR global footer metadata — no admin/private state or cache fingerprints.
   Domain date: owner-confirmed 2022-11-18; official registry readback pending.
   Product version: owner-requested public v5.1.0 label; independent from deploy SHA. */
(()=>{'use strict';
const footer=document.querySelector('footer');
if(!footer || footer.querySelector('[data-jr-footer-legal]'))return;
const fa=(document.documentElement.lang||'').toLowerCase()==='fa';
const currentYear=new Date().getFullYear();
const holder=document.createElement('section');holder.dataset.jrFooterLegal='true';
holder.className='jr-footer-legal';
holder.setAttribute('aria-label',fa?'حقوق نشر و اطلاعات وبگاه':'Copyright and website details');
holder.style.cssText='width:100%;max-width:1120px;margin:20px auto 0;padding:18px clamp(14px,3vw,28px);border-top:1px solid rgba(199,163,91,.29);text-align:center;color:#cfc8b9;line-height:1.95;font-size:.85rem;box-sizing:border-box;';
const line=(text)=>{const p=document.createElement('p');p.textContent=text;p.style.margin='0 0 7px';return p};
if(!footer.textContent.includes('©'))holder.append(line(fa?'© ۲۰۲۲–'+String(currentYear)+' دکتر جواد رضازاده یزدلی. کلیه حقوق محفوظ است.':'© 2022–'+currentYear+' Dr. Javad Rezazadeh Yazdeli. All rights reserved.'));
holder.append(line(fa?'هرگونه تکثیر، بهره‌برداری تجاری یا بازنشر مطالب، تصاویر و طراحی اختصاصی سایت بدون مجوز کتبی، جز در موارد مجاز قانونی، ممنوع است و می‌تواند مطابق قوانین مربوط پیگیری حقوقی داشته باشد.':'Reproduction, commercial use, or republication of the site’s original text, imagery or design without written permission is prohibited, except where permitted by law, and may be subject to legal action.'));
const meta=document.createElement('p');meta.className='jr-footer-metadata';meta.style.cssText='margin:8px 0 0;color:#b5b1aa;display:flex;gap:10px 20px;justify-content:center;flex-wrap:wrap;';
const date=document.createElement('span');date.textContent=fa?'تاریخ ثبت دامنه: ۱۸ نوامبر ۲۰۲۲':'Domain registration date: 18 November 2022';
// Public product version is owner-specified; deployment fingerprints belong only
// in privileged technical release evidence, never public footer copy.
const version=document.createElement('span');
version.dataset.jrPublicVersion='5.1.0';
version.textContent=fa?'نسخه وب‌سایت: ۵.۱.۰':'Website version: 5.1.0';
meta.append(date,version);holder.append(meta);
footer.append(holder);
})();