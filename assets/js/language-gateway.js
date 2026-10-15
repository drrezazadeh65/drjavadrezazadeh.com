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
  const jrPwaKey='jr-pwa-auto-shown-v1';
  const read=key=>{try{return localStorage.getItem(key);}catch(_){try{return sessionStorage.getItem(key);}catch(__){return null;}}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch(_){try{sessionStorage.setItem(key,value);}catch(__){}}};
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(document.querySelector('.pwa-install')||read(jrPwaKey)==='1') return;
    write(jrPwaKey,'1');
    const wrap=document.createElement('div');
    wrap.className='pwa-install';
    wrap.innerHTML='<button type="button" class="pwa-install-btn">Install app experience · نصب نسخه اپ‌مانند</button><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{write(jrPwaKey,'1');wrap.remove();});
    wrap.querySelector('.pwa-install-btn')?.addEventListener('click',async()=>{
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice;}catch(e){}
      deferredPrompt=null;
      wrap.remove();
    });
  });
  const trigger=document.createElement('button');trigger.type='button';trigger.textContent='نصب اپلیکیشن · Install app';trigger.setAttribute('aria-label','نصب اپلیکیشن / Install app');
  trigger.style.cssText='min-height:44px;padding:10px 20px;border:1px solid #bda778;border-radius:999px;background:#19283b;color:#f5eddc;font:inherit;cursor:pointer;';
  if(document.querySelector('footer')){const area=document.createElement('div');area.style.cssText='display:flex;justify-content:center;padding:14px;';area.append(trigger);document.querySelector('footer').parentNode.insertBefore(area,document.querySelector('footer'));}
  trigger.addEventListener('click',async()=>{if(deferredPrompt){try{await deferredPrompt.prompt();await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;write(jrPwaKey,'1');}else{const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||'');window.alert(ios?'Safari: Share → Add to Home Screen / اشتراک‌گذاری ← افزودن به صفحه اصلی':'Use your browser menu to install the app / از منوی مرورگر، نصب برنامه را انتخاب کنید.');}});
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua)&&read(jrPwaKey)!=='1'){
    window.addEventListener('load',()=>setTimeout(()=>{
      if(document.querySelector('.pwa-install'))return;
      write(jrPwaKey,'1');
      const wrap=document.createElement('div');
      wrap.className='pwa-install';
      wrap.innerHTML='<div class="pwa-install-btn" role="note">Share → Add to Home Screen · در Safari: اشتراک‌گذاری ← افزودن به صفحه اصلی</div><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
      document.body.appendChild(wrap);
      wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{write(jrPwaKey,'1');wrap.remove();});
    },1800));
  }
})();
