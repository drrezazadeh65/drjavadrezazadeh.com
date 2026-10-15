/* Public JHELA author preparation checklist. Ephemeral only: no personal data, network or persistence. */
(()=>{'use strict';
 for(const root of document.querySelectorAll('[data-jhela-readiness]')){
  const checks=[...root.querySelectorAll('input[type="checkbox"]')];
  const meter=root.querySelector('progress');
  const count=root.querySelector('[data-jhela-readiness-count]');
  const reset=root.querySelector('[data-jhela-readiness-reset]');
  if(!meter||!count||!reset||!checks.length)return;
  const fa=root.getAttribute('lang')==='fa';
  const update=()=>{
   const complete=checks.filter(x=>x.checked).length;
   meter.max=checks.length;
   meter.value=complete;
   count.textContent=fa?'آماده‌سازی: '+complete+' از '+checks.length+' مورد':'Preparation: '+complete+' of '+checks.length+' items';
  };
  for(const checkbox of checks)checkbox.addEventListener('change',update);
  reset.addEventListener('click',()=>{
   for(const checkbox of checks)checkbox.checked=false;
   update();
   checks[0].focus();
  });
  update();
 }
})();