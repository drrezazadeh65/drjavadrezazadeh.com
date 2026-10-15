/* Golden Path: read-only, same-tab RCAS focus continuity.
 * A user-selected exploratory route is NOT a validated profile, secure record,
 * professional report, diagnostic score or entitlement. Never send personal data. */
(()=>{
 'use strict';
 const root=document.querySelector('[data-golden-path-session]');
 if(!root)return;
 const en=document.documentElement.lang==='en';
 const status=root.querySelector('[data-golden-path-session-status]');
 if(!status)return;
 const hint=en
  ?'No current-tab RCAS route is available. You can begin the free reflection; no personal record is loaded.'
  :'مسیر انتخاب‌شده‌ای از نشست فعلی RCAS در دسترس نیست. می‌توانید بازاندیشی رایگان را آغاز کنید؛ هیچ پرونده شخصی بارگذاری نمی‌شود.';
 status.textContent=hint;
 let value=null;
 try{value=JSON.parse(sessionStorage.getItem('gt_rcas_state')||'null');}catch(_){}
 const requiredRevision=en?'start-en-pilot-1':'start-1.2';
 if(!value||value.completed!==true||value.rcasRevision!==requiredRevision||
    value.completedItemCount!==28||value.p0Validated!==true||
    value.routingEvidenceCompleted!==true||value.routeBasis!=='SELF_SELECTED_UNVALIDATED')
  return;
 const route=String(value.route||'');
 if(!/^D[1-6]$/.test(route))return;
 status.textContent=en
  ?'Your current-tab RCAS reflection contains a self-selected focus: '+route+
   '. This is an exploratory choice, not a talent score, verified profile, professional interpretation or recommended career. Consider more than one possible path and collect independent evidence before deciding.'
  :'در بازاندیشی RCAS در همین نشست، حوزه '+route+
   ' را خودتان برای بررسی بیشتر انتخاب کرده‌اید. این انتخاب نه نمره استعداد است، نه نمایه تأییدشده، نه تفسیر حرفه‌ای یا توصیه قطعی رشته و شغل. چند مسیر ممکن را باز نگه دارید و پیش از تصمیم‌گیری شواهد مستقل گردآوری کنید.';
})();
