(()=>{
const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
const preferred=localStorage.getItem('preferred-language');
if(standalone && (preferred==='fa'||preferred==='en')){
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  const target=base+preferred+'/';
  if(location.pathname!==target){location.replace(target);return}
}
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
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(document.querySelector('.pwa-install')||sessionStorage.getItem('pwa-install-dismissed')==='1') return;
    const wrap=document.createElement('div');
    wrap.className='pwa-install';
    wrap.innerHTML='<button type="button" class="pwa-install-btn">Install app experience · نصب نسخه اپ‌مانند</button><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{sessionStorage.setItem('pwa-install-dismissed','1');wrap.remove();});
    wrap.querySelector('.pwa-install-btn')?.addEventListener('click',async()=>{
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice;}catch(e){}
      deferredPrompt=null;
      wrap.remove();
    });
  });
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua)&&sessionStorage.getItem('ios-install-dismissed')!=='1'){
    window.addEventListener('load',()=>setTimeout(()=>{
      if(document.querySelector('.pwa-install'))return;
      const wrap=document.createElement('div');
      wrap.className='pwa-install';
      wrap.innerHTML='<div class="pwa-install-btn" role="note">Share → Add to Home Screen · در Safari: اشتراک‌گذاری ← افزودن به صفحه اصلی</div><button type="button" class="pwa-install-close" aria-label="Close">×</button>';
      document.body.appendChild(wrap);
      wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{sessionStorage.setItem('ios-install-dismissed','1');wrap.remove();});
    },1800));
  }
})();

(function(){
const href='https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1';
if(!document.getElementById('jr-enamad-gateway-style')){
 const s=document.createElement('style');s.id='jr-enamad-gateway-style';
 s.textContent='.enamad-footer-seal a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;text-decoration:none!important}.enamad-footer-seal a:before{content:"اینماد\\A نماد اعتماد الکترونیکی";white-space:pre;text-align:center;color:#e2c886;font:700 13px/1.65 Tahoma,Arial,sans-serif;direction:rtl}.enamad-footer-seal img{position:absolute!important;inset:0!important;margin:auto!important}.enamad-footer-seal img.jr-seal-fallback{display:none!important}';
 document.head.appendChild(s);
}
const wrap=document.querySelector('.enamad-footer-seal'); if(!wrap)return;
const a=wrap.querySelector('a');if(a){a.href=href;a.target='_blank';a.removeAttribute('rel');a.setAttribute('aria-label','مشاهده اعتبار نماد اعتماد الکترونیکی');}
const img=wrap.querySelector('img');if(img){img.addEventListener('error',()=>img.classList.add('jr-seal-fallback'),{once:true});}
})();
