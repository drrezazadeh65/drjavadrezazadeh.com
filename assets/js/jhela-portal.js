/* Accessible progressive-enhancement tabs for the public JHELA journal dashboard.
 * All substantive panel content remains in server-rendered HTML. No auth, tracking,
 * private storage, network transmission or fabricated manuscript state. */
(()=>{'use strict';
const tabs=Array.from(document.querySelectorAll('[data-jhela-role]'));
const panels=Array.from(document.querySelectorAll('[data-jhela-panel]'));
if(tabs.length!==4||panels.length!==4)return;
const select=(target,focus)=>{
  for(const tab of tabs){const active=tab.dataset.jhelaRole===target;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
  for(const panel of panels) panel.hidden=panel.dataset.jhelaPanel!==target;
};
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(tab.dataset.jhelaRole,false));
  tab.addEventListener('keydown',event=>{
    const key=event.key;
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(key))return;
    event.preventDefault();
    const next=key==='Home'?0:key==='End'?tabs.length-1:(index+(key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    select(tabs[next].dataset.jhelaRole,true);
  });
});
select('reviewers',false);
})();