/* Deferred, non-critical site enhancements extracted from site.js to retain the 25 KiB navigation performance budget. */
/* Iran-first: give HTML, CSS, first-screen images and the mobile navigation
 * first use of constrained bandwidth/CPU. Optional scripts retain identical
 * behaviour; they only enter the network after load and a bounded idle slot.
 * No idle API, background tab, and late loader are handled explicitly. */
const jrAfterFirstPaint=(task)=>{
 let started=false;
 const begin=()=>{
  if(started)return;
  started=true;
  if('requestIdleCallback' in window){
   requestIdleCallback(()=>task(),{timeout:2200});
  }else{
   setTimeout(task,700);
  }
 };
 if(document.readyState==='complete')begin();
 else window.addEventListener('load',begin,{once:true});
};
jrAfterFirstPaint(()=>{let s=document.createElement('script');s.src='/assets/js/analytics-adapter.js?v=20261020-gtm-consent-v5';s.async=true;document.head.append(s)});
jrAfterFirstPaint(()=>{
// Confidential account and assessment shells must never fetch the optional
// public concierge. No assistant code should observe a private page DOM.
const raw=location.pathname.replace(/index\.html$/,'');
const privatePrefixes=['/fa/app/','/app/','/en/account/',
 '/fa/customer-dashboard/','/fa/assessments/','/assessments/',
 '/fa/login/','/en/login/','/login/','/fa/register/','/en/register/',
 '/fa/shop/checkout/','/fa/shop/cart/','/fa/shop/payment-start/',
 '/fa/shop/payment-result/','/en/shop/checkout/','/en/shop/cart/',
 '/en/golden-talent/assessment/','/en/golden-talent/dashboard/',
 '/en/golden-talent/roles/','/en/golden-talent/observer/',
 '/en/golden-talent/student/','/fa/shop/payment-return/'];
if(privatePrefixes.some(prefix=>raw.startsWith(prefix)))return;
if(document.querySelector('script[data-jr-assistant]')) return;
const scripts=[...document.scripts];
const siteScript=scripts.find(s=>/\/assets\/js\/site\.js(?:\?|$)/.test(s.src));
if(!siteScript?.src) return;
const cssHref=new URL('../css/assistant.css?v=20261024-jrei-owned-local-first-v1',siteScript.src).href;
if(!document.querySelector('link[data-jr-assistant-style]')){
const link=document.createElement('link');
link.rel='stylesheet';
link.href=cssHref;
link.dataset.jrAssistantStyle='1';
document.head.appendChild(link);
}
const script=document.createElement('script');
script.src=new URL('assistant.js?v=20261024-jrei-owned-local-first-v1',siteScript.src).href;
script.defer=true;
script.dataset.jrAssistant='1';
document.head.appendChild(script);
});
document.addEventListener('click',async e=>{const t=e.target.closest('[data-print-cv],[data-copy-citation]');if(!t)return;if(t.hasAttribute('data-print-cv')){e.preventDefault();return print()}const v=t.dataset.copyCitation;if(!v)return;e.preventDefault();const o=t.textContent,n=document.documentElement.lang==='fa'?'کپی شد':'Copied';try{await navigator.clipboard.writeText(v)}catch(_){const a=document.createElement('textarea');a.value=v;a.hidden=true;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(_e){}a.remove()}t.classList.add('is-copied');t.textContent=n;setTimeout(()=>{t.classList.remove('is-copied');t.textContent=o},1800)});
(()=>{let h=document.head,a=(r,u)=>{if(!h.querySelector('link[rel="'+r+'"]')){let l=document.createElement('link');l.rel=r;l.href=u;h.append(l)}};a('icon','/favicon.png?v=42');a('apple-touch-icon','/assets/images/pwa-icon-192.png?v=42')})();

