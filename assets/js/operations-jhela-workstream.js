/* JHELA admin workstream navigator — interface only, not retired vendor system authorisation. */
(()=>{'use strict';
 const scope=document.getElementById('ops-workspace');
 const root=document.getElementById('ops-jhela-workstream');
 if(!scope||!root||!scope.contains(root))return;
 const rtl=document.documentElement.dir==='rtl';
 const tabs=[...root.querySelectorAll('[data-jhela-admin-tab]')];
 const panels=[...root.querySelectorAll('[data-jhela-admin-panel]')];
 if(!tabs.length||tabs.length!==panels.length)return;
 const activate=(next,focus)=>{
   const id=next.getAttribute('data-jhela-admin-tab');
   if(!id)return;
   tabs.forEach(t=>{
     const on=t===next;
     t.setAttribute('aria-selected',on?'true':'false');
     t.tabIndex=on?0:-1;
   });
   panels.forEach(p=>{p.hidden=p.getAttribute('data-jhela-admin-panel')!==id;});
   if(focus)next.focus();
 };
 for(let i=0;i<tabs.length;i++){
   tabs[i].addEventListener('click',()=>activate(tabs[i],false));
   tabs[i].addEventListener('keydown',e=>{
     let n=i;
     if(e.key==='ArrowRight')n=rtl?(i+tabs.length-1)%tabs.length:(i+1)%tabs.length;
     else if(e.key==='ArrowLeft')n=rtl?(i+1)%tabs.length:(i+tabs.length-1)%tabs.length;
     else if(e.key==='Home')n=0;
     else if(e.key==='End')n=tabs.length-1;
     else return;
     e.preventDefault();
     activate(tabs[n],true);
   });
 }
 activate(tabs.find(t=>t.getAttribute('aria-selected')==='true')||tabs[0],false);
})();