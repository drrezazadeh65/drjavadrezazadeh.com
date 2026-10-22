/* JR BAHAR public study starter v1.
 * Privacy: all inputs remain in this browser tab's memory. No network requests,
 * localStorage, cookies, analytics hooks, AI prompts or server submissions.
 * Educational templates, never diagnostic assessments or validated advice.
 */
(() => {
  'use strict';
  const form = document.getElementById('bahar-plan');
  if (!form) return;
  const lang=document.documentElement.lang==='en'?'en':'fa';
  const strings={
    fa:{
      incomplete:'لطفاً تاریخ، هدف، اقدام کوچک و شواهد قابل مشاهده را تکمیل کنید.',
      invalid:'تاریخ باید معتبر باشد و متن هر فیلد از ۵۰۰ نویسه بیشتر نباشد.',
      saved:'طرح شما فقط در همین صفحه و حافظه موقت مرورگر آماده شد؛ در حساب کاربری ذخیره نشده است.',
      reset:'تمام داده‌های این فرم از صفحه پاک شدند.',
      privacy:'این برنامه یک طرح اولیه شخصی و قابل بازنگری است، نه تشخیص یا پیش‌بینی موفقیت.',
      date:'هفته آغازین',goal:'هدف من',action:'اقدام قابل مشاهده',evidence:'شواهد برای بازنگری',
      progress:n=>`${n} از ۲ فعالیت مقدماتی انجام شده است.`
    },
    en:{
      incomplete:'Enter a starting date, goal, small action and observable evidence.',
      invalid:'Use a valid date and keep each field below 500 characters.',
      saved:'Your plan is ready in this page only. It has not been saved to your account.',
      reset:'All form data was cleared from this page.',
      privacy:'This is a provisional, revisable personal plan—not a diagnosis or prediction of success.',
      date:'Week starts',goal:'My goal',action:'Observable action',evidence:'Evidence to review',
      progress:n=>`${n} of 2 introductory activities completed.`
    }
  }[lang];
  const $=id=>document.getElementById(id);
  const status=$('form-status'),summary=$('plan-summary'),progress=$('learning-progress');
  const required=['week-start','learning-goal','learning-action','learning-evidence'];
  const pad=n=>String(n).padStart(2,'0');
  function dateValid(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [y,m,d]=value.split('-').map(Number);
    const parsed=new Date(Date.UTC(y,m-1,d));
    return parsed.getUTCFullYear()===y&&parsed.getUTCMonth()+1===m&&parsed.getUTCDate()===d;
  }
  function showStatus(message,invalid=false){
    status.textContent=message;
    status.hidden=false;
    status.setAttribute('role',invalid?'alert':'status');
  }
  function updateProgress(){
    const count=[...document.querySelectorAll('[data-bahar-task]')].filter(x=>x.checked).length;
    progress.textContent=strings.progress(count);
  }
  document.querySelectorAll('[data-bahar-task]').forEach(box=>box.addEventListener('change',updateProgress));
  updateProgress();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const values=required.map(id=>$(id).value.trim());
    if(values.some(v=>!v)){summary.hidden=true;showStatus(strings.incomplete,true);return;}
    if(values.some(v=>v.length>500)||!dateValid(values[0])){summary.hidden=true;showStatus(strings.invalid,true);return;}
    const lines=[strings.date+': '+values[0],strings.goal+': '+values[1],
      strings.action+': '+values[2],strings.evidence+': '+values[3],
      '',strings.privacy];
    // textContent deliberately prevents HTML/script injection from user entries.
    summary.textContent=lines.join('\n');summary.hidden=false;
    showStatus(strings.saved);summary.focus();
  });
  $('clear-plan').addEventListener('click',()=>{
    form.reset();
    summary.textContent='';summary.hidden=true;updateProgress();
    showStatus(strings.reset);
    $('learning-goal').focus();
  });
  $('print-plan').addEventListener('click',()=>{
    if(summary.hidden){showStatus(strings.incomplete,true);return;}
    window.print();
  });
})();
