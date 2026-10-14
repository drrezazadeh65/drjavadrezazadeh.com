/* Deferred, non-critical site enhancements extracted from site.js to retain the 25 KiB navigation performance budget. */
(()=>{let s=document.createElement('script');s.src='/assets/js/analytics-adapter.js?v=430';document.head.append(s)})();
(function(){
if(document.querySelector('script[data-jr-assistant]')) return;
const scripts=[...document.scripts];
const siteScript=scripts.find(s=>/\/assets\/js\/site\.js(?:\?|$)/.test(s.src));
if(!siteScript?.src) return;
const cssHref=new URL('../css/assistant.css?v=56',siteScript.src).href;
if(!document.querySelector('link[data-jr-assistant-style]')){
const link=document.createElement('link');
link.rel='stylesheet';
link.href=cssHref;
link.dataset.jrAssistantStyle='1';
document.head.appendChild(link);
}
const script=document.createElement('script');
script.src=new URL('assistant.js?v=1',siteScript.src).href;
script.defer=true;
script.dataset.jrAssistant='1';
document.head.appendChild(script);
})();
document.addEventListener('click',async e=>{const t=e.target.closest('[data-print-cv],[data-copy-citation]');if(!t)return;if(t.hasAttribute('data-print-cv')){e.preventDefault();return print()}const v=t.dataset.copyCitation;if(!v)return;e.preventDefault();const o=t.textContent,n=document.documentElement.lang==='fa'?'کپی شد':'Copied';try{await navigator.clipboard.writeText(v)}catch(_){const a=document.createElement('textarea');a.value=v;a.hidden=true;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(_e){}a.remove()}t.classList.add('is-copied');t.textContent=n;setTimeout(()=>{t.classList.remove('is-copied');t.textContent=o},1800)});
(()=>{let h=document.head,a=(r,u)=>{if(!h.querySelector('link[rel="'+r+'"]')){let l=document.createElement('link');l.rel=r;l.href=u;h.append(l)}};a('icon','/favicon.png?v=42');a('apple-touch-icon','/assets/images/pwa-icon-192.png?v=42')})();

(function(){
if(document.querySelector('.enamad-visible-seal, a[href="https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1"]')) return;
const footer=document.querySelector('footer');
if(!footer) return;
const holder=document.createElement('div');
holder.innerHTML="<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1'><img src='/assets/images/enamad-trust-symbol.svg' alt='نماد اعتماد الکترونیکی' style='cursor:pointer;max-width:110px;height:auto' code='sealMJydDpzqNid1Ty82Y90Ef6SZLah1'></a>";
footer.appendChild(holder);
})();

import('/assets/js/mobile-app-v431.js?v=431d');
