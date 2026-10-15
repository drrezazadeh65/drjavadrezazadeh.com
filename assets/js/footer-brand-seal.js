/* Official site identity beside the existing independent eNAMAD seal.
   Does not alter trust URL, merchant claim or badge image. */
(()=>{'use strict';
const footer=document.querySelector('footer');if(!footer||footer.querySelector('[data-jr-footer-brand]'))return;
const trust=footer.querySelector('a[href*="trustseal.enamad.ir/"]');
if(!trust||!trust.parentElement)return;
const lang=(document.documentElement.lang||'').toLowerCase();
const brand=document.createElement('a');brand.href=lang==='fa'?'/fa/':lang==='en'?'/en/':'/';
brand.setAttribute('data-jr-footer-brand','1');
brand.setAttribute('aria-label',lang==='fa'?'نشان رسمی وبگاه دکتر جواد رضازاده یزدلی':'Official Dr. Javad Rezazadeh Yazdeli website identity');
brand.style.cssText='display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;width:86px;height:86px;max-width:24vw;border:1px solid rgba(199,163,91,.5);border-radius:14px;padding:7px;background:#0b111a;box-sizing:border-box;';
const image=document.createElement('img');image.src='/favicon.svg';image.width=72;image.height=72;
image.alt=lang==='fa'?'لوگوی رسمی دکتر جواد رضازاده یزدلی':'Official website logo';
image.loading='lazy';image.decoding='async';image.style.cssText='width:100%;height:100%;object-fit:contain;';
brand.append(image);
const holder=trust.parentElement;
holder.style.display='flex';holder.style.alignItems='center';holder.style.justifyContent='center';holder.style.gap='16px';holder.style.flexWrap='wrap';
holder.insertBefore(brand,trust);
})();