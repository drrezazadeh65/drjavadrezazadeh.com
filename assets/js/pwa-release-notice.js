/* JR installed-app update notification v1: safe, non-intrusive, no private storage.
 * The Bertina release workflow stamps the service-worker cache family by commit.
 * Existing tabs must not silently refresh while users are filling in forms.
 */
(()=>{
 'use strict';
 if(!('serviceWorker' in navigator)||document.documentElement.dataset.jrPwaUpdateNotice)return;
 document.documentElement.dataset.jrPwaUpdateNotice='1';
 const fa=document.documentElement.lang==='fa';
 let hadController=Boolean(navigator.serviceWorker.controller);
 let announced=false;
 const say=(f,e)=>fa?f:e;
 const root=()=>{
  if(announced||!document.body)return;
  announced=true;
  const panel=document.createElement('aside');
  panel.className='jr-release-update';
  panel.setAttribute('role','status');
  panel.setAttribute('aria-live','polite');
  panel.setAttribute('aria-label',say('به‌روزرسانی وب‌سایت','Website update'));
  const message=document.createElement('span');
  message.textContent=say('نسخه تازه آماده است. برای مشاهده تغییرات، صفحه را بازخوانی کنید. داده‌های ذخیره‌نشده فرم‌ها ممکن است از دست بروند.','A new version is ready. Refresh to see the changes. Unsaved form entries may be lost.');
  const action=document.createElement('button');
  action.type='button';
  action.textContent=say('بازخوانی نسخه تازه','Refresh to update');
  action.addEventListener('click',()=>{
   if(document.querySelector('form')&&!window.confirm(say('صفحه بازخوانی شود؟ اطلاعات ذخیره‌نشده ممکن است از بین برود.','Refresh this page? Unsaved form entries may be lost.')))return;
   location.reload();
  });
  const dismiss=document.createElement('button');
  dismiss.type='button';
  dismiss.className='jr-release-update-close';
  dismiss.setAttribute('aria-label',say('بستن پیام به‌روزرسانی','Dismiss update notice'));
  dismiss.textContent='×';
  dismiss.addEventListener('click',()=>{panel.remove();announced=false});
  panel.append(message,action,dismiss);
  document.body.append(panel);
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(hadController)root();
  hadController=true;
 });
 // site.js already checks the service worker at every fresh launch.
 // Reuse this bounded read-only check for a visible, user-triggered action.
 // No forced reload, private-data storage, new registration or notification spam.
 let inFlight=null;
 const checkForUpdates=()=>{
  if(inFlight)return inFlight;
  inFlight=navigator.serviceWorker.getRegistration()
   .then(async reg=>{
    if(!reg)return 'unavailable';
    await reg.update();
    return 'checked';
   }).catch(()=> 'unavailable').finally(()=>{inFlight=null});
  return inFlight;
 };
 window.jrPwaCheckForUpdates=checkForUpdates;
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')void checkForUpdates();
 });
})();
