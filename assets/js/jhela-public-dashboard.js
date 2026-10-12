/**
 * JHELA public scholarship dashboard.
 * UI-only progressive enhancement: no cookies, accounts, storage,
 * network submission, private manuscripts or unverified appointments.
 */
(()=>{
  'use strict';
  const section=document.querySelector('.jhela-hub');
  const grid=section?.querySelector('.jhela-hub-grid');
  const panels=grid?Array.from(grid.children).filter(node=>node.tagName==='ARTICLE'):[];
  if(!section||!grid||panels.length!==4)return;
  const roles=[
    {key:'reviewers',label:'Peer reviewers'},
    {key:'collaborators',label:'Editorial collaborators'},
    {key:'authors',label:'Prospective authors'},
    {key:'readers',label:'Readers & institutions'}
  ];
  const tabs=document.createElement('div');
  tabs.className='jhela-role-tabs';
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label','Choose a journal participation pathway');
  const buttons=roles.map((role,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.id='jhela-tab-'+role.key;
    button.dataset.role=role.key;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls','jhela-panel-'+role.key);
    button.textContent=role.label;
    const panel=panels[index];
    panel.id='jhela-panel-'+role.key;
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',button.id);
    panel.setAttribute('tabindex','0');
    tabs.appendChild(button);
    return button;
  });
  const activate=(index,moveFocus=false)=>{
    for(let i=0;i<roles.length;i++){
      const active=i===index;
      buttons[i].setAttribute('aria-selected',String(active));
      buttons[i].tabIndex=active?0:-1;
      panels[i].hidden=!active;
    }
    if(moveFocus)buttons[index].focus();
  };
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>activate(index));
    button.addEventListener('keydown',event=>{
      const keys=['ArrowLeft','ArrowRight','Home','End'];
      if(!keys.includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
        (index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      activate(next,true);
    });
  });
  grid.parentNode.insertBefore(tabs,grid);
  section.classList.add('jhela-tabs-ready');
  const fromHash=roles.findIndex(role=>location.hash==='#jhela-'+role.key);
  activate(fromHash>=0?fromHash:0);
})();
