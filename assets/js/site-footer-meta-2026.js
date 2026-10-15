/* JR global footer metadata — no admin/private state, no invented release version.
   Domain date: owner-confirmed 2022-11-18; official registry readback pending.
   Release identifier: public service-worker cache signature, labelled accordingly. */
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
const version=document.createElement('span');version.textContent=fa?'شناسه نسخه فنی: در حال بررسی':'Technical build ID: checking';meta.append(date,version);holder.append(meta);
footer.append(holder);
/* The sw.js immutable cache label is an observable build identifier, not a verified semantic release number. */
fetch('/sw.js',{cache:'no-store',credentials:'omit',headers:{Accept:'text/javascript'}})
 .then(async r=>{if(!r.ok||r.url&&new URL(r.url).origin!==location.origin)throw Error('unavailable');return (await r.text()).slice(0,900);})
 .then(s=>{
  const match=s.match(/const\s+CACHE_VERSION\s*=\s*['"](jr-site-[A-Za-z0-9._-]{1,105})['"]/);
  if(!match)throw Error('unavailable');
  const id=match[1].slice('jr-site-'.length);
  version.textContent=(fa?'شناسه نسخه فنی: ':'Technical build ID: ')+id;
  version.title=fa?'شناسه استخراج‌شده از نسخه خدمت‌رسان PWA؛ جایگزین تأیید انتشار سمت سرور نیست.':'Identifier read from the live PWA service worker; not independently verified as server deployment SHA.';
 })
 .catch(()=>{version.textContent=fa?'شناسه نسخه فنی: نامشخص':'Technical build ID: unavailable';});
})();