/* Local worksheet: isolated from account, network, persistence and prediction. */
import {calculateExamPercentage} from './jr-konkur-percentage-v1.mjs';
const form=document.getElementById('pc-form');
if(form){
 const result=document.getElementById('pc-result');
 const toDigits=s=>String(s).replace(/[۰-۹٠-٩]/g,ch=>{
  const n=ch.codePointAt(0);return String(n>=0x6f0?n-0x6f0:n-0x660);
 }).trim();
 const getNumber=id=>{
  const s=toDigits(document.getElementById(id).value);
  return /^\d{1,6}$/.test(s)?Number(s):NaN;
 };
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const response=calculateExamPercentage({
   correct:getNumber('pc-correct'),incorrect:getNumber('pc-incorrect'),
   unanswered:getNumber('pc-unanswered'),correctWeight:getNumber('pc-positive'),
   wrongPenalty:getNumber('pc-negative'),blankPenalty:getNumber('pc-blank'),
  });
  result.replaceChildren();
  const title=document.createElement('strong');
  const details=document.createElement('p');
  if(response.status!=='CALCULATED'){
   title.textContent='اطلاعات قابل محاسبه نیست.';
   details.textContent='تعداد سؤال‌ها باید صحیح و نامنفی باشد؛ مجموع سؤال‌ها بین ۱ تا ۱۰۰٬۰۰۰، امتیاز صحیح بین ۱ تا ۱۰۰ و جریمه‌ها بین صفر تا ۱۰۰ باشند.';
  }else{
   const localized=new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2,minimumFractionDigits:0});
   title.textContent='درصد خام محاسبه‌شده: '+localized.format(response.rawPercentage)+'٪';
   details.textContent='امتیاز خالص: '+localized.format(response.earnedPoints)+
    ' از '+localized.format(response.maximumPoints)+' امتیاز ممکن. این عدد صرفاً از قاعده واردشده به دست آمده و تراز، رتبه یا احتمال قبولی نیست.';
  }
  result.append(title,details);
 });
 form.addEventListener('reset',()=>result.replaceChildren());
}
