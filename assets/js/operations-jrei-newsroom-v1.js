/* Owner JREI Newsroom: lazy, MFA-backed module in the ORIGINAL operations dashboard.
 * Opening the panel alone never activates news crawling or publishing.
 */
(function(){
 'use strict';
 const section=document.getElementById('ops-jrei-newsroom');
 const workspace=document.getElementById('ops-workspace');
 const root=section?.querySelector('[data-jrei-news-owner-root]');
 const status=section?.querySelector('[data-jrei-news-status]');
 if(!section||!workspace||!root||!status)return;
 const en=document.documentElement.lang==='en';
 const lang=en?'en':'fa';
 let revision=0,activeController=null,panel=null,csrf='';
 const t=(fa,english)=>en?english:fa;
 const visible=()=>section.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
 const report=message=>{status.textContent=message;};
 function clear(){
   ++revision;
   activeController?.abort();activeController=null;
   csrf='';panel?.unmount();panel=null;
   root.replaceChildren();
   report(t('برای دسترسی به تحریریه، این پنل را با احراز دومرحله‌ای باز کنید.',
     'Open this panel with fresh MFA to access the newsroom.'));
 }
 async function open(){
   if(!visible())return;
   const myRevision=++revision;
   activeController?.abort();activeController=new AbortController();
   const signal=activeController.signal;
   csrf='';panel?.unmount();panel=null;root.replaceChildren();
   report(t('در حال بررسی نشست امن مدیر…','Checking secure owner session…'));
   try{
     const response=await fetch('/api/admin/operations/session',{
       credentials:'same-origin',cache:'no-store',redirect:'error',signal,
       headers:{Accept:'application/json'}
     });
     if(!response.ok)throw Error('SESSION_UNAVAILABLE');
     const auth=await response.json();
     if(auth.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))
       throw Error('MFA_REQUIRED');
     if(myRevision!==revision||!visible())return;
     csrf=auth.csrfToken;
     const module=await import('/assets/js/jrei-news-owner-panel-v1.mjs?v=20261025-r1');
     if(myRevision!==revision||!visible())return;
     panel=module.mountNewsOwnerPanel({
       root,csrfResolver:()=>csrf,
       apiBase:'/api/admin/operations/jrei-news',locale:lang
     });
     report('');
     await panel.load();
   }catch(error){
     if(myRevision!==revision||error?.name==='AbortError')return;
     report(t('اتصال امن تحریریه فعلاً در دسترس نیست؛ نشست و تأیید دومرحله‌ای را بررسی کنید.',
       'Newsroom session unavailable. Check owner authentication and fresh MFA.'));
   }
 }
 section.addEventListener('toggle',()=>visible()?open():clear());
 workspace.addEventListener('jr:operations-ready',()=>{if(visible())open();});
 workspace.addEventListener('jr:operations-locked',clear);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else if(visible())open();});
 window.addEventListener('offline',clear);
})();