(function(){
if(document.querySelector('.enamad-visible-seal, a[href="https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1"]')) return;
const footer=document.querySelector('footer');
if(!footer) return;
const holder=document.createElement('div');
holder.innerHTML="<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1'><img src='/assets/images/enamad-trust-symbol.svg' alt='نماد اعتماد الکترونیکی' style='cursor:pointer;max-width:110px;height:auto' code='sealMJydDpzqNid1Ty82Y90Ef6SZLah1'></a>";
footer.appendChild(holder);
})();

// Avoid downloading a 20KB mobile module on journal and private workspace
// routes where that very module would immediately exit without rendering.
(()=>{
 const raw=location.pathname.replace(/index\.html$/,'');
 const base='/drjavadrezazadeh.com/';
 const route=raw.includes(base)?'/'+raw.split(base)[1]:raw;
 const excluded=['/fa/app/','/app/','/en/account/','/fa/assessments/',
  '/assessments/','/en/golden-talent/assessment/','/en/golden-talent/dashboard/',
  '/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/'];
 if(route.startsWith('/journal/')||excluded.some(prefix=>route.startsWith(prefix)))return;
 import('/assets/js/mobile-app-v431.js?v=20261022-need-primary-nav-v1');
})();

/* Existing SW lifecycle: notify open installed app sessions after an update. */
jrAfterFirstPaint(()=>{
if(!('serviceWorker' in navigator)||document.querySelector('[data-jr-release-notice-loader]'))return;
const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/pwa-release-notice.css?v=20261019-v1';css.dataset.jrReleaseNoticeLoader='1';document.head.append(css);
const js=document.createElement('script');js.src='/assets/js/pwa-release-notice.js?v=20261019-v1';js.defer=true;document.head.append(js);
});

/* Desktop installed PWA: prevent text from collapsing into narrow dashboard columns. */
(()=>{
if(!window.matchMedia?.('(display-mode:standalone) and (min-width:700px)').matches)return;
if(!document.querySelector('[data-jr-desktop-pwa-css]')){
const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/pwa-desktop-layout-v52.css?v=20261019-v1';css.dataset.jrDesktopPwaCss='1';document.head.append(css);
}
})();

/* Brand emblem lives beside the original merchant trust seal. */
jrAfterFirstPaint(()=>{if(document.querySelector('script[data-jr-footer-brand-loader]'))return;const el=document.createElement('script');el.src='/assets/js/footer-brand-seal.js?v=20261016-v1';el.defer=true;el.dataset.jrFooterBrandLoader='1';document.head.append(el);});

/* Footer provenance/copyright metadata. Public information only. */
jrAfterFirstPaint(()=>{if(document.querySelector('script[data-jr-footer-meta-loader]'))return;const script=document.createElement('script');script.src='/assets/js/site-footer-meta-2026.js?v=20261016-public-version-v2';script.defer=true;script.dataset.jrFooterMetaLoader='1';document.head.append(script);});

/* Permanent manual PWA installation entry near the homepage footer.
   Auto-prompt remains capped to once; visitors can always request installation. */
(()=>{
const raw=location.pathname.replace(/index\.html$/,'');
const path=raw.includes('/drjavadrezazadeh.com/')?'/'+raw.split('/drjavadrezazadeh.com/')[1]:raw;
if(!/^\/(?:fa|en)\/?$/.test(path)||window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true)return;
const footer=document.querySelector('footer');
if(!footer||document.querySelector('[data-jr-home-install]'))return;
const fa=document.documentElement.lang==='fa';
const area=document.createElement('div');area.dataset.jrHomeInstall='1';
area.style.cssText='display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:22px auto;padding:16px;text-align:center;max-width:840px;';
const button=document.createElement('button');button.type='button';
button.textContent=fa?'↓ نصب اپلیکیشن وب‌سایت':'↓ Install the website app';
button.style.cssText='font:inherit;min-height:48px;padding:11px 24px;border-radius:999px;border:1px solid #c9aa72;color:#f9efd9;background:#15273b;cursor:pointer;';
const note=document.createElement('small');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
note.style.cssText='font-size:.85rem;line-height:1.7;max-width:430px;';
button.addEventListener('click',async()=>{
 const available=typeof window.jrPwaRequest==='function';
 if(available&&await window.jrPwaRequest())return;
 note.textContent=/iPhone|iPad|iPod/i.test(navigator.userAgent||'')
  ?(fa?'در Safari: اشتراک‌گذاری ← افزودن به صفحه اصلی':'In Safari: Share → Add to Home Screen')
  :(fa?'از منوی مرورگر، نصب برنامه یا افزودن به صفحه اصلی را انتخاب کنید.':'Open your browser menu and select Install app or Add to Home Screen.');
});
area.append(button,note);footer.parentNode.insertBefore(area,footer);
})();

