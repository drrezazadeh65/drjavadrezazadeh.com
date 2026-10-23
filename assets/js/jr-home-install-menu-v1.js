/* Four-route home mobile dock stays unchanged. Installation is an explicit,
 * accessible secondary action in the EXISTING menu; no duplicate dock icon,
 * no automatic prompt and no claim that a PWA was installed. */
(() => {
  'use strict';
  if (!document.body.classList.contains('public-home-page')) return;
  const sheet=document.querySelector('#mobile-app-menu .app-sheet-panel');
  if (!sheet || sheet.querySelector('[data-jr-dock-install]')) return;
  const standalone=() => navigator.standalone===true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches===true;
  if (standalone()) return;
  const fa=document.documentElement.lang==='fa';
  const button=document.createElement('button');
  button.type='button';
  button.className='jr-home-install-action';
  button.setAttribute('data-jr-dock-install','');
  button.setAttribute('aria-label',fa?'نصب اپلیکیشن':'Install website app');
  button.textContent=fa?'نصب اپلیکیشن روی دستگاه':'Install website app';
  const help=document.createElement('p');
  help.className='jr-home-install-guidance';
  help.setAttribute('data-jr-install-help','');
  help.setAttribute('role','status');
  help.setAttribute('aria-live','polite');
  help.hidden=true;
  button.addEventListener('click',async()=>{
    if(standalone()){
      button.remove();
      return;
    }
    button.disabled=true;
    let requested=false;
    try {
      if(typeof window.jrPwaRequest==='function')
        requested=(await window.jrPwaRequest())===true;
    }catch{}
    if(!sheet.isConnected)return;
    help.textContent=requested
      ?(fa?'درخواست نصب به مرورگر ارسال شد. مراحل اعلام‌شده را در مرورگر کامل کنید.':
        'The install request was sent to the browser. Follow its on-screen instructions.')
      :(fa?'برای افزودن این سایت به صفحه اصلی، از منوی مرورگر گزینه «افزودن به صفحه اصلی» یا «نصب برنامه» را انتخاب کنید.':
        'To add this site to your home screen, open your browser menu and choose “Add to Home screen” or “Install app”.');
    help.hidden=false;
    button.disabled=false;
  });
  const area=document.createElement('div');
  area.className='jr-home-install-area';
  area.append(button,help);
  sheet.append(area);
})();