/* Public learning pages: common PWA registration and non-disruptive update notice.
 * Does not display installation prompts, track learners, save personal data,
 * cache private documents or force reload while a worksheet is being edited.
 * Existing site-wide install prompt (home only) remains the sole owner.
 */
(() => {
  'use strict';
  if(!('serviceWorker' in navigator))return;
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  const en=document.documentElement.lang==='en';
  const T=(faText,enText)=>en?enText:faText;
  let seenController=null,notice=null;
  function show(){
    if(notice || document.querySelector('[data-jr-pwa-new-version]'))return;
    notice=document.createElement('aside');
    notice.dataset.jrPwaNewVersion='1';
    notice.setAttribute('role','status');
    notice.setAttribute('aria-label',T('نسخه تازه وب‌اپلیکیشن','Website update available'));
    const p=document.createElement('p');
    p.textContent=T('نسخه جدید آماده است. برای حفظ کاربرگ باز، هر زمان آماده بودید آن را به‌روزرسانی کنید.',
      'An update is ready. Finish or export your open worksheet before refreshing.');
    const button=document.createElement('button');
    button.type='button';
    button.textContent=T('بارگذاری نسخه جدید','Reload new version');
    button.addEventListener('click',()=>location.reload());
    const close=document.createElement('button');
    close.type='button';
    close.textContent=T('بعداً','Later');
    close.setAttribute('aria-label',T('بستن پیام به‌روزرسانی','Dismiss update notice'));
    close.addEventListener('click',()=>{notice?.remove();notice=null;});
    notice.append(p,button,close);
    notice.style.cssText='position:fixed;z-index:30;inset-inline:12px;bottom:calc(86px + env(safe-area-inset-bottom));max-width:540px;margin-inline:auto;background:#20252b;color:#fff4de;border:1px solid #d9bd83;border-radius:16px;padding:14px;box-shadow:0 8px 36px #0009;line-height:1.6';
    button.style.cssText='min-height:44px;padding:9px 13px;margin:6px;border:1px solid #ddbf7e;border-radius:10px;background:#ddbf7e;color:#181510;font:inherit;font-weight:700';
    close.style.cssText='min-height:44px;padding:9px 13px;border:1px solid #ddbf7e;border-radius:10px;background:transparent;color:#fff4de;font:inherit';
    document.body.append(notice);
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!seenController){seenController=navigator.serviceWorker.controller;return;}
    show();
  });
  window.addEventListener('load',async()=>{
    if(!/^https?:$/.test(location.protocol))return;
    seenController=navigator.serviceWorker.controller;
    try{
      const registration=await navigator.serviceWorker.register(base+'sw.js',{updateViaCache:'none'});
      await registration.update();
    }catch(_){/* Offline registration failures must not interrupt study tools. */}
  },{once:true});
})();
