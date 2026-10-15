(()=>{
// A saved locale can preselect a label, but it must never hijack the installed
// PWA's explicit language gateway. Every new gateway visit retains both choices.
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-language-choice]');
  if(!a)return;
  const lang=a.getAttribute('data-language-choice');
  if(lang==='fa'||lang==='en') localStorage.setItem('preferred-language',lang);
});
})();

// GATEWAY PWA FLOW v4.2
(()=>{
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register(base+'sw.js?v=20261007-cache-v3-enamad',{updateViaCache:'none'}).then(reg=>{
        reg.update().catch(()=>{});
        if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
        reg.addEventListener('updatefound',()=>{
          const worker=reg.installing;
          if(!worker) return;
          worker.addEventListener('statechange',()=>{
            if(worker.state==='installed' && navigator.serviceWorker.controller){
              worker.postMessage({type:'SKIP_WAITING'});
            }
          });
        });
      }).catch(()=>{});
    });
  }
  if(standalone) return;
  let deferredPrompt=null;
  const seenKey='jr-pwa-auto-shown-v1';
  const seen=()=>{try{return localStorage.getItem(seenKey)==='1';}catch(_){try{return sessionStorage.getItem(seenKey)==='1';}catch(__){return false;}}};
  const mark=()=>{try{localStorage.setItem(seenKey,'1');}catch(_){try{sessionStorage.setItem(seenKey,'1');}catch(__){}}};
  const install=async()=>{if(!deferredPrompt)return false;const p=deferredPrompt;deferredPrompt=null;try{await p.prompt();await p.userChoice;return true;}catch(_){return false;}};
  const home=document.querySelector('footer');
  if(home){
    const area=document.createElement('div');area.className='jr-home-install';
    area.style.cssText='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px;padding:18px;';
    const button=document.createElement('button');button.type='button';button.textContent='↓ نصب اپلیکیشن · Install app';
    button.style.cssText='min-height:44px;padding:10px 22px;border-radius:999px;border:1px solid #cfb77b;background:#17253a;color:#f4e9d5;cursor:pointer;font:inherit;';
    const info=document.createElement('span');info.setAttribute('role','status');info.style.cssText='font-size:.84rem;max-width:42ch;';
    button.addEventListener('click',async()=>{if(await install())return;info.textContent=/iPhone|iPad|iPod/i.test(navigator.userAgent||'')?'Safari: Share → Add to Home Screen / اشتراک‌گذاری ← افزودن به صفحه اصلی':'Browser menu: Install app / از منوی مرورگر نصب برنامه را انتخاب کنید.';});
    area.append(button,info);home.parentNode.insertBefore(area,home);
  }
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(document.querySelector('.pwa-install')||seen()) return;
    const wrap=document.createElement('div');
    wrap.className='pwa-install';
    wrap.innerHTML='<button type="button" class="pwa-install-btn">Install app experience · نصب نسخه اپ‌مانند</button><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
    document.body.appendChild(wrap);mark();
    wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{wrap.remove();});
    wrap.querySelector('.pwa-install-btn')?.addEventListener('click',async()=>{
      if(!deferredPrompt)return;
      await install();
      wrap.remove();
    });
  });
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua)&&!seen()){
    window.addEventListener('load',()=>setTimeout(()=>{
      if(document.querySelector('.pwa-install')||seen())return;
      const wrap=document.createElement('div');
      wrap.className='pwa-install';
      wrap.innerHTML='<div class="pwa-install-btn" role="note">Share → Add to Home Screen · در Safari: اشتراک‌گذاری ← افزودن به صفحه اصلی</div><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
      document.body.appendChild(wrap);mark();
      wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{wrap.remove();});
    },1800));
  }
})();

/* Brand emblem lives beside the original merchant trust seal. */
(()=>{if(document.querySelector('script[data-jr-footer-brand-loader]'))return;const el=document.createElement('script');el.src='/assets/js/footer-brand-seal.js?v=20261016-v1';el.defer=true;el.dataset.jrFooterBrandLoader='1';document.head.append(el);})();

/* Footer provenance/copyright metadata. Public information only. */
(()=>{if(document.querySelector('script[data-jr-footer-meta-loader]'))return;const script=document.createElement('script');script.src='/assets/js/site-footer-meta-2026.js?v=20261016-v1';script.defer=true;script.dataset.jrFooterMetaLoader='1';document.head.append(script);})();
