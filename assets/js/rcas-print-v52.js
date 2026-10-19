/* RCAS printable, strictly client-side self-reflection; no raw-answer upload.
   The existing Persian and English flow engines own validation, not this UI.
   A printed document is controlled by the user and is not a professional report.
*/
(()=>{
  'use strict';
  const fa=document.documentElement.lang==='fa';
  const output=document.getElementById(fa?'rcasResult':'rcasEnResult');
  if(!output||!output.parentElement)return;
  if(document.querySelector('[data-rcas-print]'))return;
  const button=document.createElement('button');
  button.type='button';button.className='button rcas-print-control';
  button.setAttribute('data-rcas-print','');
  button.textContent=fa?'چاپ یا ذخیره PDF مرور شخصی':'Print or save personal reflection as PDF';
  button.hidden=true;
  const note=document.createElement('p');note.className='rcas-print-privacy';
  note.textContent=fa?
    'نسخه چاپی صرفاً بازتاب پاسخ‌های همین نشست است؛ اعتبارسنجی روان‌سنجی یا تأیید تخصصی محسوب نمی‌شود. پیش از چاپ یا اشتراک، اطلاعات شخصی را بررسی کنید.':
    'This printout reflects only this session. It is not a validated psychometric or professional report. Review private details before saving or sharing.';
  note.hidden=true;
  output.insertAdjacentElement('afterend',note);
  output.insertAdjacentElement('afterend',button);
  const refresh=()=>{
    const hasReport=!output.hidden&&Boolean(output.querySelector('h3'));
    button.hidden=!hasReport;note.hidden=!hasReport;
  };
  button.addEventListener('click',()=>{
    if(!button.hidden&&window.confirm(fa?
      'آیا مایلید این مرور خودگزارشی را چاپ یا به‌صورت PDF ذخیره کنید؟ فقط نسخه‌ای که خودتان نگه می‌دارید ایجاد می‌شود.':
      'Print or save this self-reported reflection? Only the copy you choose to save is created.'
    ))window.print();
  });
  const observer=new MutationObserver(refresh);
  observer.observe(output,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:false});
  refresh();
})();
