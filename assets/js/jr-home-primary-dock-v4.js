/* Public informational mobile native-feel AI entry. Reuses the existing public assistant;
 * never claims a live LLM backend, stores or transmits personal information,
 * injects a second dialog, or alters any public URL/canonical identity.
 */
(() => {
  'use strict';
  const dock=document.querySelector('.app-dock[data-jr-home-primary-dock],.app-dock[data-jr-need-primary-dock]');
  const entry=dock?.querySelector('[data-jr-open-assistant]');
  if(!entry)return;
  const home=entry.getAttribute('data-jr-assistant-fallback');
  // Accept only the previously published same-origin local need-search route,
  // including its GitHub Pages preview prefix. Never trust arbitrary hrefs.
  const match=/^(?:\/drjavadrezazadeh\.com)?\/(?:fa\/masir-man|en\/my-path)\/#need$/;
  const locale=document.documentElement.lang==='fa'?'fa/masir-man':'en/my-path';
  const base=location.pathname.startsWith('/drjavadrezazadeh.com/')?
    '/drjavadrezazadeh.com':'';
  const fallback=typeof home==='string'&&match.test(home)
    ?home:base+'/'+locale+'/#need';
  entry.href=fallback;

  function sync(){
    const assistant=document.querySelector('.jr-assistant-panel');
    const launcher=document.querySelector('.jr-assistant-launcher');
    if(assistant){
      entry.setAttribute('aria-controls',assistant.id);
      entry.setAttribute('aria-expanded',String(!assistant.hidden));
    }else{
      entry.removeAttribute('aria-controls');
      entry.removeAttribute('aria-expanded');
    }
    // The redundant floating launcher is visually hidden on the homepage
    // mobile shell. Restore focus to the visible dock proxy on close/Escape.
    if(assistant?.hidden&&window.matchMedia('(max-width:900px)').matches&&
      (document.activeElement===launcher||
       assistant.contains(document.activeElement))){
      entry.focus({preventScroll:true});
    }
  }
  entry.addEventListener('click',event=>{
    // A normal link works if this enhancement fails or JS is disabled.
    // Only intercept when the existing site-wide assistant is genuinely here.
    const launcher=document.querySelector('.jr-assistant-launcher');
    const panel=document.querySelector('.jr-assistant-panel');
    if(!launcher||!panel){
      // href already targets the original search guidance; leave it native.
      return;
    }
    event.preventDefault();
    launcher.click();
    sync();
  });
  let panelObserver=null,loaderObserver=null;
  const closeFocus=()=>window.matchMedia('(max-width:900px)').matches&&
    document.contains(entry);
  const observeAssistant=()=>{
    const panel=document.querySelector('.jr-assistant-panel');
    if(!panel)return false;
    // Return focus to the VISIBLE dock proxy, not the launcher hidden by the
    // responsive shell. Preserve both close-button and Escape semantics.
    panel.addEventListener('click',event=>{
      if(event.target.closest('.jr-assistant-close')&&closeFocus())
        requestAnimationFrame(()=>entry.focus({preventScroll:true}));
    },true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!panel.hidden&&closeFocus())
        requestAnimationFrame(()=>entry.focus({preventScroll:true}));
    },true);
    panelObserver=new MutationObserver(sync);
    panelObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
    sync();
    return true;
  };
  if(!observeAssistant()){
    // The public concierge is intentionally deferred until after paint.
    // It can arrive *after* window.load, so disconnecting here on load
    // silently prevents Escape/close aria-expanded synchronization.
    // Observe ONLY direct body additions, and disconnect as soon as the
    // concierge arrives or at pagehide. This does not poll or inspect content.
    loaderObserver=new MutationObserver(()=>{
      if(observeAssistant()){
        loaderObserver?.disconnect();loaderObserver=null;
      }
    });
    loaderObserver.observe(document.body,{childList:true,subtree:false});
  }
  window.addEventListener('pagehide',()=>{
    panelObserver?.disconnect();loaderObserver?.disconnect();
    entry.removeAttribute('aria-controls');
    entry.removeAttribute('aria-expanded');
  },{once:true});
})();
