(()=>{'use strict';
const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const lang=document.documentElement.lang==='en'?'en':'fa';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const copy={
 fa:{guest:'پیش‌نمایش امن',signed:'حساب تأییدشده',authOff:'احراز هویت زنده هنوز فعال نشده است',empty:'پس از ورود، اطلاعات واقعی حساب و دسترسی‌های شما در همین داشبورد نمایش داده می‌شود.'},
 en:{guest:'Secure preview',signed:'Verified account',authOff:'Live authentication is not active yet',empty:'After sign-in, your real account data and entitlements will appear in this dashboard.'}
}[lang];
function initial(email){return String(email||'JR').trim().charAt(0).toUpperCase()||'JR'}
async function hydrate(){
 const status=$('[data-account-status]'),email=$('[data-account-email]'),avatar=$('[data-account-avatar]'),dot=$('[data-live-dot]');
 try{
  const h=await fetch(API+'/auth/health',{cache:'no-store',credentials:'include'});
  const hd=await h.json();
  if(!h.ok||hd?.ready!==true)throw new Error('not_ready');
  dot?.classList.add('ready');
  status.textContent=copy.guest;
  const r=await fetch(API+'/auth/me',{cache:'no-store',credentials:'include'});
  if(r.status===401){email.textContent=copy.empty;return}
  const d=await r.json();
  if(!r.ok||d?.ok!==true)throw new Error('me_failed');
  status.textContent=copy.signed;
  email.textContent=d.user.email;
  avatar.textContent=initial(d.user.email);
  document.documentElement.dataset.customerAuthenticated='true';
  $$('[data-auth-only]').forEach(el=>el.removeAttribute('aria-disabled'));
 }catch{
  status.textContent=copy.authOff;
  email.textContent=copy.empty;
 }
}
function nav(){
 const links=$$('.cd-nav a[data-section],.cd-mobile-dock a[data-section]');
 const sections=links.map(a=>document.getElementById(a.dataset.section)).filter(Boolean);
 const select=id=>links.forEach(a=>a.classList.toggle('is-active',a.dataset.section===id));
 if('IntersectionObserver'in window){
  const o=new IntersectionObserver(entries=>{
   const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
   if(visible)select(visible.target.id);
  },{rootMargin:'-20% 0px -65%',threshold:[.1,.3,.6]});
  sections.forEach(s=>o.observe(s));
 }
 links.forEach(a=>a.addEventListener('click',()=>select(a.dataset.section)));
}
function sheet(){
 const sheet=$('[data-dashboard-sheet]'),open=$('[data-dashboard-more]'),close=$('[data-dashboard-close]');
 if(!sheet||!open||!close)return;
 const shut=()=>{sheet.classList.remove('is-open');open.setAttribute('aria-expanded','false');document.documentElement.style.overflow=''};
 const show=()=>{sheet.classList.add('is-open');open.setAttribute('aria-expanded','true');document.documentElement.style.overflow='hidden';close.focus()};
 open.addEventListener('click',show);close.addEventListener('click',shut);
 sheet.addEventListener('click',e=>{if(e.target===sheet)shut()});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('is-open'))shut()});
}
function logout(){
 $$('[data-dashboard-logout]').forEach(b=>b.addEventListener('click',async()=>{
  try{await fetch(API+'/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'})}catch{}
  location.assign(lang==='en'?'/en/login/':'/fa/login/');
 }));
}
document.addEventListener('DOMContentLoaded',()=>{hydrate();nav();sheet();logout()});
})();