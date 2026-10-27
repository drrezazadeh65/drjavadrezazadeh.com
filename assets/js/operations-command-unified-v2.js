/* JR Operations Unified Workbench v2.
 * Authenticated DOM presentation only; existing owner actions, MFA, CSRF,
 * source-of-truth endpoints, reporting and permissions are not replaced.
 * The original command deck keeps its controls, handlers, and panel roots. */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 if(!workspace)return;
 const fa=document.documentElement.lang==='fa';
 const tr=(faText,enText)=>fa?faText:enText;
 const el=(tag,klass,value)=>{
  const n=document.createElement(tag);
  if(klass)n.className=klass;
  if(value!==undefined)n.textContent=value;
  return n;
 };
 function mount(){
  const deck=document.getElementById('ops-command-deck');
  if(!deck||deck.dataset.opsUnifiedMounted==='true')return false;
  const find=selector=>deck.querySelector(selector);
  const heading=find('.ops-command-heading');
  const timeline=find('.ops-command-network-timeline');
  const nav=find('.ops-command-tabs');
  const subtitle=find('.ops-command-subheading');
  const modules=find('.ops-command-modules');
  const overview=find('.ops-command-overview');
  const engineMatrix=find('.ops-command-engine-matrix');
  const plan=find('.ops-command-plan-board');
  if([heading,timeline,nav,subtitle,modules,overview,engineMatrix,plan].some(x=>!x))return false;
  deck.dataset.opsUnifiedMounted='true';
  const sidebar=el('aside');sidebar.id='ops-command-sidebar';
  sidebar.setAttribute('role','navigation');
  sidebar.setAttribute('aria-label',tr('منو و ابزارهای مدیریت یکپارچه','Unified administration navigation'));
  const stage=el('div');stage.id='ops-command-stage';
  stage.setAttribute('aria-label',tr('پنل عملیات انتخاب‌شده','Selected operations workspace'));
  stage.append(overview,engineMatrix,plan);
  const mobileBar=el('div');mobileBar.id='ops-command-mobile-bar';
  mobileBar.className='ops-command-mobile-bar';
  const toggle=el('button','ops-command-menu-toggle');
  toggle.type='button';toggle.id='ops-command-menu-toggle';
  toggle.setAttribute('aria-controls',sidebar.id);
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label',tr('باز کردن منوی مدیریت','Open administration menu'));
  toggle.append(el('span',null,'☰'),el('span',null,tr('منو','Menu')));
  const current=el('strong','ops-command-mobile-current',tr('نمای مدیریتی','Overview'));
  current.setAttribute('aria-live','polite');
  const refresh=el('button','ops-command-mobile-refresh','↻');
  refresh.type='button';refresh.setAttribute('aria-label',tr('تازه‌سازی گزارش مدیریتی','Refresh administration report'));
  refresh.addEventListener('click',()=>{
   if(!workspace.hidden)deck.querySelector('.ops-command-refresh')?.click();
  });
  mobileBar.append(toggle,current,refresh);
  const backdrop=el('button');backdrop.id='ops-command-backdrop';
  backdrop.type='button';backdrop.setAttribute('aria-label',tr('بستن منوی مدیریت','Close administration menu'));
  const finder=el('div','ops-unified-finder');
  const label=el('label',null,tr('جست‌وجوی همه بخش‌ها و ابزارها','Find any administration tool'));
  label.htmlFor='ops-unified-find';
  const input=el('input');input.id='ops-unified-find';input.type='search';
  input.maxLength=100;input.autocomplete='off';input.spellcheck=false;
  input.setAttribute('aria-controls','ops-unified-results');
  input.placeholder=tr('نام موتور، ابزار یا فعالیت…','Engine, tool or operation…');
  const tally=el('small','ops-unified-count');
  const results=el('div','ops-unified-finder-results');results.id='ops-unified-results';
  results.hidden=true;
  results.setAttribute('role','group');
  results.setAttribute('aria-label',tr('نتایج جست‌وجوی بخش‌ها','Workspace search results'));
  const hint=el('small','ops-unified-hint',tr(
   'روی رایانه، کلید / یا Ctrl+K جست‌وجو را باز می‌کند.',
   'Press / or Ctrl+K to find any tool.'));
  finder.append(label,input,tally,results,hint);
  sidebar.append(heading,timeline,finder,nav,subtitle,modules);
  deck.replaceChildren(sidebar,stage,mobileBar,backdrop);
  const tabs=[...nav.querySelectorAll('[data-ops-zone]')];
  const tabOf=zone=>tabs.find(button=>button.dataset.opsZone===zone);
  const zoneTitle=zone=>tabOf(zone)?.textContent?.trim()||'';
  const mobileWidth=()=>window.matchMedia('(max-width:960px)').matches;
  function updateCurrent(){
   const zone=workspace.dataset.opsActiveZone||'overview';
   current.textContent=zoneTitle(zone)||tr('مدیریت','Administration');
  }
  function close(restoreFocus=false){
   workspace.classList.remove('ops-unified-drawer-open');
   toggle.setAttribute('aria-expanded','false');
   toggle.setAttribute('aria-label',tr('باز کردن منوی مدیریت','Open administration menu'));
   sidebar.setAttribute('role','navigation');sidebar.removeAttribute('aria-modal');
   if(restoreFocus&&mobileWidth())toggle.focus({preventScroll:true});
  }
  function open(){
   if(workspace.hidden||!mobileWidth())return;
   workspace.classList.add('ops-unified-drawer-open');
   toggle.setAttribute('aria-expanded','true');
   toggle.setAttribute('aria-label',tr('بستن منوی مدیریت','Close administration menu'));
   sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');
   (nav.querySelector('[aria-pressed="true"]')||input).focus({preventScroll:true});
  }
  toggle.addEventListener('click',()=>{
   workspace.classList.contains('ops-unified-drawer-open')?close(true):open();
  });
  backdrop.addEventListener('click',()=>close(true));
  nav.addEventListener('click',event=>{
   if(event.target.closest('[data-ops-zone]')){
    updateCurrent();close(true);
    if(input.value){input.value='';renderResults();}
   }
  });
  modules.addEventListener('click',event=>{
   if(event.target.closest('.ops-command-module'))close(true);
  });
  const normalize=v=>String(v||'').normalize('NFKC')
   .toLocaleLowerCase(fa?'fa':'en')
   .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[يى]/g,'ی')
   .replace(/ك/g,'ک').replace(/[\u200c\u200d]/g,' ')
   .replace(/\s+/g,' ').trim();
  function rootName(root){
   const head=root.querySelector(':scope > summary,:scope > h2,:scope > h3');
   return head?.textContent?.trim().slice(0,130)||
    root.getAttribute('aria-label')||
    (root.id==='ops-cards'?tr('موتورهای اکوسیستم','Ecosystem engines'):
     root.id==='ops-detail'?tr('گزارش انتخاب‌شده','Selected engine report'):root.id||'');
  }
  function entries(){
   const list=[];
   for(const root of workspace.children){
    if(root===deck||root.hidden||root.classList.contains('ops-jump'))continue;
    const zone=root.dataset.opsCommandZone;
    if(!tabOf(zone))continue;
    list.push({root,target:root,zone,name:rootName(root)});
    for(const child of root.querySelectorAll('details[id]')){
     const nestedTitle=child.querySelector(':scope > summary')?.textContent?.trim();
     if(nestedTitle&&child.id)list.push({root,target:child,zone,name:nestedTitle.slice(0,130)});
    }
   }
   return list;
  }
  function navigate(item){
   const tab=tabOf(item.zone);
   if(!tab||workspace.hidden)return;
   tab.click(); // use ORIGINAL category selection, MFA-bound handlers
   if(item.zone!=='overview'&&item.zone!=='engines'){
    const roots=[...workspace.children].filter(root=>root!==deck&&
     !root.hidden&&!root.classList.contains('ops-jump')&&
     root.dataset.opsCommandZone===item.zone);
    const index=roots.indexOf(item.root);
    const modulesList=[...modules.querySelectorAll('.ops-command-module')];
    if(index>=0&&modulesList[index])modulesList[index].click();
   }
   if(item.target.tagName==='DETAILS'){
    let node=item.target;
    while(node&&node!==item.root.parentElement){
     if(node.tagName==='DETAILS')node.open=true;
     node=node.parentElement;
    }
   }
   input.value='';renderResults();updateCurrent();close(true);
   item.target.scrollIntoView({block:'start',behavior:'auto'});
   if(!mobileWidth()){
    const heading=item.target.querySelector(':scope > summary,:scope > h2');
    if(heading){if(!heading.hasAttribute('tabindex'))heading.tabIndex=-1;heading.focus({preventScroll:true});}
   }
  }
  function renderResults(){
   const q=normalize(input.value);
   results.replaceChildren();results.hidden=!q;
   nav.hidden=!!q;subtitle.hidden=!!q;
   modules.hidden=!!q;
   if(!q){tally.textContent='';return;}
   const found=entries().filter(x=>
    normalize(x.name+' '+zoneTitle(x.zone)).includes(q)).slice(0,40);
   tally.textContent=tr(new Intl.NumberFormat('fa-IR').format(found.length)+' نتیجه',
    found.length+' results');
   for(const item of found){
    const button=el('button');button.type='button';
    button.append(el('span',null,item.name),el('small',null,zoneTitle(item.zone)));
    button.addEventListener('click',()=>navigate(item));
    results.append(button);
   }
   if(!found.length)results.append(el('p','ops-unified-finder-empty',
    tr('موردی یافت نشد؛ عبارت کوتاه‌تری وارد کنید.','No results; try a shorter search term.')));
  }
  input.addEventListener('input',renderResults);
  document.addEventListener('keydown',event=>{
   if(workspace.hidden||event.defaultPrevented)return;
   if(workspace.classList.contains('ops-unified-drawer-open')){
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    if(event.key!=='Tab')return;
    const focusables=[...sidebar.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')]
     .filter(node=>node.getClientRects().length&&!node.closest('[hidden]'));
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    return;
   }
   if(event.altKey||event.metaKey||event.shiftKey)return;
   if(!((event.ctrlKey&&event.key.toLowerCase()==='k')||
     (!event.ctrlKey&&event.key==='/')))return;
   if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
   event.preventDefault();
   if(mobileWidth())open();
   input.focus({preventScroll:true});input.select();
  });
  window.addEventListener('resize',()=>{if(!mobileWidth())close();});
  workspace.addEventListener('jr:operations-locked',()=>{
   close();input.value='';renderResults();
  });
  workspace.addEventListener('jr:operations-ready',()=>{
   close();input.value='';renderResults();updateCurrent();
  });
  const watcher=new MutationObserver(()=>{if(!workspace.hidden)updateCurrent();});
  watcher.observe(workspace,{attributes:true,attributeFilter:['data-ops-active-zone']});
  updateCurrent();
  return true;
 }
 if(!mount()){
  const watcher=new MutationObserver(()=>{if(mount())watcher.disconnect();});
  watcher.observe(workspace,{childList:true});
 }
})();