/* Pilot for individual Persian scholarly articles only; HTTP 503 hides unavailable service. */
(()=>{
 const path=location.pathname.replace(/index\.html$/,'');
 if(!/^\/fa\/(?:akhbar|rahnamaha)\/[a-z0-9-]+\/$/.test(path)||document.querySelector('[data-jr-community-loader]'))return;
 // The public JS checks the server feature gate before requesting its stylesheet.
 // Disabled communities no longer download an unused style layer on every article.
 const script=document.createElement('script');
 script.src='/assets/js/community-comments.js?v=20261026-community-r3';
 script.defer=true;script.dataset.jrCommunityLoader='1';
 document.head.append(script);
})();

/* Bilingual public USDT/toman calculator: informational only, never a money quote. */
jrAfterFirstPaint(()=>{
 const path=location.pathname.replace(/index\.html$/,'');
 if(!/^\/(?:fa|en)\/(?:shop|services|khadamat|support-talented-students)\/$/.test(path))return;
 if(document.querySelector('[data-jr-fx-loader]'))return;
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/assets/css/jr-public-fx-converter.css?v=20261016-v1';stylesheet.dataset.jrFxLoader='1';document.head.append(stylesheet);
 const js=document.createElement('script');js.src='/assets/js/jr-public-fx-converter.js?v=20261016-v1';js.defer=true;document.head.append(js);
});

/* Bilingual homepage portrait micro-interaction: pointer-only, no tracking/storage.
 * RAF throttling; no moving content for touch or reduced-motion visitors.
 */
(()=>{
 const root=document.body;
 if(!root?.classList.contains('public-home-page'))return;
 const portrait=root.querySelector('.hero .portrait-shell');
 if(!portrait||typeof window.matchMedia!=='function')return;
 const pointer=window.matchMedia('(hover:hover) and (pointer:fine)');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(!pointer.matches||reduced.matches)return;
 let pending=null,frame=0;
 const reset=()=>{
  pending=null;
  if(frame)cancelAnimationFrame(frame);
  frame=0;
  for(const key of ['--jr-home-rotate-x','--jr-home-rotate-y','--jr-home-light-x','--jr-home-light-y']){
   portrait.style.removeProperty(key);
  }
 };
 const draw=()=>{
  frame=0;
  if(!pending||reduced.matches||!pointer.matches){reset();return}
  const rect=portrait.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const nx=Math.max(-1,Math.min(1,2*(pending.x-rect.left)/rect.width-1));
  const ny=Math.max(-1,Math.min(1,2*(pending.y-rect.top)/rect.height-1));
  portrait.style.setProperty('--jr-home-rotate-y',(nx*2.8).toFixed(2)+'deg');
  portrait.style.setProperty('--jr-home-rotate-x',(-ny*2.8).toFixed(2)+'deg');
  portrait.style.setProperty('--jr-home-light-x',(50+nx*22).toFixed(2)+'%');
  portrait.style.setProperty('--jr-home-light-y',(35+ny*20).toFixed(2)+'%');
 };
 portrait.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||reduced.matches||!pointer.matches)return;
  pending={x:event.clientX,y:event.clientY};
  if(!frame)frame=requestAnimationFrame(draw);
 },{passive:true});
 portrait.addEventListener('pointerleave',reset);
 portrait.addEventListener('pointercancel',reset);
 window.addEventListener('blur',reset);
 reduced.addEventListener?.('change',reset);
 pointer.addEventListener?.('change',reset);
})();
