/* Homepage native-feel AI entry. Reuses the existing public assistant;
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
  const observeAssistant=()=>{
    const panel=document.querySelector('.jr-assistant-panel');
    if(!panel)return false;
    new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden']});
    sync();
    return true;
  };
  if(!observeAssistant()){
    // The public concierge arrives from the site's existing deferred loader.
    // A bounded observer does not poll, network, or keep itself alive forever.
    const observer=new MutationObserver(()=>{
      if(observeAssistant())observer.disconnect();
    });
    observer.observe(document.body,{childList:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  window.addEventListener('pagehide',()=>entry.setAttribute('aria-expanded','false'),{once:true});
})();
