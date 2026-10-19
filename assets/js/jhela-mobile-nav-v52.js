/* Native JHELA bilingual mobile navigation, progressive enhancement.
 * Operates only on public journal header; mother-site mobile menu untouched.
 */
(()=>{
'use strict';
const page=document.querySelector('body.journal-page');
const header=page?.querySelector('.journal-header');
const nav=header?.querySelector('nav');
if(!page||!header||!nav||header.querySelector('[data-jhela-menu-toggle]'))return;
const fa=document.documentElement.lang==='fa';
const path=fa?'/journal/fa/search/':'/journal/search/';
if(![...nav.querySelectorAll('a[href]')].some(a=>new URL(a.href,location.href).pathname===path)){
 const link=document.createElement('a');link.href=path;
 link.textContent=fa?'جست‌وجوی مجله':'Journal search';
 nav.append(link);
}
const id=nav.id||'jhela-main-navigation';
nav.id=id;
const toggle=document.createElement('button');
toggle.type='button';toggle.className='jhela-mobile-nav-toggle';
toggle.dataset.jhelaMenuToggle='1';
toggle.setAttribute('aria-controls',id);
toggle.setAttribute('aria-expanded','false');
toggle.setAttribute('aria-label',fa?'گشودن منوی مجله':'Open journal menu');
toggle.textContent=fa?'☰ منوی مجله':'☰ Journal menu';
header.insertBefore(toggle,nav);
const css=document.createElement('link');
css.rel='stylesheet';css.href='/assets/css/jhela-mobile-nav-v52.css?v=20261019-v1';
document.head.append(css);
page.classList.add('jhela-nav-enhanced');
const mq=window.matchMedia('(max-width:850px)');
const close=(focus=false)=>{
 page.classList.remove('jhela-nav-open');
 toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-label',fa?'گشودن منوی مجله':'Open journal menu');
 toggle.textContent=fa?'☰ منوی مجله':'☰ Journal menu';
 if(focus)toggle.focus();
};
toggle.addEventListener('click',()=>{
 if(page.classList.contains('jhela-nav-open')){close(true);return;}
 page.classList.add('jhela-nav-open');
 toggle.setAttribute('aria-expanded','true');
 toggle.setAttribute('aria-label',fa?'بستن منوی مجله':'Close journal menu');
 toggle.textContent=fa?'✕ بستن منو':'✕ Close menu';
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&mq.matches&&page.classList.contains('jhela-nav-open'))close(true);
});
nav.addEventListener('click',e=>{if(e.target.closest('a')&&mq.matches)close();});
mq.addEventListener?.('change',()=>{if(!mq.matches)close();});
})();
